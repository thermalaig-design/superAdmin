import { supabase } from '../../config/supabase.js';
import { startOfLocalDay } from '../../utils/dateRange.js';

const MEMBER_COLUMNS = 'members_id, Name, Mobile, Email, "Company Name", trust_id, app_download, created_at';
const MOBILE_LENGTH = 10;
const ID_CHUNK = 50;
const REG_PAGE = 1000; // Supabase returns at most this many rows per request

const unwrap = ({ data, count, error }) => {
    if (error) throw error;
    return { data, count };
};

const clean = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

// Members.trust_id is plain text (no foreign key), so trust names are looked up separately.
async function fetchTrustNames(trustIds) {
    const ids = [...new Set(trustIds.filter(Boolean))];
    if (ids.length === 0) return new Map();

    const { data } = unwrap(await supabase.from('Trust').select('id, name').in('id', ids));
    return new Map(data.map((t) => [t.id, t.name]));
}

// Characters that would change the meaning of a PostgREST filter string are dropped from search text.
const sanitizeSearch = (text) => text.replace(/[%_\\"(),*:]/g, ' ').replace(/\s+/g, ' ').trim();

/** Mobile is a numeric column, so "contains" isn't possible: match exact numbers and number prefixes. */
function mobileFilter(search) {
    if (!/^[\d\s+\-().]+$/.test(search)) return null;

    let digits = search.replace(/\D/g, '');
    if (digits.length > MOBILE_LENGTH && digits.startsWith('91')) digits = digits.slice(2);
    else if (digits.length > MOBILE_LENGTH && digits.startsWith('0')) digits = digits.slice(1);

    if (!digits || digits.length > MOBILE_LENGTH || digits.startsWith('0')) return null;
    if (digits.length === MOBILE_LENGTH) return `Mobile.eq.${digits}`;

    const span = 10 ** (MOBILE_LENGTH - digits.length);
    const low = Number(digits) * span;
    return `and(Mobile.gte.${low},Mobile.lte.${low + span - 1})`;
}

async function buildSearchClause(rawSearch) {
    const search = sanitizeSearch(rawSearch);
    if (!search) return null;

    const clauses = [`Name.ilike.*${search}*`, `Email.ilike.*${search}*`, `"Company Name".ilike.*${search}*`];

    const mobile = mobileFilter(search);
    if (mobile) clauses.push(mobile);

    return clauses.join(',');
}

/**
 * How many trusts each of these members is registered in (reg_members is the member <-> trust junction).
 * Only active registrations count (is_active is true or not set). This is one small query for the members on the
 * page: counting inside the main list query (an embedded count) takes ~8 s over all 24k members and times out.
 */
export async function countActiveTrusts(memberIds) {
    const counts = new Map(memberIds.map((id) => [id, 0]));

    const chunks = [];
    for (let i = 0; i < memberIds.length; i += ID_CHUNK) chunks.push(memberIds.slice(i, i + ID_CHUNK));

    for (let i = 0; i < chunks.length; i += 10) {
        // at most 10 requests at a time, so a trust with thousands of members doesn't flood the database
        await Promise.all(
            chunks.slice(i, i + 10).map(async (ids) => {
                for (let from = 0; ; from += REG_PAGE) {
                    const { data } = unwrap(
                        await supabase
                            .from('reg_members')
                            .select('members_id, is_active')
                            .in('members_id', ids)
                            .order('id')
                            .range(from, from + REG_PAGE - 1)
                    );
                    data.forEach((reg) => {
                        if (reg.is_active !== false) counts.set(reg.members_id, counts.get(reg.members_id) + 1);
                    });
                    if (data.length < REG_PAGE) break;
                }
            })
        );
    }

    return counts;
}

const toMember = (row, trustCounts) => ({
    id: row.members_id,
    name: clean(row.Name),
    mobile: row.Mobile != null ? String(row.Mobile) : null,
    email: clean(row.Email),
    companyName: clean(row['Company Name']),
    trustCount: trustCounts.get(row.members_id) ?? 0,
    appDownloaded: row.app_download === true,
    createdAt: row.created_at,
});

// Columns the table can be sorted by (API name -> database column).
export const SORT_COLUMNS = {
    createdAt: 'created_at',
    name: 'Name',
    mobile: 'Mobile',
    email: 'Email',
    company: 'Company Name',
    appDownloaded: 'app_download',
};

/**
 * One page of members. `range` ({ start, end } as ISO instants, end exclusive) limits them to those who joined
 * in that period; `sortBy` / `sort` order them (members with no value for the column always come last).
 */
// Text columns where "no value" is stored either as null or as an empty string.
const TEXT_SORT_COLUMNS = new Set(['Name', 'Email', 'Company Name']);

export async function listMembers({ page, pageSize, sortBy = 'createdAt', sort, search, trustId, appDownload, range }) {
    const searchClause = search ? await buildSearchClause(search) : null;

    // A fresh query with every filter applied (query builders are used up once awaited).
    const filtered = (select, options) => {
        // "Members of this trust": inner-join the registrations and keep only that trust's row.
        let query = supabase.from('Members').select(trustId ? `${select}, membership:reg_members!inner(trust_id)` : select, options);
        if (searchClause) query = query.or(searchClause);
        if (trustId) query = query.eq('membership.trust_id', trustId);
        if (appDownload === 'yes') query = query.eq('app_download', true);
        if (appDownload === 'no') query = query.not('app_download', 'is', true);
        if (range) query = query.gte('created_at', range.start).lt('created_at', range.end);
        return query;
    };

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const column = SORT_COLUMNS[sortBy];
    const ascending = sort === 'asc';
    const newestFirst = (query) => query.order('created_at', { ascending: false }).order('members_id');
    let rows;
    let total;

    if (TEXT_SORT_COLUMNS.has(column)) {
        // Members with no value (null or '') always come last, whichever way the column is sorted, so the real
        // values are read first and the blanks fill whatever is left of the page.
        const head = { count: 'exact', head: true };
        const [all, withValue] = await Promise.all([
            filtered('members_id', head),
            filtered('members_id', head).neq(column, ''), // also drops nulls
        ]);
        total = unwrap(all).count;
        const valued = unwrap(withValue).count;

        rows = [];
        if (from < valued) {
            const part = filtered(MEMBER_COLUMNS).neq(column, '').order(column, { ascending });
            rows.push(...unwrap(await newestFirst(part).range(from, Math.min(to, valued - 1))).data);
        }
        if (rows.length < pageSize && total > valued) {
            const offset = Math.max(0, from - valued);
            const blanks = filtered(MEMBER_COLUMNS).or(`"${column}".is.null,"${column}".eq.`);
            rows.push(...unwrap(await newestFirst(blanks).range(offset, offset + (pageSize - rows.length) - 1)).data);
        }
    } else {
        const ordered = filtered(MEMBER_COLUMNS, { count: 'exact' }).order(column, { ascending, nullsFirst: false });
        const result = unwrap(await (column === 'created_at' ? ordered : ordered.order('created_at', { ascending: false })).order('members_id').range(from, to));
        rows = result.data;
        total = result.count;
    }

    const trustCounts = await countActiveTrusts(rows.map((row) => row.members_id));

    return {
        total,
        page,
        pageSize,
        members: rows.map((row) => toMember(row, trustCounts)),
    };
}

/**
 * Every trust one member is registered in (reg_members is the member <-> trust junction), with their role,
 * membership number and dates for each. Returns null when there is no such member.
 */
/** When this member last visited a page in each trust (all time), as a Map of trust id -> ISO time. */
async function fetchLastActivity(memberId, trustIds) {
    const latest = new Map();

    for (let i = 0; i < trustIds.length; i += 10) {
        await Promise.all(
            trustIds.slice(i, i + 10).map(async (trustId) => {
                const { data } = unwrap(
                    await supabase
                        .from('page_activity')
                        .select('created_at')
                        .eq('members_id', memberId)
                        .eq('trust_id', trustId)
                        .order('created_at', { ascending: false })
                        .limit(1)
                );
                if (data[0]) latest.set(trustId, data[0].created_at);
            })
        );
    }

    return latest;
}

export async function getMemberTrusts(memberId, { withLastActivity = false } = {}) {
    const { data: member } = unwrap(
        await supabase
            .from('Members')
            .select('members_id, Name, Mobile, Email, "Company Name", trust_id, created_at')
            .eq('members_id', memberId)
            .maybeSingle()
    );
    if (!member) return null;

    const { data: registrations } = unwrap(
        await supabase
            .from('reg_members')
            .select('id, role, "Membership number", joined_date, is_active, created_at, trust:trust_id(id, name, icon_url, keyword)')
            .eq('members_id', memberId)
            .order('created_at', { ascending: true })
    );

    const lastActivity = withLastActivity
        ? await fetchLastActivity(memberId, [...new Set(registrations.map((r) => r.trust?.id).filter(Boolean))])
        : new Map();

    const trusts = registrations.map((row) => ({
        registrationId: row.id,
        trustId: row.trust?.id ?? null,
        name: row.trust?.name ?? 'Unknown trust',
        logoUrl: row.trust?.icon_url ?? null,
        appType: clean(row.trust?.keyword),
        role: clean(row.role),
        membershipNumber: clean(row['Membership number']),
        joinedDate: row.joined_date,
        isActive: row.is_active !== false,
        registeredAt: row.created_at,
        isPrimary: row.trust?.id === member.trust_id,
        lastActivityAt: lastActivity.get(row.trust?.id) ?? null,
    }));

    const active = trusts.filter((t) => t.isActive).length;

    return {
        member: {
            id: member.members_id,
            name: clean(member.Name),
            mobile: member.Mobile != null ? String(member.Mobile) : null,
            email: clean(member.Email),
            companyName: clean(member['Company Name']),
            createdAt: member.created_at,
        },
        summary: { total: trusts.length, active, inactive: trusts.length - active },
        trusts,
    };
}

/** Platform-wide numbers shown above the table (they don't change with the table's filters). */
export async function getMemberSummary() {
    const todayStart = new Date(startOfLocalDay()).toISOString();
    const head = { count: 'exact', head: true };

    const [total, downloaded, today, latest] = await Promise.all([
        supabase.from('Members').select('members_id', head),
        supabase.from('Members').select('members_id', head).eq('app_download', true),
        supabase.from('Members').select('members_id', head).gte('created_at', todayStart),
        supabase
            .from('Members')
            .select('Name, Mobile, trust_id, created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
    ]);

    const latestRow = unwrap(latest).data;
    const trustNames = latestRow ? await fetchTrustNames([latestRow.trust_id]) : new Map();

    return {
        totalMembers: unwrap(total).count,
        appDownloaded: unwrap(downloaded).count,
        joinedToday: unwrap(today).count,
        lastJoined: latestRow
            ? {
                  name: clean(latestRow.Name) ?? (latestRow.Mobile != null ? String(latestRow.Mobile) : null),
                  trustName: trustNames.get(latestRow.trust_id) ?? null,
                  createdAt: latestRow.created_at,
              }
            : null,
    };
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_DAILY_POINTS = 62; // longer periods are counted per week so the graph stays readable
const COUNT_BATCH = 12; // how many count queries run at once

/**
 * How many members joined in each hour (one day), day (up to ~2 months) or week of the period, for the graph.
 * Only buckets that have already started are counted. Returns { period, granularity, counts, total }, where
 * counts[i] belongs to the bucket that starts at period.from + i * (1 hour | 1 day | 7 days).
 */
export async function getMemberGrowth(range, now = Date.now()) {
    const start = Date.parse(range.firstDay);
    const end = Date.parse(range.lastDay) + DAY_MS; // exclusive
    const days = Math.round((end - start) / DAY_MS);

    const granularity = days === 1 ? 'hour' : days <= MAX_DAILY_POINTS ? 'day' : 'week';
    const size = { hour: HOUR_MS, day: DAY_MS, week: 7 * DAY_MS }[granularity];

    const windows = [];
    for (let from = start; from < end && from <= now; from += size) {
        windows.push([from, Math.min(from + size, end)]);
    }

    const counts = [];
    for (let i = 0; i < windows.length; i += COUNT_BATCH) {
        const batch = await Promise.all(
            windows.slice(i, i + COUNT_BATCH).map(async ([from, to]) =>
                unwrap(
                    await supabase
                        .from('Members')
                        .select('members_id', { count: 'exact', head: true })
                        .gte('created_at', new Date(from).toISOString())
                        .lt('created_at', new Date(to).toISOString())
                ).count
            )
        );
        counts.push(...batch);
    }

    return {
        period: { from: range.firstDay, to: range.lastDay },
        granularity,
        counts,
        total: counts.reduce((sum, n) => sum + n, 0),
    };
}

/** Every trust, for the filter dropdown. */
export async function listTrustOptions() {
    const rows = [];

    for (let from = 0; ; from += 1000) {
        const { data } = unwrap(await supabase.from('Trust').select('id, name').order('name').range(from, from + 999));
        rows.push(...data);
        if (data.length < 1000) break;
    }

    return rows;
}

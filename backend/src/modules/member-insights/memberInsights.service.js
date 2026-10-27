import { supabase } from '../../config/supabase.js';
import { startOfLocalDay } from '../../utils/dateRange.js';
import { getMemberLoginStats } from '../trust-insights/memberLogins.service.js';

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

/** A member's apps are the trusts owned by their superuser row(s): Trust.superuser_id -> superuser.id <- members_id. */
async function fetchOwnedTrusts(superuserIds, columns) {
    const trusts = [];
    for (let i = 0; i < superuserIds.length; i += ID_CHUNK) {
        const ids = superuserIds.slice(i, i + ID_CHUNK);
        for (let from = 0; ; from += REG_PAGE) {
            const { data } = unwrap(
                await supabase.from('Trust').select(columns).in('superuser_id', ids).order('id').range(from, from + REG_PAGE - 1)
            );
            trusts.push(...data);
            if (data.length < REG_PAGE) break;
        }
    }
    return trusts;
}

/**
 * Apps each of these members has created = the trusts their superuser owns. Returns a Map of member id ->
 * { count, lastCreatedAt } (members with no apps get { count: 0, lastCreatedAt: null }). Like countActiveTrusts,
 * this runs for the members on the page only.
 */
export async function getAppStats(memberIds) {
    const stats = new Map(memberIds.map((id) => [id, { count: 0, lastCreatedAt: null, names: [] }]));
    if (memberIds.length === 0) return stats;

    const owners = new Map(); // superuser id -> member id
    for (let i = 0; i < memberIds.length; i += ID_CHUNK) {
        const { data } = unwrap(await supabase.from('superuser').select('id, members_id').in('members_id', memberIds.slice(i, i + ID_CHUNK)));
        data.forEach((row) => owners.set(row.id, row.members_id));
    }

    const trusts = await fetchOwnedTrusts([...owners.keys()], 'id, name, superuser_id, created_at');
    trusts.forEach((trust) => {
        const entry = stats.get(owners.get(trust.superuser_id));
        entry.count += 1;
        if (trust.name) entry.names.push(trust.name);
        if (trust.created_at && (!entry.lastCreatedAt || trust.created_at > entry.lastCreatedAt)) entry.lastCreatedAt = trust.created_at;
    });

    return stats;
}

/**
 * How many page actions each of these members has taken (page_activity rows, all trusts, all time) and when the
 * latest one was. One small request per member (the count and the newest row come back together, via the
 * members_id + created_at index), at most 10 at a time. Returns a Map of member id -> { count, lastAt }.
 */
export async function getActionStats(memberIds) {
    const stats = new Map();

    for (let i = 0; i < memberIds.length; i += 10) {
        await Promise.all(
            memberIds.slice(i, i + 10).map(async (memberId) => {
                const { data, count } = unwrap(
                    await supabase
                        .from('page_activity')
                        .select('created_at', { count: 'exact' })
                        .eq('members_id', memberId)
                        .order('created_at', { ascending: false })
                        .limit(1)
                );
                stats.set(memberId, { count: count ?? 0, lastAt: data[0]?.created_at ?? null });
            })
        );
    }

    return stats;
}

/** Number of active members in each trust (reg_members rows), as a Map of trust id -> count. */
async function countTrustMembers(trustIds) {
    const counts = new Map();
    for (let i = 0; i < trustIds.length; i += 10) {
        await Promise.all(
            trustIds.slice(i, i + 10).map(async (trustId) => {
                const { count } = unwrap(
                    await supabase
                        .from('reg_members')
                        .select('id', { count: 'exact', head: true })
                        .eq('trust_id', trustId)
                        .or('is_active.is.null,is_active.eq.true')
                );
                counts.set(trustId, count);
            })
        );
    }
    return counts;
}

/** Page activity of all users in each trust during the period (all time without a range). Map of trust id -> count. */
async function countTrustActivity(trustIds, range) {
    const counts = new Map();
    for (let i = 0; i < trustIds.length; i += 10) {
        await Promise.all(
            trustIds.slice(i, i + 10).map(async (trustId) => {
                let query = supabase.from('page_activity').select('id', { count: 'exact', head: true }).eq('trust_id', trustId);
                if (range) query = query.gte('created_at', range.start).lt('created_at', range.end);
                counts.set(trustId, unwrap(await query).count);
            })
        );
    }
    return counts;
}

/** Every app (trust) created by one member, with its logo, legal name, member count and creation time. Null if no such member. */
export async function getMemberApps(memberId, range = null) {
    const { data: member } = unwrap(
        await supabase.from('Members').select('members_id, Name, Mobile, Email, "Company Name"').eq('members_id', memberId).maybeSingle()
    );
    if (!member) return null;

    const { data: owners } = unwrap(await supabase.from('superuser').select('id').eq('members_id', memberId));
    const trusts = await fetchOwnedTrusts(owners.map((o) => o.id), 'id, name, icon_url, legal_name, keyword, status, created_at');
    const trustIds = trusts.map((t) => t.id);
    // unique logins are all-time (same rule as the Unique Member Logins page and the Organization table)
    const [memberCounts, activityCounts, loginStats] = await Promise.all([
        countTrustMembers(trustIds),
        countTrustActivity(trustIds, range),
        trustIds.length ? getMemberLoginStats(trustIds) : new Map(),
    ]);

    return {
        period: range ? { from: range.firstDay, to: range.lastDay } : null,
        member: {
            id: member.members_id,
            name: clean(member.Name),
            mobile: member.Mobile != null ? String(member.Mobile) : null,
            email: clean(member.Email),
            companyName: clean(member['Company Name']),
        },
        apps: trusts.map((t) => ({
            id: t.id,
            name: t.name,
            logoUrl: t.icon_url ?? null,
            legalName: clean(t.legal_name),
            appType: clean(t.keyword),
            memberCount: memberCounts.get(t.id) ?? 0,
            activityCount: activityCounts.get(t.id) ?? 0,
            uniqueLogins: loginStats.get(t.id)?.uniqueMembers ?? 0,
            isActive: t.status !== false,
            createdAt: t.created_at,
        })),
    };
}

const toMember = (row, trustCounts, appStats, actionStats, managerStats) => ({
    id: row.members_id,
    name: clean(row.Name),
    mobile: row.Mobile != null ? String(row.Mobile) : null,
    email: clean(row.Email),
    companyName: clean(row['Company Name']),
    trustCount: trustCounts.get(row.members_id) ?? 0,
    appCount: appStats.get(row.members_id)?.count ?? 0,
    lastAppCreatedAt: appStats.get(row.members_id)?.lastCreatedAt ?? null,
    managerActivity: managerStats.get(row.members_id)?.count ?? 0,
    actionCount: actionStats.get(row.members_id)?.count ?? 0,
    lastActionAt: actionStats.get(row.members_id)?.lastAt ?? null,
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
    // Not database columns: ordered here from per-member totals (see STATS_SORTS and listMembers).
    appCount: null,
    lastAppCreated: null,
    actionCount: null,
    lastAction: null,
    managerActivity: null,
};

/**
 * One page of members. `range` ({ start, end } as ISO instants, end exclusive) limits them to those who joined
 * in that period; `sortBy` / `sort` order them (members with no value for the column always come last).
 */
// Text columns where "no value" is stored either as null or as an empty string.
const TEXT_SORT_COLUMNS = new Set(['Name', 'Email', 'Company Name']);

/** App stats for every member who owns at least one app (there are only a few hundred), as a Map of member id -> { count, lastCreatedAt }. */
async function getAllAppStats() {
    const { data: owners } = unwrap(await supabase.from('superuser').select('id, members_id').not('members_id', 'is', null));
    const memberOf = new Map(owners.map((o) => [o.id, o.members_id]));
    const stats = new Map();
    if (memberOf.size === 0) return stats;

    const trusts = await fetchOwnedTrusts([...memberOf.keys()], 'id, superuser_id, created_at');
    trusts.forEach((trust) => {
        const memberId = memberOf.get(trust.superuser_id);
        const entry = stats.get(memberId) ?? { count: 0, lastCreatedAt: null };
        entry.count += 1;
        if (trust.created_at && (!entry.lastCreatedAt || trust.created_at > entry.lastCreatedAt)) entry.lastCreatedAt = trust.created_at;
        stats.set(memberId, entry);
    });
    return stats;
}

/**
 * The members who are NOT in `owning` (the ones with nothing to sort by), newest first: `skip` of them are passed over,
 * then `wanted` returned. A "not in (thousands of ids)" filter would make the request URL too long, so the full
 * newest-first list is read at the right position instead, using how many `owning` members come before it.
 */
async function pageOfOthers(newestFirstQuery, owning, skip, wanted) {
    const ownerIds = new Set(owning.map((m) => m.members_id));
    const ownersBefore = (row) => owning.reduce((n, o) => n + (newerFirst(o, row) < 0 ? 1 : 0), 0);
    const rowAt = async (position) => unwrap(await newestFirstQuery().range(position, position)).data[0];

    // find the position of the first wanted member: (position - owners before it) must equal skip, and that row must not be an owner
    let position = skip;
    for (let attempt = 0; attempt < 40; attempt++) {
        const row = await rowAt(position);
        if (!row) return [];
        const passed = position - ownersBefore(row);
        if (passed < skip) position += skip - passed;
        else if (ownerIds.has(row.members_id)) position += 1;
        else break;
    }

    const result = [];
    const span = wanted + owning.length;
    for (let from = position; result.length < wanted && from < position + span; from += REG_PAGE) {
        const { data } = unwrap(await newestFirstQuery().range(from, from + Math.min(REG_PAGE, position + span - from) - 1));
        data.forEach((row) => !ownerIds.has(row.members_id) && result.length < wanted && result.push(row));
        if (data.length < REG_PAGE) break;
    }
    return result;
}

const MAX_ACTION_ROWS = 200000;

/** Page-activity rows per trust (users of that app, all of them) inside the period; no `range` = all time. Map of trust id -> count. */
async function countActivityByTrust(range) {
    const counts = new Map();

    for (let from = 0; from < MAX_ACTION_ROWS; from += REG_PAGE) {
        let query = supabase.from('page_activity').select('trust_id').not('trust_id', 'is', null);
        if (range) query = query.gte('created_at', range.start).lt('created_at', range.end);
        const { data } = unwrap(await query.order('id').range(from, from + REG_PAGE - 1));
        data.forEach((row) => counts.set(row.trust_id, (counts.get(row.trust_id) ?? 0) + 1));
        if (data.length < REG_PAGE) break;
    }

    return counts;
}

/**
 * App manager activity: for each member who owns apps, the page activity of all users in those apps during the period.
 * Map of member id -> { count }, only for members with some activity.
 */
async function getManagerActivity(range) {
    const [activity, ownersResult] = await Promise.all([
        countActivityByTrust(range),
        supabase.from('superuser').select('id, members_id').not('members_id', 'is', null),
    ]);
    const { data: owners } = unwrap(ownersResult);
    const memberOf = new Map(owners.map((o) => [o.id, o.members_id]));
    const trusts = memberOf.size ? await fetchOwnedTrusts([...memberOf.keys()], 'id, superuser_id') : [];

    const stats = new Map();
    trusts.forEach((trust) => {
        const count = activity.get(trust.id) ?? 0;
        if (!count) return;
        const memberId = memberOf.get(trust.superuser_id);
        stats.set(memberId, { count: (stats.get(memberId)?.count ?? 0) + count });
    });
    return stats;
}

/** Page actions of every member who has taken any, as a Map of member id -> { count, lastAt } (one pass over page_activity). */
async function getAllActionStats() {
    const stats = new Map();

    for (let from = 0; from < MAX_ACTION_ROWS; from += REG_PAGE) {
        const { data } = unwrap(
            await supabase
                .from('page_activity')
                .select('members_id, created_at')
                .not('members_id', 'is', null)
                .order('id')
                .range(from, from + REG_PAGE - 1)
        );
        data.forEach((row) => {
            const entry = stats.get(row.members_id) ?? { count: 0, lastAt: null };
            entry.count += 1;
            if (!entry.lastAt || row.created_at > entry.lastAt) entry.lastAt = row.created_at;
            stats.set(row.members_id, entry);
        });
        if (data.length < REG_PAGE) break;
    }

    return stats;
}

// Sorts done from per-member totals: how to load them, and the number each member is ordered by.
const STATS_SORTS = {
    appCount: { load: getAllAppStats, valueOf: (s) => s.count },
    lastAppCreated: { load: getAllAppStats, valueOf: (s) => Date.parse(s.lastCreatedAt) || 0 },
    actionCount: { load: getAllActionStats, valueOf: (s) => s.count },
    lastAction: { load: getAllActionStats, valueOf: (s) => Date.parse(s.lastAt) || 0 },
    managerActivity: { load: getManagerActivity, valueOf: (s) => s.count },
};

const ACTION_SORTS = new Set(['actionCount', 'lastAction']);
const ID_FILTER_CHUNK = 100; // ids per request, so the URL stays short

// "Newer first" order used for members with nothing to sort by.
const newerFirst = (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || a.members_id.localeCompare(b.members_id);

// `withActions` false = the action columns (count, last action) are not on screen, so their per-member lookups are skipped.
export async function listMembers({ page, pageSize, sortBy = 'createdAt', sort, search, trustId, appDownload, range, withActions = true }) {
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

    let allStats = null;

    if (column === null) {
        // Sorted by a per-member total (apps, actions): members who have any are ordered here, everyone else
        // (nothing to sort by) always comes last, newest first.
        const { load, valueOf } = STATS_SORTS[sortBy];
        allStats = await load(range);
        const owners = [...allStats.keys()];

        const head = { count: 'exact', head: true };
        total = unwrap(await filtered('members_id', head)).count;

        const chunks = [];
        for (let i = 0; i < owners.length; i += ID_FILTER_CHUNK) chunks.push(owners.slice(i, i + ID_FILTER_CHUNK));
        const owning = (await Promise.all(chunks.map(async (ids) => unwrap(await filtered(MEMBER_COLUMNS).in('members_id', ids)).data))).flat();
        owning.sort((a, b) => (ascending ? 1 : -1) * (valueOf(allStats.get(a.members_id)) - valueOf(allStats.get(b.members_id))) || newerFirst(a, b));

        rows = owning.slice(from, to + 1);
        if (rows.length < pageSize && total > owning.length) {
            const wanted = pageSize - rows.length;
            rows.push(...(await pageOfOthers(() => newestFirst(filtered(MEMBER_COLUMNS)), owning, Math.max(0, from - owning.length), wanted)));
        }
    } else if (TEXT_SORT_COLUMNS.has(column)) {
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

    const ids = rows.map((row) => row.members_id);
    const sortedBy = (...keys) => (keys.includes(sortBy) ? allStats : null);
    const [trustCounts, pageAppStats, actionStats, managerStats] = await Promise.all([
        countActiveTrusts(ids),
        sortedBy('appCount', 'lastAppCreated') ?? getAppStats(ids),
        sortedBy('actionCount', 'lastAction') ?? (withActions ? getActionStats(ids) : new Map()),
        sortedBy('managerActivity') ?? getManagerActivity(range),
    ]);

    return {
        total,
        page,
        pageSize,
        members: rows.map((row) => toMember(row, trustCounts, pageAppStats, actionStats, managerStats)),
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

/**
 * App numbers for a period (start inclusive, end exclusive, as epoch ms):
 * - appCreators: different members who own an app created in the period (Trust.created_at -> superuser.members_id)
 * - appsWithLogins: different apps that had at least one member login in the period (member_session, action_type login)
 * - appCreatorsJoined: those creators who also joined in the period (the numerator of the creators percentage)
 * - loggedInMembers: different members who logged in to any app in the period
 * - totalActivity: page_activity rows in the period that have a user_reg_id (user activity)
 * - appsWithActivity: different apps those rows belong to
 * - avgActivityPerApp: totalActivity / appsWithActivity (null when there was no user activity)
 * - totalAppActivity / appsWithAppActivity / avgAppActivityPerApp: the same for member activity (members_id), with its
 *   own apps: an app counts only if members were active in it
 */
async function getAppPeriodStats(start, end) {
    const from = new Date(start).toISOString();
    const to = new Date(end).toISOString();

    const createdOwners = new Set();
    for (let page = 0; ; page += REG_PAGE) {
        const { data } = unwrap(
            await supabase.from('Trust').select('superuser_id').not('superuser_id', 'is', null).gte('created_at', from).lt('created_at', to).order('id').range(page, page + REG_PAGE - 1)
        );
        data.forEach((row) => createdOwners.add(row.superuser_id));
        if (data.length < REG_PAGE) break;
    }

    const creators = new Set();
    const ownerIds = [...createdOwners];
    for (let i = 0; i < ownerIds.length; i += ID_CHUNK) {
        const { data } = unwrap(await supabase.from('superuser').select('members_id').in('id', ownerIds.slice(i, i + ID_CHUNK)));
        data.forEach((row) => row.members_id && creators.add(row.members_id));
    }

    // Of those creators, how many joined (became members) in the period too.
    let appCreatorsJoined = 0;
    const creatorIds = [...creators];
    for (let i = 0; i < creatorIds.length; i += ID_CHUNK) {
        const { data } = unwrap(
            await supabase.from('Members').select('members_id').in('members_id', creatorIds.slice(i, i + ID_CHUNK)).gte('created_at', from).lt('created_at', to)
        );
        appCreatorsJoined += data.length;
    }

    const loggedInApps = new Set();
    const loggedInMembers = new Set();
    for (let page = 0; page < MAX_ACTION_ROWS; page += REG_PAGE) {
        const { data } = unwrap(
            await supabase
                .from('member_session')
                .select('trust_id, members_id')
                .eq('action_type', 'login')
                .not('trust_id', 'is', null)
                .gte('action_at', from)
                .lt('action_at', to)
                .order('id')
                .range(page, page + REG_PAGE - 1)
        );
        data.forEach((row) => {
            loggedInApps.add(row.trust_id);
            if (row.members_id) loggedInMembers.add(row.members_id);
        });
        if (data.length < REG_PAGE) break;
    }

    // User and member activity per app, counted by the database in one request per 1000 apps (embedded counts, no activity rows
    // downloaded). Each embed has its own name so its filters apply to it alone.
    let totalActivity = 0;
    let appsWithActivity = 0;
    let totalAppActivity = 0;
    let appsWithAppActivity = 0;
    for (let page = 0; ; page += REG_PAGE) {
        const { data } = unwrap(
            await supabase
                .from('Trust')
                .select('id, user_activity:page_activity(count), member_activity:page_activity(count)')
                .not('user_activity.user_reg_id', 'is', null)
                .gte('user_activity.created_at', from)
                .lt('user_activity.created_at', to)
                .not('member_activity.members_id', 'is', null)
                .gte('member_activity.created_at', from)
                .lt('member_activity.created_at', to)
                .order('id')
                .range(page, page + REG_PAGE - 1)
        );
        data.forEach((row) => {
            const users = row.user_activity?.[0]?.count ?? 0;
            totalActivity += users;
            if (users > 0) appsWithActivity += 1;

            const members = row.member_activity?.[0]?.count ?? 0;
            totalAppActivity += members;
            if (members > 0) appsWithAppActivity += 1;
        });
        if (data.length < REG_PAGE) break;
    }

    return {
        appCreators: creators.size,
        appCreatorsJoined,
        appsWithLogins: loggedInApps.size,
        loggedInMembers: loggedInMembers.size,
        totalActivity,
        appsWithActivity,
        avgActivityPerApp: appsWithActivity ? Math.round((totalActivity / appsWithActivity) * 10) / 10 : null,
        totalAppActivity,
        appsWithAppActivity,
        avgAppActivityPerApp: appsWithAppActivity ? Math.round((totalAppActivity / appsWithAppActivity) * 10) / 10 : null,
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

    const appPeriod = await getAppPeriodStats(start, end);

    // Apps (Trust rows) created in the whole selected period, and how many exist in all.
    const trustHead = { count: 'exact', head: true };
    const [created, all] = await Promise.all([
        supabase.from('Trust').select('id', trustHead).gte('created_at', new Date(start).toISOString()).lt('created_at', new Date(end).toISOString()),
        supabase.from('Trust').select('id', trustHead),
    ]);

    return {
        period: { from: range.firstDay, to: range.lastDay },
        granularity,
        counts,
        total: counts.reduce((sum, n) => sum + n, 0),
        appsCreated: unwrap(created).count,
        totalApps: unwrap(all).count,
        ...appPeriod,
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

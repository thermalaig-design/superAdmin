import { supabase } from '../../config/supabase.js';
import { listDayKeys, localDayKey, localHour } from '../../utils/dateRange.js';

const PAGE_SIZE = 1000;
const MAX_ROWS = 50000;
const TOP_ROUTES = 7;
const RECENT_LIMIT = 100;

const ACTIVITY_SELECT =
    'id, created_at, page_id, user_reg_id, members_id, ' +
    'page:page_routes(name, route, module), ' +
    'user:users_reg(name), ' +
    'member:Members!page_activity_member_fk(Name)';

// Supabase caps each response (default 1000 rows), so page through the period.
async function fetchPeriodActivity(trustId, start, end) {
    const rows = [];

    for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
        const { data, error } = await supabase
            .from('page_activity')
            .select(ACTIVITY_SELECT)
            .eq('trust_id', trustId)
            .gte('created_at', start)
            .lt('created_at', end)
            .order('created_at', { ascending: false })
            .order('id')
            .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        rows.push(...data);
        if (data.length < PAGE_SIZE) break;
    }

    return rows;
}

const userKey = (row) => row.user_reg_id ?? row.members_id ?? null;
const userName = (row) => row.user?.name ?? row.member?.Name ?? 'Unknown user';

function parseTarget(target) {
    if (typeof target !== 'string') return {};
    if (target.startsWith('module:')) return { module: target.slice(7) };
    if (target.startsWith('page:')) return { pageId: target.slice(5) };
    return {};
}

function buildFilterOptions(rows) {
    const users = new Map();
    const modules = new Set();
    const pages = new Map();

    rows.forEach((row) => {
        const key = userKey(row);
        if (key) users.set(key, userName(row));
        if (row.page) {
            modules.add(row.page.module);
            pages.set(row.page_id, { id: row.page_id, name: row.page.name, module: row.page.module });
        }
    });

    const byName = (a, b) => a.name.localeCompare(b.name);
    return {
        users: [...users].map(([id, name]) => ({ id, name })).sort(byName),
        modules: [...modules].sort(),
        pages: [...pages.values()].sort(byName),
    };
}

function countBy(rows, keyOf) {
    const counts = new Map();
    rows.forEach((row) => {
        const key = keyOf(row);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
}

function buildReport(rows, { firstDay, lastDay }) {
    const total = rows.length;
    const perDay = countBy(rows, (r) => localDayKey(r.created_at));
    const activeDays = perDay.size;

    const routeCounts = new Map();
    rows.forEach((row) => {
        const route = row.page?.route ?? 'unknown';
        const entry = routeCounts.get(route) ?? { route, name: row.page?.name ?? route, count: 0 };
        entry.count += 1;
        routeCounts.set(route, entry);
    });

    const moduleCounts = countBy(rows, (r) => r.page?.module ?? 'Other');
    const hourCounts = Array(24).fill(0);
    rows.forEach((row) => {
        hourCounts[localHour(row.created_at)] += 1;
    });

    return {
        summary: {
            totalActivities: total,
            activeDays,
            uniquePages: new Set(rows.map((r) => r.page_id)).size,
            avgPerDay: activeDays ? Math.round((total / activeDays) * 10) / 10 : 0,
        },
        trend: listDayKeys(firstDay, lastDay).map((date) => ({ date, count: perDay.get(date) ?? 0 })),
        topRoutes: [...routeCounts.values()].sort((a, b) => b.count - a.count).slice(0, TOP_ROUTES),
        topModules: [...moduleCounts]
            .map(([module, count]) => ({ module, count, percent: Math.round((count / total) * 1000) / 10 }))
            .sort((a, b) => b.count - a.count),
        byHour: hourCounts.map((count, hour) => ({ hour, count })),
        recent: rows.slice(0, RECENT_LIMIT).map((row) => ({
            id: row.id,
            createdAt: row.created_at,
            user: userName(row),
            pageName: row.page?.name ?? '—',
            route: row.page?.route ?? '—',
            module: row.page?.module ?? '—',
        })),
    };
}

export async function getTrustActivity(trustId, range, { user, target }) {
    const { data: trust, error } = await supabase
        .from('Trust')
        .select('id, name')
        .eq('id', trustId)
        .maybeSingle();

    if (error) throw error;
    if (!trust) return null;

    const periodRows = await fetchPeriodActivity(trustId, range.start, range.end);

    const { module, pageId } = parseTarget(target);
    const rows = periodRows.filter(
        (row) =>
            (!user || userKey(row) === user) &&
            (!module || row.page?.module === module) &&
            (!pageId || row.page_id === pageId)
    );

    return {
        trust,
        period: { from: range.firstDay, to: range.lastDay },
        filters: buildFilterOptions(periodRows),
        ...buildReport(rows, range),
    };
}

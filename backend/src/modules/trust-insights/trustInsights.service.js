import { supabase } from '../../config/supabase.js';
import { getMemberLoginStats } from './memberLogins.service.js';

const MAX_PERIOD_ROWS = 5000;

const unwrap = ({ data, count, error }) => {
    if (error) throw error;
    return { data, count };
};

const toTrust = (row, logins) => ({
    id: row.id,
    name: row.name,
    logoUrl: row.icon_url,
    appType: row.keyword?.trim() || null,
    superUserName: row.superuser?.name ?? null,
    superUserNumber: row.superuser?.mobile ?? null,
    activityNumber: row.page_activity?.[0]?.count ?? 0,
    lastActivityAt: row.last_activity?.[0]?.created_at ?? null,
    uniqueMemberLogins: logins?.uniqueMembers ?? 0,
    lastMemberLoginAt: logins?.lastLoginAt ?? null,
    createdAt: row.created_at,
});

export async function getTrustInsights({ start, end, firstDay, lastDay, todayStart }) {
    const [total, today, period, last] = await Promise.all([
        supabase.from('Trust').select('id', { count: 'exact', head: true }),
        supabase.from('Trust').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase
            .from('Trust')
            // Both activity values are all-time; only the trust list itself follows the selected period.
            .select(
                'id, name, icon_url, keyword, created_at, superuser:superuser_id(name, mobile), page_activity(count), last_activity:page_activity(created_at)'
            )
            .gte('created_at', start)
            .lt('created_at', end)
            .order('created_at', { referencedTable: 'last_activity', ascending: false })
            .limit(1, { referencedTable: 'last_activity' })
            .order('created_at', { ascending: false })
            .limit(MAX_PERIOD_ROWS),
        supabase
            .from('Trust')
            .select('name, created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
    ]);

    const periodRows = unwrap(period).data;
    const loginStats = await getMemberLoginStats(periodRows.map((row) => row.id));
    const trusts = periodRows.map((row) => toTrust(row, loginStats.get(row.id)));
    const lastTrust = unwrap(last).data;

    return {
        totalTrusts: unwrap(total).count,
        createdToday: unwrap(today).count,
        period: { count: trusts.length, from: firstDay, to: lastDay },
        lastTrust: lastTrust ? { name: lastTrust.name, createdAt: lastTrust.created_at } : null,
        trusts,
    };
}

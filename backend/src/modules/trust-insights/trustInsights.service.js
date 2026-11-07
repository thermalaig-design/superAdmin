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
    subscription: row.subscription_type?.trim().toLowerCase() === 'premium' ? 'premium' : 'free',
    website: [row.shareApp_links].flat()[0]?.web_app_url?.trim() || null,
    superUserName: row.superuser?.name ?? null,
    superUserNumber: row.superuser?.mobile ?? null,
    activityNumber: row.user_activity?.[0]?.count ?? 0,
    appActions: row.member_actions?.[0]?.count ?? 0,
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
            // All activity values are all-time: activity / last activity = rows of registered users (user_reg_id), member_actions = rows of members (members_id); only the trust list itself follows the selected period.
            .select(
                'id, name, icon_url, keyword, subscription_type, created_at, shareApp_links(web_app_url), superuser:superuser_id(name, mobile), user_activity:page_activity(count), member_actions:page_activity(count), last_activity:page_activity(created_at)'
            )
            .not('user_activity.user_reg_id', 'is', null)
            .not('last_activity.user_reg_id', 'is', null)
            .not('member_actions.members_id', 'is', null)
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

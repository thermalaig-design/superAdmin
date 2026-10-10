import { supabase } from '../../config/supabase.js';
import { getCalendarPeriodStarts } from '../../utils/dateRange.js';
import { countActiveTrusts } from '../member-insights/memberInsights.service.js';

const PAGE_SIZE = 1000;
const MAX_ROWS = 100000;
const MEMBER_ID_CHUNK = 100;

// member_session.trust_id is text, so the trust is matched on its string id.
async function fetchTrustSessions(trustId) {
    const rows = [];

    for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
        const { data, error } = await supabase
            .from('member_session')
            .select('id, members_id, member_name, mobile, action_type, action_at, app_platform')
            .eq('trust_id', trustId)
            .not('members_id', 'is', null)
            .order('action_at', { ascending: false })
            .order('id', { ascending: false })
            .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        rows.push(...data);
        if (data.length < PAGE_SIZE) break;
    }

    return rows;
}

// member_name / mobile are optional on member_session, so missing ones come from "Members",
// then from users_reg (some Members rows have no Name). Never selects secret codes.
async function fetchMemberProfiles(memberIds) {
    const chunks = [];
    for (let i = 0; i < memberIds.length; i += MEMBER_ID_CHUNK) chunks.push(memberIds.slice(i, i + MEMBER_ID_CHUNK));

    const fetchAll = async (table, columns) => {
        const results = await Promise.all(
            chunks.map(async (ids) => {
                const { data, error } = await supabase.from(table).select(columns).in('members_id', ids);
                if (error) throw error;
                return data;
            })
        );
        return results.flat();
    };

    const [members, registered] = await Promise.all([
        fetchAll('Members', 'members_id, Name, Mobile'),
        fetchAll('users_reg', 'members_id, name, mobile'),
    ]);

    const profiles = new Map();
    registered.forEach((u) => profiles.set(u.members_id, { name: clean(u.name), mobile: clean(u.mobile) }));
    members.forEach((m) => {
        const existing = profiles.get(m.members_id);
        profiles.set(m.members_id, {
            name: clean(m.Name) ?? existing?.name ?? null,
            mobile: m.Mobile != null ? String(m.Mobile) : existing?.mobile ?? null,
        });
    });

    return profiles;
}

const clean = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

const emptyActionCounts = () => ({ today: 0, yesterday: 0, week: 0, month: 0, year: 0 });

// Counts every session event (login, logout, autologout) exactly as recorded, with no clean-up.
function addToActionCounts(counts, actionAt, starts) {
    const at = new Date(actionAt).getTime();

    if (at >= starts.year) counts.year += 1;
    if (at >= starts.month) counts.month += 1;
    if (at >= starts.week) counts.week += 1;
    if (at >= starts.today) counts.today += 1;
    else if (at >= starts.yesterday) counts.yesterday += 1;
}

/**
 * Members who have logged in to the trust (same rule as "Unique Member Logins"),
 * each with their most recent session event. Rows arrive newest first.
 */
export async function getTrustMemberLogins(trustId) {
    const { data: trust, error } = await supabase.from('Trust').select('id, name').eq('id', trustId).maybeSingle();
    if (error) throw error;
    if (!trust) return null;

    const sessions = await fetchTrustSessions(trustId);
    const periodStarts = getCalendarPeriodStarts();

    const byMember = new Map();
    sessions.forEach((row) => {
        const entry = byMember.get(row.members_id) ?? {
            memberId: row.members_id,
            latest: row,
            hasLogin: false,
            name: null,
            mobile: null,
            appPlatform: null,
            actions: emptyActionCounts(),
        };
        addToActionCounts(entry.actions, row.action_at, periodStarts);
        // newest first: the first non-empty value seen is the most recent one
        entry.name ??= clean(row.member_name);
        entry.mobile ??= clean(row.mobile);
        entry.appPlatform ??= clean(row.app_platform);
        if (row.action_type === 'login') entry.hasLogin = true;
        byMember.set(row.members_id, entry);
    });

    const loggedIn = [...byMember.values()].filter((m) => m.hasLogin);

    const needsProfile = loggedIn.filter((m) => !m.name || !m.mobile).map((m) => m.memberId);
    const profiles = needsProfile.length ? await fetchMemberProfiles(needsProfile) : new Map();

    const trustCounts = await countActiveTrusts(loggedIn.map((m) => m.memberId));

    const members = loggedIn.map((m) => {
        const profile = profiles.get(m.memberId);

        return {
            memberId: m.memberId,
            name: m.name ?? profile?.name ?? null,
            mobile: m.mobile ?? profile?.mobile ?? null,
            appPlatform: m.appPlatform,
            trustCount: trustCounts.get(m.memberId) ?? 0,
            actionType: m.latest.action_type,
            actionAt: m.latest.action_at,
            actions: m.actions,
        };
    });

    return { trust, total: members.length, members };
}

import { supabase } from '../../config/supabase.js';
import { SOURCES, sourceKeyOf } from '../marketing/leadStats.service.js';
import { SETU_APP_TRUST_ID } from './otpNotLogin.logic.js';

const PAGE_SIZE = 1000;
const ID_CHUNK = 100;
const PARALLEL = 6;

const unwrap = ({ data, error }) => {
    if (error) throw error;
    return data;
};

const chunk = (items, size) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

/** Runs `lookup(ids)` over the ids in chunks, several at once, and returns all rows. */
export async function inChunks(ids, lookup) {
    const rows = [];
    const groups = chunk([...new Set(ids.filter(Boolean))], ID_CHUNK);
    for (let i = 0; i < groups.length; i += PARALLEL) {
        (await Promise.all(groups.slice(i, i + PARALLEL).map(lookup))).forEach((part) => rows.push(...part));
    }
    return rows;
}

/** Every login session in [start, end) (members_id and trust_id, or the columns asked for), paged. */
export async function fetchLoginSessions(start, end, columns = 'members_id, trust_id') {
    const rows = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        const data = unwrap(
            await supabase.from('member_session').select(columns).eq('action_type', 'login').gte('action_at', start).lt('action_at', end).order('id').range(from, from + PAGE_SIZE - 1)
        );
        rows.push(...data);
        if (data.length < PAGE_SIZE) break;
    }
    return rows;
}

const emptyCards = () => ({
    leadsInPeriod: 0,
    membersInPeriod: 0,
    otpNotLogin: 0,
    otpLoggedIn: 0,
    pwaLogins: 0,
    trustsInPeriod: 0,
    activity: { total: 0, setuAi: 0, userPanel: 0, otherApps: 0 },
});

/**
 * The numbers of the Platform Overview cards for each lead source, from where each person came from
 * (Members.source of the member behind the lead / login / app / activity):
 *   New Leads, New Members, SETU AI not login, SETU AI logged in, New Apps, App / SETU AI / User Panel / Other App activity, Other App Login.
 * Returns { [sourceKey]: cards }.
 */
export async function getSourceCards({ start, end, members, trusts, activity, platformOf, panelLinks, otpMembers, reportLeads }) {
    const cards = Object.fromEntries(SOURCES.map(({ key }) => [key, emptyCards()]));
    const keyOfSource = (source) => sourceKeyOf({ source: source ?? '' });

    reportLeads.forEach((lead) => cards[sourceKeyOf(lead)].leadsInPeriod++);

    const sourceOfMember = new Map(members.map((member) => [member.members_id, keyOfSource(member.source)]));
    members.forEach((member) => cards[sourceOfMember.get(member.members_id)].membersInPeriod++);
    otpMembers.notLoggedIn.forEach((member) => cards[keyOfSource(member.source)].otpNotLogin++);

    const [sessions, regs, owners] = await Promise.all([
        fetchLoginSessions(start, end),
        inChunks(activity.map((row) => row.user_reg_id), async (ids) => unwrap(await supabase.from('users_reg').select('id, members_id').in('id', ids))),
        inChunks(trusts.map((trust) => trust.superuser_id), async (ids) => unwrap(await supabase.from('superuser').select('id, members_id').in('id', ids))),
    ]);
    const memberOfReg = new Map(regs.map((row) => [row.id, row.members_id]));
    const memberOfOwner = new Map(owners.map((row) => [row.id, row.members_id]));

    // Members.source of everyone who is not already known from the period's members
    const wanted = [
        ...sessions.map((row) => row.members_id),
        ...activity.map((row) => row.members_id),
        ...memberOfReg.values(),
        ...memberOfOwner.values(),
    ].filter((id) => id && !sourceOfMember.has(id));
    (await inChunks(wanted, async (ids) => unwrap(await supabase.from('Members').select('members_id, source').in('members_id', ids)))).forEach((row) =>
        sourceOfMember.set(row.members_id, keyOfSource(row.source))
    );
    const keyOf = (memberId) => (memberId ? sourceOfMember.get(memberId) ?? null : null);

    sessions.forEach((row) => {
        const key = keyOf(row.members_id);
        if (!key) return;
        if (row.trust_id === SETU_APP_TRUST_ID) cards[key].otpLoggedIn++;
        else cards[key].pwaLogins++;
    });

    trusts.forEach((trust) => {
        const key = keyOf(memberOfOwner.get(trust.superuser_id));
        if (key) cards[key].trustsInPeriod++;
    });

    activity.forEach((row) => {
        const platform = platformOf.get(row.page_id);
        const key = keyOf(platform === 'user_panel' ? memberOfReg.get(row.user_reg_id) : row.members_id);
        if (!key) return;
        const counts = cards[key].activity;
        counts.total++;
        if (platform === 'user_panel') counts.userPanel++;
        else if (platform === 'app') {
            if (row.trust_id === SETU_APP_TRUST_ID) {
                if (!panelLinks.has(row.page_id)) counts.setuAi++;
            } else counts.otherApps++;
        }
    });

    return cards;
}

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

/** Every row of a query, a page at a time (1000 at most per request). `build` returns a fresh query; `orderBy` is a unique column. */
async function fetchPaged(build, orderBy) {
    const rows = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        const data = unwrap(await build().order(orderBy).range(from, from + PAGE_SIZE - 1));
        rows.push(...data);
        if (data.length < PAGE_SIZE) break;
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
    productsInNewApps: 0,
    appMembers: 0,
    appMembersLoggedIn: 0,
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

    const newAppSource = new Map(); // id of each app created in the period -> source of its owner
    trusts.forEach((trust) => {
        const key = keyOf(memberOfOwner.get(trust.superuser_id));
        if (!key) return;
        cards[key].trustsInPeriod++;
        newAppSource.set(trust.id, key);
    });
    await addNewAppFigures(cards, newAppSource, keyOfSource);

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

/**
 * What is inside the apps created in the period (all time, not only the period):
 *   productsInNewApps - product_catalog rows, which belong to an app through their category (product_categories.trust_id); counted under the source of the app's owner
 *   appMembers        - registered members of those apps (reg_members rows with that trust_id, one per member per app); counted under the member's own source (Members.source)
 *   appMembersLoggedIn - different members with a login in those apps (member_session, action_type login), app owners included; under the member's own source
 */
async function addNewAppFigures(cards, newAppSource, keyOfSource) {
    const appIds = [...newAppSource.keys()];
    if (appIds.length === 0) return;

    const [categories, members] = await Promise.all([
        inChunks(appIds, (ids) => fetchPaged(() => supabase.from('product_categories').select('id, trust_id').in('trust_id', ids), 'id')),
        inChunks(appIds, (ids) => fetchPaged(() => supabase.from('reg_members').select('id, members_id').in('trust_id', ids), 'id')),
    ]);

    const appOfCategory = new Map(categories.map((category) => [category.id, category.trust_id]));
    const products = await inChunks([...appOfCategory.keys()], (ids) => fetchPaged(() => supabase.from('product_catalog').select('id, category_id').in('category_id', ids), 'id'));
    products.forEach((product) => {
        const key = newAppSource.get(appOfCategory.get(product.category_id));
        if (key) cards[key].productsInNewApps++;
    });

    // source of every member that is registered in a new app or logged in to one
    const logins = await inChunks(appIds, (ids) => fetchPaged(() => supabase.from('member_session').select('id, members_id').eq('action_type', 'login').in('trust_id', ids), 'id'));
    const loggedInIds = [...new Set(logins.map((row) => row.members_id).filter(Boolean))];
    const sourceOf = new Map();
    const wanted = [...members.map((member) => member.members_id), ...loggedInIds];
    (await inChunks(wanted, async (ids) => unwrap(await supabase.from('Members').select('members_id, source').in('members_id', ids)))).forEach((row) => sourceOf.set(row.members_id, row.source));

    members.forEach((member) => cards[keyOfSource(sourceOf.get(member.members_id))].appMembers++);
    loggedInIds.forEach((id) => cards[keyOfSource(sourceOf.get(id))].appMembersLoggedIn++);
}


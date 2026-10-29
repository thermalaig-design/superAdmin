import { supabase } from '../../config/supabase.js';
import { cached } from '../../utils/cache.js';
import { SOURCES, leadChannel, sourceKeyOf } from '../marketing/leadStats.service.js';
import { buildReportLeads, fetchPeriodRows, leadsReceivedIn } from './dashboard.service.js';
import { classifyOtpMembersOf, fetchLoginIdentities } from './otpNotLogin.service.js';
import { SETU_APP_TRUST_ID } from './otpNotLogin.logic.js';
import { fetchLoginSessions, inChunks } from './sourceCards.service.js';

/** The Platform Overview cards that open a list. */
export const DETAIL_CARDS = ['leads', 'members', 'notLogin', 'loggedIn', 'apps', 'activity', 'otherLogin', 'setuActivity', 'panelActivity', 'otherActivity'];

const unwrap = ({ data, error }) => {
    if (error) throw error;
    return data;
};

const col = (key, label, type) => ({ key, label, type });
const PERSON = [col('name', 'Name'), col('mobile', 'Mobile')];
const MEMBER_COLUMNS = [...PERSON, col('source', 'Source'), col('detail', 'Detail'), col('at', 'Joined', 'date')];
const ACTIVITY_COLUMNS = [...PERSON, col('app', 'App'), col('members', 'Members', 'number'), col('products', 'Products', 'number'), col('count', 'Actions', 'number'), col('at', 'Last active', 'date')];

const COLUMNS = {
    leads: [...PERSON, col('source', 'Source'), col('channel', 'Channel'), col('campaign', 'Campaign'), col('at', 'Received', 'date')],
    members: MEMBER_COLUMNS,
    notLogin: MEMBER_COLUMNS,
    loggedIn: [...PERSON, col('count', 'Times logged in', 'number'), col('at', 'Last login', 'date')],
    otherLogin: [...PERSON, col('app', 'App'), col('count', 'Times logged in', 'number'), col('at', 'Last login', 'date')],
    apps: [col('name', 'App'), col('owner', 'Owner'), col('mobile', 'Mobile'), col('source', 'Source'), col('at', 'Created', 'date')],
    activity: ACTIVITY_COLUMNS,
    setuActivity: ACTIVITY_COLUMNS,
    panelActivity: ACTIVITY_COLUMNS,
    otherActivity: ACTIVITY_COLUMNS,
};

const keyOfSource = (source) => sourceKeyOf({ source: source ?? '' });
const labelOfKey = (key) => SOURCES.find((s) => s.key === key)?.label ?? key;
const later = (a, b) => (!a || (b && new Date(b) > new Date(a)) ? b : a);

/** Members.members_id -> { name, mobile, source key } for these ids. */
async function memberInfo(ids) {
    const rows = await inChunks(ids, async (part) => unwrap(await supabase.from('Members').select('members_id, Name, Mobile, source').in('members_id', part)));
    return new Map(rows.map((row) => [row.members_id, { name: row.Name ?? null, mobile: row.Mobile ?? null, source: keyOfSource(row.source) }]));
}

/** Trust.id -> app name. */
async function appNames(ids) {
    const rows = await inChunks(ids, async (part) => unwrap(await supabase.from('Trust').select('id, name').in('id', part)));
    return new Map(rows.map((row) => [row.id, row.name?.trim() || 'Untitled app']));
}

/** Rows grouped by `keyOf`, counting how many each has and when the last one was. */
function groupCount(items, keyOf, base, tally) {
    const groups = new Map();
    items.forEach((item) => {
        const key = keyOf(item);
        const group = groups.get(key) ?? { ...base(item), count: 0, at: null };
        group.count += 1;
        group.at = later(group.at, item.at);
        tally?.(group, item);
        groups.set(key, group);
    });
    return [...groups.values()].sort((a, b) => b.count - a.count);
}

const byDateDesc = (a, b) => new Date(b.at ?? 0) - new Date(a.at ?? 0);

async function leadRows({ start, end }, inSource) {
    const [members, leads] = await Promise.all([
        fetchPeriodRows('Members', 'created_at, members_id, Name, Mobile, source, sub_source, campaign_name', 'members_id', start, end),
        fetchPeriodRows('leads', 'created_at, id, name, lead_received_at, source, platform, is_organic, mobile, campaign_name, adset_name', 'id', start, end),
    ]);
    return buildReportLeads(leadsReceivedIn(leads, start, end), members)
        .filter((lead) => inSource(sourceKeyOf(lead)))
        .map((lead) => ({ name: lead.name ?? null, mobile: lead.mobile ?? null, source: labelOfKey(sourceKeyOf(lead)), channel: leadChannel(lead), campaign: lead.campaign_name?.trim() || null, at: lead.lead_received_at }))
        .sort(byDateDesc);
}

async function memberRows({ start, end }, inSource, onlyNotLoggedIn) {
    let members = await fetchPeriodRows('Members', 'created_at, members_id, Name, Mobile, source, sub_source, campaign_name', 'members_id', start, end);
    if (onlyNotLoggedIn) members = (await classifyOtpMembersOf(members, await fetchLoginIdentities())).notLoggedIn;
    return members
        .filter((member) => inSource(keyOfSource(member.source)))
        .map((member) => ({ name: member.Name ?? null, mobile: member.Mobile ?? null, source: labelOfKey(keyOfSource(member.source)), detail: member.sub_source?.trim() || member.campaign_name?.trim() || null, at: member.created_at }))
        .sort(byDateDesc);
}

async function loginRows({ start, end }, inSource, setu, source) {
    const sessions = (await fetchLoginSessions(start, end, 'members_id, member_name, mobile, trust_id, action_at')).filter((row) => (row.trust_id === SETU_APP_TRUST_ID) === setu);
    const [info, apps] = await Promise.all([memberInfo(sessions.map((row) => row.members_id)), setu ? new Map() : appNames(sessions.map((row) => row.trust_id))]);
    const kept = sessions.filter((row) => !source || (row.members_id && inSource(info.get(row.members_id)?.source)));
    const items = kept.map((row) => ({ ...row, at: row.action_at }));
    return groupCount(items, (row) => `${row.members_id ?? row.mobile}:${setu ? '' : row.trust_id}`, (row) => ({
        name: info.get(row.members_id)?.name ?? row.member_name ?? null,
        mobile: info.get(row.members_id)?.mobile ?? row.mobile ?? null,
        app: apps.get(row.trust_id) ?? null,
    }));
}

async function appRows({ start, end }, inSource, source) {
    const trusts = await fetchPeriodRows('Trust', 'created_at, id, name, superuser_id', 'id', start, end);
    const owners = await inChunks(trusts.map((trust) => trust.superuser_id), async (ids) => unwrap(await supabase.from('superuser').select('id, members_id').in('id', ids)));
    const memberOf = new Map(owners.map((row) => [row.id, row.members_id]));
    const info = await memberInfo([...memberOf.values()]);
    return trusts
        .map((trust) => ({ trust, owner: info.get(memberOf.get(trust.superuser_id)) }))
        .filter(({ owner }) => !source || (owner && inSource(owner.source)))
        .map(({ trust, owner }) => ({ name: trust.name?.trim() || 'Untitled app', owner: owner?.name ?? null, mobile: owner?.mobile ?? null, source: owner ? labelOfKey(owner.source) : null, at: trust.created_at }))
        .sort(byDateDesc);
}

const SIZE_PAGE = 1000;
const SIZE_PARALLEL = 10; // pages read at once

/** Every row of `table` (just `column`), read in parallel pages. */
async function readAll(table, column, orderBy) {
    const { count, error } = await supabase.from(table).select(orderBy, { count: 'exact', head: true });
    if (error) throw error;
    const pages = Math.ceil((count ?? 0) / SIZE_PAGE);
    const rows = [];
    for (let i = 0; i < pages; i += SIZE_PARALLEL) {
        const batch = await Promise.all(
            Array.from({ length: Math.min(SIZE_PARALLEL, pages - i) }, async (_, j) => {
                const from = (i + j) * SIZE_PAGE;
                return unwrap(await supabase.from(table).select(column).order(orderBy).range(from, from + SIZE_PAGE - 1));
            })
        );
        batch.forEach((part) => rows.push(...part));
    }
    return rows;
}

/** Trust id -> how many members it has (reg_members rows), and how many products (product_catalog rows, through their category): all time, for every app. */
const memberCountsByTrust = () =>
    cached('card-details:member-counts', async () => {
        const counts = new Map();
        (await readAll('reg_members', 'trust_id, id', 'id')).forEach((row) => counts.set(row.trust_id, (counts.get(row.trust_id) ?? 0) + 1));
        return counts;
    });
const productCountsByTrust = () =>
    cached('card-details:product-counts', async () => {
        const categories = await readAll('product_categories', 'id, trust_id', 'id');
        const trustOf = new Map(categories.map((row) => [row.id, row.trust_id]));
        const counts = new Map();
        (await readAll('product_catalog', 'id, category_id', 'id')).forEach((row) => {
            const trustId = trustOf.get(row.category_id);
            if (trustId) counts.set(trustId, (counts.get(trustId) ?? 0) + 1);
        });
        return counts;
    });

async function activityRows({ start, end }, inSource, source, card) {
    const [all, routes] = await Promise.all([
        fetchPeriodRows('page_activity', 'created_at, id, trust_id, page_id, user_reg_id, members_id', 'id', start, end),
        supabase.from('page_routes').select('id, platform, name, module').limit(5000),
    ]);
    const platformOf = new Map(unwrap(routes).map((page) => [page.id, page.platform]));
    const panelLinks = new Set(unwrap(routes).filter((page) => page.platform === 'app' && page.module?.trim() === 'User Panel').map((page) => page.id)); // not an app page: left out of SETU APP Activity
    const pageOf = new Map(unwrap(routes).map((page) => [page.id, { name: page.name?.trim() || 'Other', module: page.module?.trim() || null, platform: page.platform ?? null }]));
    const wanted = {
        activity: () => true,
        setuActivity: (row, platform) => platform === 'app' && row.trust_id === SETU_APP_TRUST_ID && !panelLinks.has(row.page_id),
        otherActivity: (row, platform) => platform === 'app' && row.trust_id !== SETU_APP_TRUST_ID,
        panelActivity: (row, platform) => platform === 'user_panel',
    }[card];
    const rows = all.filter((row) => wanted(row, platformOf.get(row.page_id)));

    const regs = await inChunks(rows.map((row) => row.user_reg_id), async (ids) => unwrap(await supabase.from('users_reg').select('id, name, mobile, members_id').in('id', ids)));
    const regById = new Map(regs.map((row) => [row.id, row]));
    const personOf = (row) => (platformOf.get(row.page_id) === 'user_panel' ? regById.get(row.user_reg_id)?.members_id : row.members_id);
    const [info, apps] = await Promise.all([memberInfo(rows.map(personOf)), appNames(rows.map((row) => row.trust_id))]);

    const kept = rows.filter((row) => !source || (personOf(row) && inSource(info.get(personOf(row))?.source)));
    const items = kept.map((row) => ({ ...row, at: row.created_at }));
    const who = (row) => (platformOf.get(row.page_id) === 'user_panel' ? `reg:${row.user_reg_id}` : `member:${row.members_id}`);
    // The activity cards (App, SETU APP, User Panel, Other App) also say which pages the activity was on (for the graphs): per person, and for the whole list
    const withPages = ['activity', 'setuActivity', 'panelActivity', 'otherActivity'].includes(card);
    const pageTotals = new Map();
    const countPage = (map, row) => {
        const page = pageOf.get(row.page_id) ?? { name: 'Other', module: null, platform: null };
        const entry = map.get(row.page_id) ?? { ...page, count: 0 };
        entry.count += 1;
        map.set(row.page_id, entry);
    };
    const rowsOut = groupCount(
        items,
        (row) => `${who(row)}:${row.trust_id}`,
        (row) => {
            const reg = regById.get(row.user_reg_id);
            const member = info.get(row.members_id);
            return {
                name: platformOf.get(row.page_id) === 'user_panel' ? reg?.name ?? null : member?.name ?? null,
                mobile: platformOf.get(row.page_id) === 'user_panel' ? reg?.mobile ?? null : member?.mobile ?? null,
                app: apps.get(row.trust_id) ?? null,
                appId: row.trust_id,
                ...(withPages ? { pageMap: new Map() } : {}),
            };
        },
        withPages
            ? (group, row) => {
                  countPage(group.pageMap, row);
                  countPage(pageTotals, row);
              }
            : undefined
    );
    // how big the app on each row is: its members (reg_members rows with that trust_id) and its products (product_catalog rows, through their category), all time
    const [memberCounts, productCounts] = await Promise.all([memberCountsByTrust(), productCountsByTrust()]);
    rowsOut.forEach((row) => {
        row.members = memberCounts.get(row.appId) ?? 0;
        row.products = productCounts.get(row.appId) ?? 0;
    });
    const sortPages = (map) => [...map.values()].sort((a, b) => b.count - a.count);
    if (withPages) {
        rowsOut.forEach((row) => {
            row.pages = sortPages(row.pageMap);
            delete row.pageMap;
        });
    }
    return { rows: rowsOut, pages: withPages ? sortPages(pageTotals) : undefined };
}

/** How many of these source keys there are per source: [{ key, label, count }], biggest first, empty ones left out. */
const splitBySource = (keys) =>
    SOURCES.map(({ key, label }) => ({ key, label, count: keys.filter((k) => k === key).length }))
        .filter((entry) => entry.count > 0)
        .sort((a, b) => b.count - a.count);

/**
 * Two totals for the period, shown under the App Activity graphs: the members who joined apps (reg_members rows created in the period,
 * not counting the SETU app) and the products created (product_catalog rows, which belong to an app through their category).
 * A member's source is Members.source; a product's source is where the app's owner came from. `count` follows the chosen source,
 * `bySource` always covers all of them.
 */
async function appStats({ start, end }, source) {
    const [regs, products] = await Promise.all([
        fetchPeriodRows('reg_members', 'created_at, id, members_id, trust_id', 'id', start, end),
        fetchPeriodRows('product_catalog', 'created_at, id, category:category_id(trust_id)', 'id', start, end),
    ]);

    const joined = regs.filter((row) => row.trust_id !== SETU_APP_TRUST_ID);
    const memberSources = await memberInfo(joined.map((row) => row.members_id));
    const memberKeys = joined.map((row) => memberSources.get(row.members_id)?.source ?? 'unknown');

    const trustIds = products.map((product) => product.category?.trust_id);
    const trusts = await inChunks(trustIds, async (ids) => unwrap(await supabase.from('Trust').select('id, superuser_id').in('id', ids)));
    const supers = await inChunks(trusts.map((trust) => trust.superuser_id), async (ids) => unwrap(await supabase.from('superuser').select('id, members_id').in('id', ids)));
    const superOf = new Map(supers.map((row) => [row.id, row.members_id]));
    const ownerOf = new Map(trusts.map((trust) => [trust.id, superOf.get(trust.superuser_id)]));
    const ownerSources = await memberInfo([...ownerOf.values()]);
    const productKeys = products.map((product) => ownerSources.get(ownerOf.get(product.category?.trust_id))?.source ?? 'unknown');

    const part = (keys) => ({ count: source ? keys.filter((key) => key === source).length : keys.length, bySource: splitBySource(keys) });
    return { members: part(memberKeys), products: part(productKeys) };
}

/**
 * The rows behind one Platform Overview card for one lead source (or all sources), using the same rules as the card numbers.
 * Logins and activity are grouped per person (and app) with how many times: `total` is the card's number, `people` how many rows there are.
 * Returns { card, source, columns, total, rows }; App / SETU APP / User Panel / Other App Activity also have pages: [{ name, module, platform, count }] (rows carry their own pages); App Activity also has stats: { members, products }, each { count, bySource }.
 */
export async function getCardDetails(range, { card, source }) {
    const inSource = (key) => !source || key === source;
    let rows;
    let pages; // which pages the activity was on (the activity cards only)
    if (card === 'leads') rows = await leadRows(range, inSource);
    else if (card === 'members') rows = await memberRows(range, inSource, false);
    else if (card === 'notLogin') rows = await memberRows(range, inSource, true);
    else if (card === 'loggedIn') rows = await loginRows(range, inSource, true, source);
    else if (card === 'otherLogin') rows = await loginRows(range, inSource, false, source);
    else if (card === 'apps') rows = await appRows(range, inSource, source);
    else {
        const result = await activityRows(range, inSource, source, card);
        rows = result.rows;
        pages = result.pages;
    }

    const stats = card === 'activity' ? await appStats(range, source) : undefined;

    const counted = COLUMNS[card].some((column) => column.key === 'count');
    return {
        card,
        source: source || null,
        columns: COLUMNS[card],
        total: counted ? rows.reduce((sum, row) => sum + row.count, 0) : rows.length,
        pages,
        stats,
        rows,
    };
}

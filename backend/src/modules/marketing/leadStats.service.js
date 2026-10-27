import { supabase } from '../../config/supabase.js';

const ID_CHUNK = 100;
const LOOKUP_PARALLEL = 6; // member look-ups at once

const unwrap = ({ data, count, error }) => {
    if (error) throw error;
    return { data, count };
};

export const last10 = (value) => String(value ?? '').replace(/\D/g, '').slice(-10);

/** True for the WhatsApp source (Members.source = 'WA Broadcasting'). */
const isWhatsAppSource = (source) => /whats\s*app|\bwa\b/i.test(source ?? '');

/** Where a lead came from: Facebook / Instagram (Meta platform), Website, or something else. */
export function leadChannel(lead) {
    if (lead.platform === 'fb') return 'Facebook';
    if (lead.platform === 'ig') return 'Instagram';
    if (isWhatsAppSource(lead.source)) return lead.sub_source?.trim() || 'WhatsApp';
    if (/website/i.test(lead.source ?? '')) return 'Website';
    if (/google/i.test(lead.source ?? '')) return 'Google Ads';
    if (/meta/i.test(lead.source ?? '')) return 'Meta (other)';
    return lead.source?.trim() || 'Other';
}

const chunk = (items, size) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

const receivedAt = (lead) => new Date(lead.lead_received_at).getTime();

/**
 * Matches leads to members: a member with the same mobile number (last 10 digits) who joined after the lead came in
 * (someone who was already a member did not come from the ad). Leads without a usable number cannot be matched.
 * A person who enquired more than once is one person, belonging to their first lead.
 * Returns { withMobile (different phone numbers), members: Map of phone -> members_id, names: Map of phone -> member name,
 * first: Map of phone -> first lead }.
 */
async function matchLeadMembers(leads) {
    const first = new Map();
    leads.forEach((lead) => {
        const key = last10(lead.mobile);
        if (key.length === 10 && (!first.has(key) || receivedAt(lead) < receivedAt(first.get(key)))) first.set(key, lead);
    });

    const members = new Map();
    const names = new Map();
    const toLookUp = [];
    first.forEach((lead, key) => {
        // organic members already carry their members_id: nothing to look up
        if (lead.members_id) {
            members.set(key, lead.members_id);
            if (lead.name) names.set(key, lead.name);
        }
        else toLookUp.push(Number(key));
    });

    const batches = chunk(toLookUp, ID_CHUNK);
    for (let i = 0; i < batches.length; i += LOOKUP_PARALLEL) {
        await Promise.all(
            batches.slice(i, i + LOOKUP_PARALLEL).map(async (mobiles) => {
                const { data } = unwrap(await supabase.from('Members').select('Mobile, members_id, created_at, Name').in('Mobile', mobiles));
                data.forEach((member) => {
                    const key = last10(member.Mobile);
                    if (new Date(member.created_at).getTime() >= receivedAt(first.get(key))) {
                        members.set(key, member.members_id);
                        if (member.Name) names.set(key, member.Name);
                    }
                });
            })
        );
    }

    return { withMobile: first.size, members, names, first };
}

/** Of these leads, how many became members (see matchLeadMembers). */
export async function countConvertedLeads(leads) {
    const { withMobile, members } = await matchLeadMembers(leads);
    return { withMobile, converted: members.size };
}

const LOGIN_PAGE = 1000;
const LOGIN_PARALLEL = 6; // login pages fetched at once

/** members_id of everyone with at least one login session (paged, several pages at once). */
async function loggedInMemberIds() {
    const { count } = unwrap(await supabase.from('member_session').select('id', { count: 'exact', head: true }).eq('action_type', 'login'));
    const pages = Math.ceil((count ?? 0) / LOGIN_PAGE);
    const ids = new Set();
    for (let i = 0; i < pages; i += LOGIN_PARALLEL) {
        await Promise.all(
            Array.from({ length: Math.min(LOGIN_PARALLEL, pages - i) }, async (_, j) => {
                const from = (i + j) * LOGIN_PAGE;
                const { data } = unwrap(
                    await supabase.from('member_session').select('id, members_id').eq('action_type', 'login').order('id').range(from, from + LOGIN_PAGE - 1)
                );
                data.forEach((row) => row.members_id && ids.add(row.members_id));
            })
        );
    }
    return ids;
}

/**
 * Follows every person who enquired through the funnel: became a member -> logged in to the app -> created an app ->
 * that app has had activity. Returns { withMobile, people: [{ lead (their first), memberId, loggedIn, apps: [{ id, active }] }] },
 * one entry per person who became a member; apps are only looked up for people who logged in.
 */
export async function traceLeadPeople(leads, loginMemberIds) {
    const { withMobile, members, names, first } = await matchLeadMembers(leads);

    // Who has logged in at least once: read all login sessions in a few big pages (far fewer queries than asking per member)
    const everLoggedIn = loginMemberIds ?? await loggedInMemberIds();
    const loggedIn = new Set([...new Set(members.values())].filter((id) => everLoggedIn.has(id)));

    // member -> superuser -> the apps (Trust rows) that superuser owns
    const owner = new Map();
    for (const ids of chunk([...loggedIn], ID_CHUNK)) {
        const { data } = unwrap(await supabase.from('superuser').select('id, members_id').in('members_id', ids));
        data.forEach((row) => owner.set(row.id, row.members_id));
    }
    const appsByMember = new Map();
    const appIds = [];
    for (const ids of chunk([...owner.keys()], ID_CHUNK)) {
        const { data } = unwrap(await supabase.from('Trust').select('id, superuser_id').in('superuser_id', ids));
        data.forEach((row) => {
            const memberId = owner.get(row.superuser_id);
            appsByMember.set(memberId, [...(appsByMember.get(memberId) ?? []), { id: row.id, actions: 0, active: false }]);
            appIds.push(row.id);
        });
    }

    const actions = new Map(); // app id -> page_activity rows (all time)
    for (const ids of chunk(appIds, ID_CHUNK)) {
        const { data } = unwrap(await supabase.from('Trust').select('id, page_activity(count)').in('id', ids));
        data.forEach((row) => actions.set(row.id, row.page_activity?.[0]?.count ?? 0));
    }
    appsByMember.forEach((apps) =>
        apps.forEach((app) => {
            app.actions = actions.get(app.id) ?? 0;
            app.active = app.actions > 0;
        })
    );

    return {
        withMobile,
        firstLeads: [...first.values()], // one per different phone number
        people: [...members].map(([phone, memberId]) => ({
            lead: first.get(phone),
            memberId,
            name: names.get(phone) ?? first.get(phone)?.name ?? null,
            loggedIn: loggedIn.has(memberId),
            apps: appsByMember.get(memberId) ?? [],
        })),
    };
}

/** Counts for a group of people (each stage is a subset of the one before): see summariseFunnel. */
function countStages(people) {
    const loggedIn = people.filter((p) => p.loggedIn);
    const creators = loggedIn.filter((p) => p.apps.length > 0);
    const activeCreators = creators.filter((p) => p.apps.some((app) => app.active));
    const sum = (list, pick) => list.reduce((total, p) => total + pick(p), 0);

    return {
        members: people.length,
        loggedIn: loggedIn.length,
        creators: creators.length,
        apps: sum(creators, (p) => p.apps.length),
        activeCreators: activeCreators.length,
        activeApps: sum(creators, (p) => p.apps.filter((app) => app.active).length),
        actions: sum(creators, (p) => p.apps.reduce((total, app) => total + app.actions, 0)),
    };
}

/**
 * The lead-to-app funnel: leads -> logged in -> created an app -> app has activity, counted as people.
 * `apps` / `activeApps` are the apps behind the last two stages (one member can own several).
 */
export function summariseFunnel(trace, leadCount) {
    const { members, actions, ...stages } = countStages(trace.people);
    return { leads: leadCount, withMobile: trace.withMobile, ...stages };
}

/** Campaign a lead belongs to; leads without one are grouped by where they came from. */
function campaignOf(lead) {
    const name = lead.campaign_name?.trim();
    if (name) return name;
    if (/website/i.test(lead.source ?? '')) return 'Website (no campaign)';
    if (/google/i.test(lead.source ?? '')) return 'Google Ads (no campaign)';
    if (/meta/i.test(lead.source ?? '')) return 'Meta (no campaign)';
    if (isWhatsAppSource(lead.source)) return 'WhatsApp Broadcasting';
    return `${lead.source?.trim() || 'Other'} (no campaign)`;
}

const adSetOf = (lead) => lead.adset_name?.trim() || null;

/** One table row for a group of leads: the leads themselves and the people (belonging to their first lead) among them. */
function describeGroup(label, leads, people) {
    const { members, actions, ...stages } = countStages(people);
    return { label, leads: leads.length, members, ...stages };
}

/** Items grouped into a Map by `keyOf(item)`. */
function groupBy(items, keyOf) {
    const map = new Map();
    items.forEach((item) => {
        const key = keyOf(item);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(item);
    });
    return map;
}

/** Rows for the leads grouped by `keyOf` (leads whose key is null are skipped), biggest first. */
function groupRows(leads, people, keyOf, extra = () => ({})) {
    const groups = new Map();
    leads.forEach((lead) => {
        const key = keyOf(lead);
        if (key !== null) {
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(lead);
        }
    });
    const peopleByKey = groupBy(people, (p) => keyOf(p.lead));

    return [...groups]
        .map(([key, rows]) => ({
            ...describeGroup(key, rows, peopleByKey.get(key) ?? []),
            ...extra(rows, key),
        }))
        .sort((a, b) => b.leads - a.leads);
}

/**
 * Campaign performance: for each campaign, how many leads came in and how many of those people went on to log in,
 * create an app and use it. Each campaign also splits by platform (Facebook / Instagram / …) and by ad set.
 */
export function campaignPerformance(leads, trace) {
    const peopleByCampaign = groupBy(trace.people, (p) => campaignOf(p.lead));
    return groupRows(leads, trace.people, campaignOf, (rows, campaign) => {
        const inCampaign = peopleByCampaign.get(campaign) ?? [];
        return {
            channels: [...new Set(rows.map(leadChannel))],
            // WhatsApp broadcasts have no campaign name: they are split by Members.sub_source (e.g. Directory) instead of Facebook / Instagram
            kind: rows.every((lead) => isWhatsAppSource(lead.source)) ? 'whatsapp' : undefined,
            platforms: groupRows(rows, inCampaign, leadChannel),
            adSets: groupRows(rows, inCampaign, adSetOf),
        };
    });
}

/** The lead sources shown on the dashboard. Every one is always returned, even with 0 leads. */
const SOURCES = [
    { key: 'meta', label: 'Meta Ads' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'google', label: 'Google Ads' },
    { key: 'website', label: 'Website' },
    { key: 'organic', label: 'Organic' },
    { key: 'unknown', label: 'Unknown' },
];
const sourceOf = (lead) => {
    const source = lead.source ?? '';
    if (isWhatsAppSource(source)) return 'whatsapp';
    if (/organic/i.test(source)) return 'organic'; // members who joined on their own (Members.source = 'Organic')
    if (/^unknown$/i.test(source.trim())) return 'unknown'; // members with no source at all (Members.source is empty)
    if (/website/i.test(source)) return 'website';
    if (/google/i.test(source)) return 'google';
    if (/meta|facebook|instagram/i.test(source) || ['fb', 'ig'].includes(lead.platform)) return 'meta';
    if (!source.trim()) return 'unknown';
    return 'organic'; // no recognisable ad source
};

/**
 * Organic people are not in `leads`: they are the members whose Members.source is 'Organic'. Each one is treated as a
 * lead received when they joined, so they flow through the same funnel, campaign and source numbers.
 */
export const isOrganicMember = (member) => /organic/i.test(member.source ?? '');
export const organicMemberLead = (member) => ({
    id: `member-${member.members_id}`,
    members_id: member.members_id,
    name: member.Name ?? null,
    mobile: member.Mobile,
    lead_received_at: member.created_at,
    source: 'Organic',
    platform: null,
    is_organic: true,
    campaign_name: member.campaign_name ?? null,
    adset_name: member.sub_source ?? null,
});

/**
 * WhatsApp people are not in `leads` either: they are the members whose Members.source is 'WA Broadcasting'. Each one is
 * treated as a lead received when they joined; Members.sub_source (e.g. "Directory") tells the kinds of WhatsApp apart.
 */
export const isWhatsAppMember = (member) => isWhatsAppSource(member.source);
export const whatsappMemberLead = (member) => ({
    ...organicMemberLead(member),
    source: member.source,
    sub_source: member.sub_source ?? null,
    adset_name: null,
    is_organic: null,
});

/**
 * Members with no source (Members.source is empty) are not in `leads` either: nobody knows where they came from.
 * Like organic members, each one is treated as a lead received when they joined, under the source "Unknown".
 */
export const isUnknownMember = (member) => !String(member.source ?? '').trim();
export const unknownMemberLead = (member) => ({
    ...organicMemberLead(member),
    source: 'Unknown',
    is_organic: null,
});

/** Key of the source a lead came from: meta, whatsapp, google, website, organic or unknown. */
export const sourceKeyOf = (lead) => sourceOf(lead);

/** Name of the source a lead came from (Meta Ads, WhatsApp, Google Ads, Website, Organic). */
export const sourceLabelOf = (lead) => SOURCES.find((source) => source.key === sourceOf(lead)).label;

const RANK_MIN_LEADS = 10; // a source with fewer leads is shown but not ranked

const channelCounts = (leads) => {
    const counts = new Map();
    leads.forEach((lead) => counts.set(leadChannel(lead), (counts.get(leadChannel(lead)) ?? 0) + 1));
    return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
};

/** The funnel, campaign table, sources and conversion for the leads where `inGroup(lead)` is true. */
export function leadSections(leads, trace, inGroup = () => true) {
    const groupLeads = leads.filter(inGroup);
    const people = trace.people.filter((p) => inGroup(p.lead));
    const sub = { withMobile: trace.firstLeads.filter(inGroup).length, people };

    return {
        funnel: summariseFunnel(sub, groupLeads.length),
        campaigns: campaignPerformance(groupLeads, sub),
        leadChannels: channelCounts(groupLeads),
        leadConversion: { leads: groupLeads.length, withMobile: sub.withMobile, converted: people.length },
    };
}

/**
 * Ad source quality: one card per source (Meta Ads, Website, …) with how many leads it brought, how many people built
 * an app, how many of those apps are still in use, and how much they are used. Sources are ranked by active apps per
 * 100 leads (so a source cannot win with two lucky apps); sources under ${RANK_MIN_LEADS} leads are not ranked.
 * Each source also carries its own lead sections, so choosing a card can switch the dashboard without a new request.
 */
export function sourceQuality(leads, trace) {
    const rows = SOURCES.map(({ key, label }) => {
        const inGroup = (lead) => sourceOf(lead) === key;
        const groupLeads = leads.filter(inGroup);
        const people = trace.people.filter((p) => inGroup(p.lead));
        const { members, ...stages } = countStages(people);
        const platforms = [...new Set(groupLeads.map(leadChannel))].filter((name) => name !== label && !/\(other\)$/.test(name));

        return {
            key,
            label,
            platforms,
            leads: groupLeads.length,
            ...stages,
            sections: leadSections(leads, trace, inGroup),
        };
    });

    const ranked = rows
        .filter((row) => row.leads >= RANK_MIN_LEADS)
        .sort((a, b) => b.activeCreators / b.leads - a.activeCreators / a.leads || b.leads - a.leads);
    rows.forEach((row) => (row.rank = ranked.includes(row) ? ranked.indexOf(row) + 1 : null));

    return rows.sort((a, b) => b.leads - a.leads);
}

/**
 * Lead numbers for a period (start inclusive, end exclusive, ISO): how many came in, from where, paid or organic,
 * and how many became members. `total` is all leads ever received.
 */
export async function getLeadPeriodStats(start, end) {
    const [total, period] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase
            .from('leads')
            .select('id, lead_received_at, source, platform, is_organic, mobile')
            .gte('lead_received_at', start)
            .lt('lead_received_at', end)
            .limit(5000),
    ]);

    const leads = unwrap(period).data;
    const channels = new Map();
    leads.forEach((lead) => channels.set(leadChannel(lead), (channels.get(leadChannel(lead)) ?? 0) + 1));

    return {
        total: unwrap(total).count,
        received: leads.length,
        channels: [...channels].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
        // Google Ads leads do not carry is_organic, but they are ads: only an explicit organic flag overrides that
        paid: leads.filter((lead) => lead.is_organic === false || (lead.is_organic == null && /google/i.test(lead.source ?? ''))).length,
        organic: leads.filter((lead) => lead.is_organic === true).length,
        ...(await countConvertedLeads(leads)),
    };
}

/** The numbers of the campaign table that open a lead list: logged in / not logged in / created an app / logged in but no app / app in use. */
const STAGES = ['loggedIn', 'notLoggedIn', 'app', 'noApp', 'active'];

const LEAD_PAGE_SIZE = 1000;
const LEAD_MAX_ROWS = 20000;

/** How far a lead's person got: lead -> member -> logged in -> created an app -> app in use. */
const stageOf = (person) => {
    if (!person) return 'lead';
    if (!person.loggedIn) return 'member';
    if (person.apps.length === 0) return 'loggedIn';
    return person.apps.some((app) => app.active) ? 'active' : 'app';
};

/** Every lead received in the period (ad leads plus organic / WhatsApp / unknown members, who count as leads when they joined), newest first; `source` narrows which are read. */
async function fetchPeriodLeads({ start, end }, source) {
    const all = [];
    for (let from = 0; from < LEAD_MAX_ROWS; from += LEAD_PAGE_SIZE) {
        const { data } = unwrap(
            await supabase
                .from('leads')
                .select('id, name, lead_received_at, source, platform, is_organic, mobile, campaign_name, adset_name')
                .gte('lead_received_at', start)
                .lt('lead_received_at', end)
                .order('lead_received_at', { ascending: false })
                .order('id')
                .range(from, from + LEAD_PAGE_SIZE - 1)
        );
        all.push(...data);
        if (data.length < LEAD_PAGE_SIZE) break;
    }

    // Organic members (Members.source = 'Organic') count as organic leads, received when they joined.
    if (!source || source === 'organic') {
        for (let from = 0; from < LEAD_MAX_ROWS; from += LEAD_PAGE_SIZE) {
            const { data } = unwrap(
                await supabase
                    .from('Members')
                    .select('members_id, Name, Mobile, created_at, source, sub_source, campaign_name')
                    .ilike('source', 'organic')
                    .gte('created_at', start)
                    .lt('created_at', end)
                    .order('created_at', { ascending: false })
                    .order('members_id')
                    .range(from, from + LEAD_PAGE_SIZE - 1)
            );
            all.push(...data.map(organicMemberLead));
            if (data.length < LEAD_PAGE_SIZE) break;
        }
        all.sort((a, b) => receivedAt(b) - receivedAt(a));
    }

    // WhatsApp members (Members.source = 'WA Broadcasting') count as WhatsApp leads, received when they joined.
    if (!source || source === 'whatsapp') {
        for (let from = 0; from < LEAD_MAX_ROWS; from += LEAD_PAGE_SIZE) {
            const { data } = unwrap(
                await supabase
                    .from('Members')
                    .select('members_id, Name, Mobile, created_at, source, sub_source, campaign_name')
                    .ilike('source', 'wa broadcasting')
                    .gte('created_at', start)
                    .lt('created_at', end)
                    .order('created_at', { ascending: false })
                    .order('members_id')
                    .range(from, from + LEAD_PAGE_SIZE - 1)
            );
            all.push(...data.map(whatsappMemberLead));
            if (data.length < LEAD_PAGE_SIZE) break;
        }
        all.sort((a, b) => receivedAt(b) - receivedAt(a));
    }

    // Members with no source count as "Unknown" leads, received when they joined.
    if (!source || source === 'unknown') {
        for (let from = 0; from < LEAD_MAX_ROWS; from += LEAD_PAGE_SIZE) {
            const { data } = unwrap(
                await supabase
                    .from('Members')
                    .select('members_id, Name, Mobile, created_at, source, sub_source, campaign_name')
                    .is('source', null)
                    .gte('created_at', start)
                    .lt('created_at', end)
                    .order('created_at', { ascending: false })
                    .order('members_id')
                    .range(from, from + LEAD_PAGE_SIZE - 1)
            );
            all.push(...data.map(unknownMemberLead));
            if (data.length < LEAD_PAGE_SIZE) break;
        }
        all.sort((a, b) => receivedAt(b) - receivedAt(a));
    }
    return all;
}

/** The campaigns that brought leads in the period (optionally from one source), busiest first: [{ label, leads }]. */
export async function getCampaignOptions(range, source) {
    const leads = (await fetchPeriodLeads(range, source)).filter((lead) => !source || sourceOf(lead) === source);
    const counts = new Map();
    leads.forEach((lead) => counts.set(campaignOf(lead), (counts.get(campaignOf(lead)) ?? 0) + 1));
    return [...counts].map(([label, count]) => ({ label, leads: count })).sort((a, b) => b.leads - a.leads);
}

/**
 * One page of the leads behind a campaign row (newest first, or oldest first with sort 'asc'), for the dashboard's lead list. The leads are narrowed by
 * campaign (and optionally ad source, platform, ad set) and by a search on name / mobile number; only the leads on the
 * requested page are followed through the funnel, so a campaign with thousands of leads stays cheap.
 * `stage` keeps only the people counted in that column of the campaign table and adds summary { people, apps }.
 * Returns { total, summary, page, pageSize, leads: [{ id, name, mobile, channel, adSet, receivedAt, stage }] }.
 */
export async function getCampaignLeads({ start, end }, { campaign, source, platform, adSet, search, page, pageSize, sort, stage }) {
    const all = await fetchPeriodLeads({ start, end }, source);

    const needle = search?.trim().toLowerCase();
    const digits = needle?.replace(/\D/g, '');
    let matching = all.filter(
        (lead) =>
            (!campaign || campaignOf(lead) === campaign) &&
            (!source || sourceOf(lead) === source) &&
            (!platform || leadChannel(lead) === platform) &&
            (!adSet || adSetOf(lead) === adSet) &&
            (!needle || (lead.name ?? '').toLowerCase().includes(needle) || (digits && String(lead.mobile ?? '').replace(/\D/g, '').includes(digits)))
    );

    // stage: only the leads / people counted in that column of the campaign table (each person by their first lead)
    let summary = null;
    let traced = null;
    if (STAGES.includes(stage)) {
        traced = await traceLeadPeople(matching);
        const hasActiveApp = (person) => person.apps.some((app) => app.active);
        const keep = {
            loggedIn: (person) => person.loggedIn,
            noApp: (person) => person.loggedIn && person.apps.length === 0,
            app: (person) => person.apps.length > 0,
            active: hasActiveApp,
        }[stage];
        if (stage === 'notLoggedIn') {
            // every lead except the first lead of each person who logged in: leads minus logged in people
            const loggedInLeadIds = new Set(traced.people.filter((person) => person.loggedIn).map((person) => person.lead.id));
            matching = matching.filter((lead) => !loggedInLeadIds.has(lead.id));
            summary = { people: matching.length, apps: 0 };
        } else {
            const kept = traced.people.filter(keep);
            const keptLeadIds = new Set(kept.map((person) => person.lead.id));
            matching = matching.filter((lead) => keptLeadIds.has(lead.id));
            summary = { people: kept.length, apps: kept.reduce((total, person) => total + person.apps.length, 0) };
        }
    }

    if (sort === 'asc') matching.reverse(); // fetched newest first
    const rows = matching.slice((page - 1) * pageSize, page * pageSize);
    const trace = traced ?? (await traceLeadPeople(rows));
    const personByPhone = new Map(trace.people.map((p) => [last10(p.lead.mobile), p]));

    return {
        total: matching.length,
        summary, // { people, apps } when a stage is asked for
        page,
        pageSize,
        leads: rows.map((lead) => ({
            id: lead.id,
            name: personByPhone.get(last10(lead.mobile))?.name ?? lead.name ?? null,
            mobile: lead.mobile ?? null,
            channel: leadChannel(lead),
            adSet: adSetOf(lead),
            receivedAt: lead.lead_received_at,
            stage: stageOf(personByPhone.get(last10(lead.mobile))),
            // who to open when the lead has built an app
            memberId: personByPhone.get(last10(lead.mobile))?.memberId ?? null,
            appIds: (personByPhone.get(last10(lead.mobile))?.apps ?? []).map((app) => app.id),
        })),
    };
}

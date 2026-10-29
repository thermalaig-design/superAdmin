import { supabase } from '../../config/supabase.js';
import { listDayKeys, localDayKey, localHour } from '../../utils/dateRange.js';
import { getMostActiveApps } from './activeApps.service.js';
import { classifyOtpMembersOf, fetchLoginIdentities } from './otpNotLogin.service.js';
import { SETU_APP_TRUST_ID } from './otpNotLogin.logic.js';
import { getSourceCards } from './sourceCards.service.js';import { googleClickMemberLead, isGoogleClickMember, isOrganicMember, isUnknownMember, isWhatsAppMember, leadSections, organicMemberLead, sourceKeyOf, sourceQuality, traceLeadPeople, unknownMemberLead, whatsappMemberLead } from '../marketing/leadStats.service.js';

const PAGE_SIZE = 1000;
const PAGE_BATCH = 8; // how many pages are fetched at once
const MAX_ROWS = 50000;
const TOP_TRUSTS = 5;

const unwrap = ({ data, count, error }) => {
    if (error) throw error;
    return { data, count };
};

const head = { count: 'exact', head: true };

/**
 * Every row of `table` created in [start, end), fetched in parallel pages. `orderBy` is a unique column, so rows
 * that share a timestamp (a bulk import) are never skipped or repeated between pages.
 */
export async function fetchPeriodRows(table, columns, orderBy, start, end) {
    const base = () => supabase.from(table).select(columns).gte('created_at', start).lt('created_at', end);

    const { count } = unwrap(await supabase.from(table).select(orderBy, head).gte('created_at', start).lt('created_at', end));
    const pages = Math.ceil(Math.min(count ?? 0, MAX_ROWS) / PAGE_SIZE);

    const rows = [];
    for (let i = 0; i < pages; i += PAGE_BATCH) {
        const batch = await Promise.all(
            Array.from({ length: Math.min(PAGE_BATCH, pages - i) }, async (_, j) => {
                const from = (i + j) * PAGE_SIZE;
                const { data } = unwrap(await base().order('created_at').order(orderBy).range(from, from + PAGE_SIZE - 1));
                return data;
            })
        );
        batch.forEach((page) => rows.push(...page));
    }
    return rows;
}

/**
 * The leads received in [start, end): placed by when they were received (not when the row was saved).
 * Compared as instants: the database returns +05:30 text while start/end are UTC ('Z') text, so strings must not be compared.
 */
export function leadsReceivedIn(leads, start, end) {
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    return leads.filter((lead) => {
        const receivedMs = new Date(lead.lead_received_at).getTime();
        return receivedMs >= startMs && receivedMs < endMs;
    });
}

/**
 * The leads the reports work with: the period's leads, plus members who joined on their own (Members.source = 'Organic') as organic leads,
 * WhatsApp broadcast members (Members.source = 'WA Broadcasting') as WhatsApp leads and Google click members as Google Click leads.
 * The headline numbers and the leads graph keep counting the leads table only.
 * Members with no source are "Unknown" leads, unless the same phone number already came in as a lead.
 */
export function buildReportLeads(periodLeads, members) {
    const leadPhones = new Set(periodLeads.map((lead) => String(lead.mobile ?? '').replace(/\D/g, '').slice(-10)).filter((phone) => phone.length === 10));
    const unknownMembers = members.filter((member) => isUnknownMember(member) && !leadPhones.has(String(member.Mobile ?? '').replace(/\D/g, '').slice(-10)));
    return [...periodLeads, ...members.filter(isOrganicMember).map(organicMemberLead), ...members.filter(isWhatsAppMember).map(whatsappMemberLead), ...members.filter(isGoogleClickMember).map(googleClickMemberLead), ...unknownMembers.map(unknownMemberLead)];
}

/** How many of the leads came from Meta and from Google (the rest, e.g. Website, are "other"). */
function leadsBySource(leads) {
    const counts = { meta: 0, google: 0, other: 0 };
    leads.forEach((lead) => {
        const key = sourceKeyOf(lead);
        counts[key === 'meta' || key === 'google' ? key : 'other'] += 1;
    });
    return counts;
}

/** Counts per local day (first to last day of the range) and per hour of the day, for the graphs. */
function buildSeries(timestamps, { firstDay, lastDay }) {
    const perDay = new Map();
    const byHour = Array(24).fill(0);
    timestamps.forEach((value) => {
        const key = localDayKey(value);
        perDay.set(key, (perDay.get(key) ?? 0) + 1);
        byHour[localHour(value)] += 1;
    });

    return {
        trend: listDayKeys(firstDay, lastDay).map((date) => ({ date, count: perDay.get(date) ?? 0 })),
        byHour: byHour.map((count, hour) => ({ hour, count })),
    };
}

/**
 * The investor dashboard: platform totals, how fast members / apps / leads / usage grew in the selected period,
 * the busiest apps, and where leads come from and how many became members. Only counts and small lists are sent.
 */
export async function getDashboard({ start, end, firstDay, lastDay, todayStart }) {
    const [members, trusts, activity, pageRoutes, leads, totals, activeApps, loginIdentities] = await Promise.all([
        fetchPeriodRows('Members', 'created_at, members_id, Name, Mobile, source, sub_source, campaign_name', 'members_id', start, end),
        fetchPeriodRows('Trust', 'created_at, id, superuser_id', 'id', start, end),
        fetchPeriodRows('page_activity', 'created_at, id, trust_id, page_id, user_reg_id, members_id', 'id', start, end),
        supabase.from('page_routes').select('id, platform, module').limit(5000),
        fetchPeriodRows('leads', 'created_at, id, lead_received_at, source, platform, is_organic, mobile, campaign_name, adset_name', 'id', start, end),
        Promise.all([
            supabase.from('Members').select('members_id', head),
            supabase.from('Members').select('members_id', head).eq('app_download', true),
            supabase.from('Members').select('members_id', head).gte('created_at', todayStart),
            supabase.from('Trust').select('id', head),
            supabase.from('Trust').select('id', head).gte('created_at', todayStart),
            supabase.from('leads').select('id', head),
            supabase.from('leads').select('id', head).gte('lead_received_at', todayStart),
            supabase.from('member_session').select('id', head).eq('action_type', 'login').eq('trust_id', SETU_APP_TRUST_ID).gte('action_at', start).lt('action_at', end),
            supabase.from('member_session').select('id', head).eq('action_type', 'login').neq('trust_id', SETU_APP_TRUST_ID).gte('action_at', start).lt('action_at', end),
        ]),
        getMostActiveApps({ start, end }),
        fetchLoginIdentities(),
    ]);
    const [memberTotal, appDownloaded, memberToday, trustTotal, trustToday, leadTotal, leadToday, setuLogins, pwaLogins] = totals.map((r) => unwrap(r).count);

    const periodLeads = leadsReceivedIn(leads, start, end);

    // Activity is split by the platform of the page that was opened (page_routes.platform): 'app' or 'user_panel'.
    const platformOf = new Map(unwrap(pageRoutes).data.map((page) => [page.id, page.platform]));
    // The app's own "User Panel" page (a link out to the panel) is not an app page: it is left out of SETU APP Activity.
    const panelLinks = new Set(unwrap(pageRoutes).data.filter((page) => page.platform === 'app' && page.module?.trim() === 'User Panel').map((page) => page.id));
    const appActivity = activity.filter((row) => platformOf.get(row.page_id) === 'app');
    const userPanelActivity = activity.filter((row) => platformOf.get(row.page_id) === 'user_panel');

    const perTrust = new Map();
    activity.forEach((row) => {
        if (row.trust_id) perTrust.set(row.trust_id, (perTrust.get(row.trust_id) ?? 0) + 1);
    });
    const top = [...perTrust].sort((a, b) => b[1] - a[1]).slice(0, TOP_TRUSTS);
    const { data: topNames } = top.length ? unwrap(await supabase.from('Trust').select('id, name').in('id', top.map(([id]) => id))) : { data: [] };
    const names = new Map(topNames.map((t) => [t.id, t.name]));

    const reportLeads = buildReportLeads(periodLeads, members);
    const [trace, otpMembers] = await Promise.all([
        traceLeadPeople(reportLeads, loginIdentities.memberIds),
        classifyOtpMembersOf(members, loginIdentities),
    ]);
    const sourceCards = await getSourceCards({ start, end, members, trusts, activity, platformOf, panelLinks, otpMembers, reportLeads });
    const range = { firstDay, lastDay };
    return {
        period: { from: firstDay, to: lastDay },
        totals: {
            members: memberTotal,
            membersInPeriod: members.length,
            otpNotLogin: otpMembers.notLoggedIn.length,
            otpLoggedIn: setuLogins, // login events in SETU AI (member_session.trust_id = SETU AI) in the period
            membersToday: memberToday,
            appDownloaded,
            trusts: trustTotal,
            trustsInPeriod: trusts.length,
            appBuilders: new Set(trusts.map((trust) => trust.superuser_id).filter(Boolean)).size, // different people who built them
            trustsToday: trustToday,
            leads: leadTotal,
            leadsInPeriod: periodLeads.length,
            leadsToday: leadToday,
            leadsBySource: leadsBySource(periodLeads), // Meta / Google split of the New Leads card
            pwaLogins, // login events in the period in any app other than SETU AI
        },
        activity: {
            total: activity.length,
            byUsers: activity.filter((row) => row.user_reg_id).length,
            byMembers: activity.filter((row) => row.members_id).length,
            setuAi: appActivity.filter((row) => row.trust_id === SETU_APP_TRUST_ID && !panelLinks.has(row.page_id)).length, // app pages opened inside the SETU app
            userPanel: userPanelActivity.length, // user panel pages
            otherApps: appActivity.filter((row) => row.trust_id !== SETU_APP_TRUST_ID).length, // app pages opened in every other app
        },
        series: {
            members: buildSeries(members.map((r) => r.created_at), range),
            trusts: buildSeries(trusts.map((r) => r.created_at), range),
            activity: buildSeries(activity.map((r) => r.created_at), range),
            leads: buildSeries(periodLeads.map((r) => r.lead_received_at), range),
        },
        topTrusts: top.map(([id, count]) => ({ id, name: names.get(id) ?? 'Unknown trust', count })),
        ...leadSections(reportLeads, trace), // funnel, campaigns, leadChannels, leadConversion for all leads
        sources: sourceQuality(reportLeads, trace).map((source) => ({ ...source, cards: sourceCards[source.key] })),
        activeApps,
    };
}

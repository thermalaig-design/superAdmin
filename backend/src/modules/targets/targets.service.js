import { supabase } from '../../config/supabase.js';
import { traceLeadPeople } from '../marketing/leadStats.service.js';
import { localDayKey, startOfLast24Hours } from '../../utils/dateRange.js';
import { buildTargetOverview } from './targetsOverview.logic.js';

const WINDOW_DAYS = 14;
const PAGE = 1000;
const PLATFORMS = { meta: 'Meta', google: 'Google' };

const unwrap = ({ data, error }) => {
    if (error) throw error;
    return data;
};

const isoDay = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);

/** Every row of a query, a page at a time (Supabase returns 1000 at most). */
async function fetchAll(build) {
    const rows = [];
    for (let from = 0; ; from += PAGE) {
        const page = unwrap(await build().range(from, from + PAGE - 1));
        rows.push(...page);
        if (page.length < PAGE) break;
    }
    return rows;
}

const savedShape = (row) => ({
    target: Number(row.target_cost_per_app),
    previousTarget: row.previous_target == null ? null : Number(row.previous_target),
    dailyBudget: Number(row.daily_budget_inr),
    alerts: row.alerts,
});

/**
 * The campaigns that spent money in the last 14 days (leadExpense: one row per campaign per day), each with its ad sets (the
 * distinct adset_id / adset_name on its leads) and the targets saved for them (adset_targets).
 * A campaign whose leads carry no ad set (Google) gets one entry with an empty id: the target is for the whole campaign.
 */
export async function getTargetCampaigns() {
    const since = isoDay(WINDOW_DAYS);
    const expense = await fetchAll(() =>
        supabase.from('leadExpense').select('campaign_id, campaign_name, platform, campaign_status, date, cost_inr, daily_budget_inr').gte('date', since).order('date', { ascending: false }).order('id')
    );

    const campaigns = new Map();
    expense.forEach((row) => {
        const platform = PLATFORMS[String(row.platform ?? '').toLowerCase()];
        if (!platform || !row.campaign_id) return;
        // rows come newest first: the first one of a campaign gives its current name, status and budget
        const entry = campaigns.get(row.campaign_id) ?? {
            id: row.campaign_id,
            name: row.campaign_name,
            platform,
            status: row.campaign_status,
            dailyBudget: row.daily_budget_inr == null ? null : Number(row.daily_budget_inr),
            spend: 0,
            leads: 0,
            adSets: new Map(),
        };
        entry.spend += Number(row.cost_inr) || 0;
        campaigns.set(row.campaign_id, entry);
    });
    const ids = [...campaigns.keys()];
    if (ids.length === 0) return [];

    const leads = await fetchAll(() =>
        supabase.from('leads').select('campaign_id, adset_id, adset_name, lead_received_at').in('campaign_id', ids).order('lead_received_at', { ascending: false }).order('id')
    );
    const sinceTime = new Date(`${since}T00:00:00`).getTime();
    leads.forEach((lead) => {
        const campaign = campaigns.get(lead.campaign_id);
        const recent = new Date(lead.lead_received_at).getTime() >= sinceTime;
        if (recent) campaign.leads += 1;
        if (!lead.adset_id) return;
        // newest lead first: the first name seen is the current one
        const adSet = campaign.adSets.get(lead.adset_id) ?? { id: lead.adset_id, name: lead.adset_name || lead.adset_id, leads: 0 };
        if (recent) adSet.leads += 1;
        campaign.adSets.set(lead.adset_id, adSet);
    });

    // Until sql/adset_targets.sql has been run the campaigns still list, just with nothing saved (saving then says what is missing).
    const { data: savedRows, error: savedError } = await supabase.from('adset_targets').select('*').in('campaign_id', ids);
    if (savedError && !/adset_targets/.test(savedError.message)) throw savedError;
    const saved = new Map((savedRows ?? []).map((row) => [`${row.campaign_id}:${row.adset_id}`, savedShape(row)]));

    return [...campaigns.values()]
        .map((campaign) => {
            const adSets = campaign.adSets.size ? [...campaign.adSets.values()] : [{ id: '', name: null, leads: campaign.leads }];
            return {
                id: campaign.id,
                name: campaign.name,
                platform: campaign.platform,
                status: campaign.status,
                dailyBudget: campaign.dailyBudget,
                spend: Math.round(campaign.spend),
                leads: campaign.leads,
                adSets: adSets.map((adSet) => ({ ...adSet, saved: saved.get(`${campaign.id}:${adSet.id}`) ?? null })),
            };
        })
        .sort((a, b) => b.spend - a.spend);
}

/** Saves the targets of some ad sets: items = [{ campaignId, adSetId, target, dailyBudget, alerts }]. */
export async function saveAdSetTargets(items) {
    const campaignIds = [...new Set(items.map((item) => item.campaignId))];
    const known = new Map(unwrap(await supabase.from('leadExpense').select('campaign_id, platform').in('campaign_id', campaignIds)).map((row) => [row.campaign_id, row.platform]));
    if (campaignIds.some((id) => !known.has(id))) return { error: 'Unknown campaign' };

    // a changed target keeps the one it replaces as "previous"; an unchanged one keeps the previous it already had
    const { data: existingRows } = await supabase.from('adset_targets').select('campaign_id, adset_id, target_cost_per_app, previous_target').in('campaign_id', campaignIds);
    const existing = new Map((existingRows ?? []).map((row) => [`${row.campaign_id}:${row.adset_id}`, row]));

    const rows = items.map((item) => {
        const before = existing.get(`${item.campaignId}:${item.adSetId}`);
        const changed = before && Number(before.target_cost_per_app) !== item.target;
        return {
            campaign_id: item.campaignId,
            adset_id: item.adSetId,
            platform: PLATFORMS[String(known.get(item.campaignId)).toLowerCase()] ?? null,
            target_cost_per_app: item.target,
            previous_target: changed ? before.target_cost_per_app : (before?.previous_target ?? null),
            daily_budget_inr: item.dailyBudget,
            alerts: item.alerts,
            updated_at: new Date().toISOString(),
        };
    });
    unwrap(await supabase.from('adset_targets').upsert(rows, { onConflict: 'campaign_id,adset_id' }).select('campaign_id'));
    return { saved: rows.length };
}

const WINDOWS = { '24h': 0, '14d': 14, '30d': 30 };
const ratio = (a, b) => (b > 0 ? Math.round(a / b) : null);

/**
 * What every ad set cost and brought in over a window (the last 24 hours, the last 14 or the last 30 days): { window, items: { 'campaign:adSet': { spend,
 * leads, registrations, logins, apps, costPerRegistration, costPerLogin, costPerApp } } }.
 * The ad spend is only known per campaign (leadExpense), so it is shared between a campaign's ad sets by how many leads each brought.
 * Registrations / logins / apps follow the leads of the window to their members, the way the dashboard does.
 */
export async function getTargetHistory(window) {
    const days = WINDOWS[window] ?? 14;
    const last24 = window === '24h';
    // Ad spend is only recorded per day, so the 24 hours take the spend from the day the window started on.
    const since = last24 ? localDayKey(startOfLast24Hours()) : isoDay(days);
    const campaigns = await getTargetCampaigns();
    const ids = campaigns.map((campaign) => campaign.id);
    if (ids.length === 0) return { window, items: {} };

    const spend = new Map();
    const expense = await fetchAll(() => supabase.from('leadExpense').select('campaign_id, cost_inr').in('campaign_id', ids).gte('date', since).order('id'));
    expense.forEach((row) => spend.set(row.campaign_id, (spend.get(row.campaign_id) ?? 0) + (Number(row.cost_inr) || 0)));

    const start = new Date();
    if (last24) {
        start.setTime(startOfLast24Hours());
    } else {
        start.setDate(start.getDate() - days);
        start.setHours(0, 0, 0, 0);
    }
    const leads = await fetchAll(() =>
        supabase.from('leads').select('id, mobile, campaign_id, adset_id, lead_received_at').in('campaign_id', ids).gte('lead_received_at', start.toISOString()).order('id')
    );
    const trace = await traceLeadPeople(leads);
    const personByLead = new Map(trace.people.map((person) => [person.lead.id, person]));

    const items = {};
    campaigns.forEach((campaign) => {
        const known = new Set(campaign.adSets.map((adSet) => adSet.id));
        const own = leads.filter((lead) => lead.campaign_id === campaign.id);
        const groupOf = (lead) => (known.has(lead.adset_id ?? '') ? (lead.adset_id ?? '') : campaign.adSets[0].id);
        const total = spend.get(campaign.id) ?? 0;

        campaign.adSets.forEach((adSet) => {
            const mine = own.filter((lead) => groupOf(lead) === adSet.id);
            const people = mine.map((lead) => personByLead.get(lead.id)).filter(Boolean);
            const share = own.length ? mine.length / own.length : 1 / campaign.adSets.length;
            const cost = total * share;
            const logins = people.filter((person) => person.loggedIn).length;
            const apps = people.reduce((sum, person) => sum + person.apps.length, 0);
            items[`${campaign.id}:${adSet.id}`] = {
                spend: Math.round(cost),
                leads: mine.length,
                registrations: people.length,
                logins,
                apps,
                costPerRegistration: ratio(cost, people.length),
                costPerLogin: ratio(cost, logins),
                costPerApp: ratio(cost, apps),
            };
        });
    });
    return { window, items };
}

const DAY_MS = 86400000;

/**
 * Daily INR spend/clicks plus business apps created in the dashboard's selected window.
 * Apps use the creator's first lead before creation, falling back to Members source/campaign.
 * Missing campaign tracking stays unassigned; never distribute Google apps by spend or clicks.
 */
export async function getTargetOverview({ start, end }) {
    const from = localDayKey(start);
    const to = localDayKey(new Date(end).getTime() - 1);
    const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
    const previousFrom = new Date(Date.parse(`${from}T00:00:00Z`) - days * DAY_MS).toISOString().slice(0, 10);
    const dailySpendApproximate = localDayKey(new Date(start).getTime() - 1) === from;
    const [rows, previousRows, apps, leads] = await Promise.all([
        fetchAll(() => supabase.from('leadExpense').select('campaign_id, campaign_name, platform, date, cost_inr, clicks, raw').gte('date', from).lte('date', to).order('date', { ascending: false }).order('id')),
        dailySpendApproximate ? [] : fetchAll(() => supabase.from('leadExpense').select('platform, clicks').gte('date', previousFrom).lt('date', from).order('date', { ascending: false }).order('id')),
        fetchAll(() => supabase.from('Trust').select('id, created_at, superuser:superuser_id(members_id, mobile)').gte('created_at', start).lt('created_at', end).order('id')),
        fetchAll(() => supabase.from('leads').select('id, mobile, source, platform, campaign_id, campaign_name, adset_id, adset_name, lead_received_at').lt('lead_received_at', end).order('lead_received_at').order('id')),
    ]);
    const ownerIds = [...new Set(apps.map((app) => app.superuser?.members_id).filter(Boolean))];
    const members = [];
    for (let i = 0; i < ownerIds.length; i += 100) {
        const ids = ownerIds.slice(i, i + 100);
        members.push(...await fetchAll(() => supabase.from('Members').select('members_id, Mobile, source, campaign_name, created_at').in('members_id', ids).order('members_id')));
    }
    const result = buildTargetOverview({ rows, previousRows, apps, members, leads, period: { from: start, to: end, spendFrom: from, spendTo: to, dailySpendApproximate } });
    const ids = result.campaigns.map((campaign) => campaign.id);
    const saved = [];
    for (let i = 0; i < ids.length; i += 100) {
        const { data, error } = await supabase.from('adset_targets').select('*').in('campaign_id', ids.slice(i, i + 100));
        if (error && !['42P01', 'PGRST205'].includes(error.code)) throw error;
        saved.push(...(data ?? []));
    }
    result.campaigns.forEach((campaign) => {
        campaign.savedTargets = saved.filter((row) => String(row.campaign_id) === campaign.id).map((row) => ({ id: row.adset_id, saved: savedShape(row) }));
    });
    return result;
}

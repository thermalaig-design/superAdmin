import { cached } from '../../utils/cache.js';
import { localDayKey, resolveRange } from '../../utils/dateRange.js';
import { getTargetCampaigns, getTargetHistory, getTargetOverview, saveAdSetTargets } from './targets.service.js';

const ALERTS = ['both', 'whatsapp', 'email', 'none'];
const MISSING_TABLE = '42P01'; // Postgres: relation does not exist (sql/adset_targets.sql has not been run yet)

const failure = (res, error, message) => {
    if (error?.code === MISSING_TABLE || /adset_targets/.test(error?.message ?? '')) {
        return res.status(500).json({ success: false, message: 'The adset_targets table is missing. Run backend/sql/adset_targets.sql in Supabase first.' });
    }
    return res.status(500).json({ success: false, message });
};

/** The campaigns running (with spend in the last 14 days), their ad sets and the saved targets. Not cached: a save must show at once. */
export async function fetchTargetCampaigns(_req, res) {
    try {
        return res.json({ success: true, data: await getTargetCampaigns() });
    } catch (error) {
        console.error('fetchTargetCampaigns failed:', error);
        return failure(res, error, 'Failed to load campaigns');
    }
}

/** What each ad set cost and brought in over the last 24 hours / the last 14 days / the last 30 days (the "previous data" on the page). */
export async function fetchTargetHistory(req, res) {
    try {
        const window = ['24h', '14d', '30d'].includes(req.query.window) ? req.query.window : '14d';
        return res.json({ success: true, data: await cached(`target-history:${window}`, () => getTargetHistory(window)) });
    } catch (error) {
        console.error('fetchTargetHistory failed:', error);
        return failure(res, error, 'Failed to load the previous data');
    }
}

/** Spend, clicks and attributed apps, with the same range contract as the dashboard. */
export async function fetchTargetOverview(req, res) {
    try {
        const selection = { ...req.query, range: req.query.range ?? req.query.period ?? '7d' };
        if (selection.range === '14d') {
            selection.range = 'custom';
            selection.from = localDayKey(Date.now() - 13 * 86400000);
            selection.to = localDayKey(Date.now());
        }
        const range = resolveRange(selection);
        if (range.error) return res.status(400).json({ success: false, message: range.error });
        return res.json({ success: true, data: await cached(`target-overview:v2:${JSON.stringify(range)}`, () => getTargetOverview(range)) });
    } catch (error) {
        console.error('fetchTargetOverview failed:', error);
        return failure(res, error, 'Failed to load the targets overview');
    }
}

/** Validates one ad set's boxes; returns the clean values or { error }. */
function readItem(raw) {
    const campaignId = typeof raw?.campaignId === 'string' ? raw.campaignId.trim() : '';
    const adSetId = typeof raw?.adSetId === 'string' ? raw.adSetId.trim() : '';
    const target = Number(raw?.target);
    const dailyBudget = Number(raw?.dailyBudget);
    if (!campaignId) return { error: 'Campaign is missing' };
    if (!(target > 0)) return { error: 'Target cost per app must be above 0' };
    if (!(dailyBudget >= 0)) return { error: 'Daily budget cannot be negative' };
    if (!ALERTS.includes(raw?.alerts)) return { error: 'Choose where to send alerts' };
    return { campaignId, adSetId, target, dailyBudget, alerts: raw.alerts };
}

/** Saves the edited ad set targets: { items: [{ campaignId, adSetId, target, dailyBudget, alerts }] }. */
export async function updateAdSetTargets(req, res) {
    try {
        const raw = Array.isArray(req.body?.items) ? req.body.items : [];
        if (raw.length === 0 || raw.length > 200) return res.status(400).json({ success: false, message: 'Nothing to save' });
        const items = raw.map(readItem);
        const bad = items.find((item) => item.error);
        if (bad) return res.status(400).json({ success: false, message: bad.error });

        const result = await saveAdSetTargets(items);
        if (result.error) return res.status(400).json({ success: false, message: result.error });
        return res.json({ success: true, data: result });
    } catch (error) {
        console.error('updateAdSetTargets failed:', error);
        return failure(res, error, 'Failed to save targets');
    }
}

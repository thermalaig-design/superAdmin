import { cached } from '../../utils/cache.js';
import { resolveRange } from '../../utils/dateRange.js';
import { getCampaignOptions } from '../marketing/leadStats.service.js';
import { getCampaignRegistrations, getRegistrations, getRegistrationSummary, getRegistrationTimeline } from './registrations.service.js';

/** The cards above the list: registrations, leads, logged in, apps created, for the selected period. */
export async function fetchRegistrationSummary(req, res) {
    try {
        const range = resolveRange(req.query);
        if (range.error) return res.status(400).json({ success: false, message: range.error });

        const data = await cached(`registration-summary:${JSON.stringify(range)}`, () => getRegistrationSummary(range));
        return res.json({ success: true, data });
    } catch (error) {
        console.error('fetchRegistrationSummary failed:', error);
        return res.status(500).json({ success: false, message: 'Failed to load registration summary' });
    }
}

/** The campaigns that brought leads in the period (optionally from one source), for the Campaign filter. */
export async function fetchRegistrationCampaigns(req, res) {
    try {
        const range = resolveRange(req.query);
        if (range.error) return res.status(400).json({ success: false, message: range.error });

        const source = typeof req.query.source === 'string' && req.query.source ? req.query.source : undefined;
        const data = await cached(`registration-campaigns:${JSON.stringify(range)}:${source ?? ''}`, () => getCampaignOptions(range, source));
        return res.json({ success: true, data });
    } catch (error) {
        console.error('fetchRegistrationCampaigns failed:', error);
        return res.status(500).json({ success: false, message: 'Failed to load campaigns' });
    }
}

/** The people who registered in the selected period, one page at a time. */
export async function fetchRegistrations(req, res) {
    try {
        const range = resolveRange(req.query);
        if (range.error) return res.status(400).json({ success: false, message: range.error });

        const search = typeof req.query.search === 'string' ? req.query.search : '';
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 25));

        // opened from a number of the dashboard's campaign table: only the people behind that number
        const { campaign, source, platform, adSet } = req.query;
        const stage = ['loggedIn', 'notLoggedIn', 'app', 'noApp', 'active'].includes(req.query.stage) ? req.query.stage : undefined;
        if (campaign || source || stage) {
            const filters = { campaign, source, platform, adSet, stage };
            const people = await cached(`registrations:campaign:${JSON.stringify(range)}:${JSON.stringify(filters)}:${search}:${page}:${pageSize}`, () => getCampaignRegistrations(range, filters, { search, page, pageSize }));
            return res.json({ success: true, data: people });
        }

        const data = await cached(`registrations:${JSON.stringify(range)}:${search}:${page}:${pageSize}`, () => getRegistrations(range, { search, page, pageSize }));
        return res.json({ success: true, data });
    } catch (error) {
        console.error('fetchRegistrations failed:', error);
        return res.status(500).json({ success: false, message: 'Failed to load registrations' });
    }
}

/** Everything one registered member did: login, app created, apps and pages opened. */
export async function fetchRegistrationTimeline(req, res) {
    try {
        const { memberId } = req.params;
        const data = await cached(`registration-timeline:${memberId}`, () => getRegistrationTimeline(memberId));
        if (!data) return res.status(404).json({ success: false, message: 'Member not found' });
        return res.json({ success: true, data });
    } catch (error) {
        console.error('fetchRegistrationTimeline failed:', error);
        return res.status(500).json({ success: false, message: 'Failed to load member activity' });
    }
}

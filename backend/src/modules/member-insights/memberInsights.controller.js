import { resolveRange } from '../../utils/dateRange.js';
import { getMemberActivity } from './memberActivity.service.js';
import {
    getMemberGrowth,
    getMemberSummary,
    getMemberTrusts,
    listMembers,
    listTrustOptions,
    SORT_COLUMNS,
} from './memberInsights.service.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZES = [10, 25, 50, 100];
const MAX_SEARCH_LENGTH = 80;

const fail = (res, status, message) => res.status(status).json({ success: false, message });

export async function fetchMembers(req, res) {
    try {
        const { search = '', trust = '', appDownload = 'all', sort = 'desc', sortBy = 'createdAt' } = req.query;
        const page = Number.parseInt(req.query.page ?? '1', 10);
        const pageSize = Number.parseInt(req.query.pageSize ?? '25', 10);

        if (!Number.isInteger(page) || page < 1) return fail(res, 400, 'page must be 1 or more');
        if (!PAGE_SIZES.includes(pageSize)) return fail(res, 400, `pageSize must be one of ${PAGE_SIZES.join(', ')}`);
        if (!['asc', 'desc'].includes(sort)) return fail(res, 400, 'sort must be asc or desc');
        if (!Object.hasOwn(SORT_COLUMNS, sortBy)) return fail(res, 400, `sortBy must be one of ${Object.keys(SORT_COLUMNS).join(', ')}`);
        if (!['all', 'yes', 'no'].includes(appDownload)) return fail(res, 400, 'appDownload must be all, yes or no');
        if (trust && !UUID_PATTERN.test(trust)) return fail(res, 400, 'Invalid trust id');

        // Optional: only members who joined in the chosen period (today / 7d / 30d / custom, like the trust pages).
        let range = null;
        if (req.query.range) {
            range = resolveRange(req.query);
            if (range.error) return fail(res, 400, range.error);
        }

        const data = await listMembers({
            page,
            pageSize,
            sortBy,
            sort,
            search: String(search).slice(0, MAX_SEARCH_LENGTH),
            trustId: trust || null,
            appDownload,
            range,
        });

        return res.json({ success: true, data });
    } catch (error) {
        console.error('fetchMembers failed:', error);
        return fail(res, 500, 'Failed to load members');
    }
}

export async function fetchMemberGrowth(req, res) {
    try {
        const range = resolveRange(req.query);
        if (range.error) return fail(res, 400, range.error);

        return res.json({ success: true, data: await getMemberGrowth(range) });
    } catch (error) {
        console.error('fetchMemberGrowth failed:', error);
        return fail(res, 500, 'Failed to load member growth');
    }
}

export async function fetchMemberTrusts(req, res) {
    try {
        const { memberId } = req.params;
        if (!UUID_PATTERN.test(memberId)) return fail(res, 400, 'Invalid member id');

        const data = await getMemberTrusts(memberId, { withLastActivity: true });
        if (!data) return fail(res, 404, 'Member not found');

        return res.json({ success: true, data });
    } catch (error) {
        console.error('fetchMemberTrusts failed:', error);
        return fail(res, 500, "Failed to load the member's trusts");
    }
}

export async function fetchMemberSummary(_req, res) {
    try {
        return res.json({ success: true, data: await getMemberSummary() });
    } catch (error) {
        console.error('fetchMemberSummary failed:', error);
        return fail(res, 500, 'Failed to load member summary');
    }
}

export async function fetchTrustOptions(_req, res) {
    try {
        return res.json({ success: true, data: await listTrustOptions() });
    } catch (error) {
        console.error('fetchTrustOptions failed:', error);
        return fail(res, 500, 'Failed to load trusts');
    }
}

export async function fetchMemberActivity(req, res) {
    try {
        const { memberId } = req.params;
        const { trust = 'all', target } = req.query;

        if (!UUID_PATTERN.test(memberId)) return fail(res, 400, 'Invalid member id');
        if (trust !== 'all' && !UUID_PATTERN.test(trust)) return fail(res, 400, 'Invalid trust id');

        const range = resolveRange(req.query);
        if (range.error) return fail(res, 400, range.error);

        const data = await getMemberActivity(memberId, range, { trust, target });
        if (!data) return fail(res, 404, 'Member not found');
        if (data.invalidTrust) return fail(res, 400, 'Member is not registered in that trust');

        return res.json({ success: true, data });
    } catch (error) {
        console.error('fetchMemberActivity failed:', error);
        return fail(res, 500, 'Failed to load member activity');
    }
}

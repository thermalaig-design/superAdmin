import { resolveRange } from '../../utils/dateRange.js';
import { getTrustActivity } from './trustActivity.service.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchTrustActivity(req, res) {
    try {
        const { trustId } = req.params;
        const { range, from, to, user, target } = req.query;

        if (!UUID_PATTERN.test(trustId)) {
            return res.status(400).json({ success: false, message: 'Invalid trust id' });
        }

        const resolved = resolveRange({ range, from, to });
        if (resolved.error) {
            return res.status(400).json({ success: false, message: resolved.error });
        }

        const data = await getTrustActivity(trustId, resolved, { user, target });
        if (!data) {
            return res.status(404).json({ success: false, message: 'Trust not found' });
        }

        return res.json({ success: true, data });
    } catch (error) {
        console.error('fetchTrustActivity failed:', error);
        return res.status(500).json({ success: false, message: 'Failed to load trust activity' });
    }
}

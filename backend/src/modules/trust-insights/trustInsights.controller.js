import { resolveRange } from '../../utils/dateRange.js';
import { getTrustInsights } from './trustInsights.service.js';

export async function fetchTrustInsights(req, res) {
    try {
        const range = resolveRange(req.query);

        if (range.error) {
            return res.status(400).json({ success: false, message: range.error });
        }

        const data = await getTrustInsights(range);
        return res.json({ success: true, data });
    } catch (error) {
        console.error('fetchTrustInsights failed:', error);
        return res.status(500).json({ success: false, message: 'Failed to load trust insights' });
    }
}

import { getTrustMemberLogins } from './trustMembers.service.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchTrustMemberLogins(req, res) {
    try {
        const { trustId } = req.params;

        if (!UUID_PATTERN.test(trustId)) {
            return res.status(400).json({ success: false, message: 'Invalid trust id' });
        }

        const data = await getTrustMemberLogins(trustId);
        if (!data) {
            return res.status(404).json({ success: false, message: 'Trust not found' });
        }

        return res.json({ success: true, data });
    } catch (error) {
        console.error('fetchTrustMemberLogins failed:', error);
        return res.status(500).json({ success: false, message: 'Failed to load member logins' });
    }
}

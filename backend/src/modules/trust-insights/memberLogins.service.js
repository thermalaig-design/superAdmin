import { supabase } from '../../config/supabase.js';

const PAGE_SIZE = 1000;
const ID_CHUNK = 100;
const MAX_ROWS_PER_CHUNK = 100000;

// member_session.trust_id is plain text (no foreign key), so it can't be embedded
// in the Trust query and is fetched separately.
async function fetchLoginRows(trustIds) {
    const rows = [];

    for (let from = 0; from < MAX_ROWS_PER_CHUNK; from += PAGE_SIZE) {
        const { data, error } = await supabase
            .from('member_session')
            .select('trust_id, members_id, action_at')
            .eq('action_type', 'login')
            .in('trust_id', trustIds)
            .order('id')
            .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        rows.push(...data);
        if (data.length < PAGE_SIZE) break;
    }

    return rows;
}

/**
 * All-time login stats per trust: distinct members who logged in, and the latest login.
 * Returns Map<trustId, { uniqueMembers, lastLoginAt }>.
 */
export async function getMemberLoginStats(trustIds) {
    const chunks = [];
    for (let i = 0; i < trustIds.length; i += ID_CHUNK) chunks.push(trustIds.slice(i, i + ID_CHUNK));

    const rows = (await Promise.all(chunks.map(fetchLoginRows))).flat();

    const stats = new Map();
    rows.forEach(({ trust_id: trustId, members_id: memberId, action_at: at }) => {
        const entry = stats.get(trustId) ?? { members: new Set(), lastLoginAt: null };
        if (memberId) entry.members.add(memberId);
        if (!entry.lastLoginAt || new Date(at) > new Date(entry.lastLoginAt)) entry.lastLoginAt = at;
        stats.set(trustId, entry);
    });

    return new Map(
        [...stats].map(([trustId, { members, lastLoginAt }]) => [trustId, { uniqueMembers: members.size, lastLoginAt }])
    );
}

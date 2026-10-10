import { apiGet } from '../../../lib/apiClient';

/**
 * GET /member-insights
 * Params: page, pageSize (10|25|50|100), sortBy ('createdAt'|'name'|'mobile'|'email'|'company'|'appDownloaded'),
 *         sort ('asc'|'desc'), search, trust (trust id), appDownload ('all'|'yes'|'no'),
 *         range ('today'|'7d'|'30d'|'custom', with from/to as YYYY-MM-DD) = only members who joined in that period.
 *
 * Response data:
 * {
 *   total, page, pageSize,
 *   members: [{ id, name, mobile, email, companyName, trustCount (active registrations),
 *               appDownloaded, createdAt }]
 * }
 */
export const fetchMembers = (params) => apiGet('/member-insights', params);

/**
 * GET /member-insights/growth?range=…  (same range params)
 * How many members joined per hour (one day) / day (up to ~2 months) / week, for the graph.
 * Response data: { period: { from, to }, granularity: 'hour'|'day'|'week', counts: [n, …], total }
 * counts[i] belongs to the bucket starting at period.from + i × (1 hour | 1 day | 7 days).
 */
export const fetchMemberGrowth = ({ range, from, to }) => apiGet('/member-insights/growth', { range, from, to });

/**
 * GET /member-insights/summary  (platform-wide, ignores the table's filters)
 * Response data: { totalMembers, appDownloaded, joinedToday, lastJoined: { name, trustName, createdAt } | null }
 */
export const fetchMemberSummary = () => apiGet('/member-insights/summary');

/** GET /member-insights/trusts -> [{ id, name }] for the trust filter dropdown. */
export const fetchTrustOptions = () => apiGet('/member-insights/trusts');

/**
 * GET /member-insights/:memberId/trusts
 * Every trust one member is registered in (the reg_members junction table).
 *
 * Response data:
 * {
 *   member: { id, name, mobile, email, companyName, createdAt },
 *   summary: { total, active, inactive },
 *   trusts: [{ registrationId, trustId, name, logoUrl, appType, role, membershipNumber,
 *              joinedDate, isActive, registeredAt, isPrimary, lastActivityAt (latest page visit in that trust, or null) }]
 * }
 */
export const fetchMemberTrusts = (memberId) => apiGet(`/member-insights/${memberId}/trusts`);

/**
 * GET /member-insights/:memberId/activity?trust=<trust id | 'all'>&range=…&target=…
 * One member's page activity for one of their trusts, or all of them. Same shape as the trust activity report, plus
 * { member, trusts: [{ id, name, isActive }] } and each recent row has trustId / trustName.
 */
export const fetchMemberActivity = (memberId, { trust, range, from, to, target }) =>
  apiGet(`/member-insights/${memberId}/activity`, { trust, range, from, to, target });

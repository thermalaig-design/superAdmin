import { apiGet } from '../../../lib/apiClient';

/**
 * GET /trust-insights
 * range: 'today' | '7d' | '30d' | 'custom' (custom needs from/to as YYYY-MM-DD)
 *
 * Response data:
 * {
 *   totalTrusts, createdToday,
 *   period: { count, from, to },
 *   lastTrust: { name, createdAt } | null,
 *   trusts: [{ id, name, logoUrl, appType, superUserName, superUserNumber, activityNumber, lastActivityAt,
 *             uniqueMemberLogins, lastMemberLoginAt, createdAt }]
 * }
 */
export const fetchTrustInsights = ({ range, from, to }) =>
  apiGet('/trust-insights', { range, from, to });

/**
 * GET /trust-insights/:trustId/activity
 * Same range params, plus user (user id) and target ('module:<name>' | 'page:<id>').
 *
 * Response data:
 * {
 *   trust: { id, name }, period: { from, to },
 *   filters: { users: [{ id, name }], modules: [name], pages: [{ id, name, module }] },
 *   summary: { totalActivities, activeDays, uniquePages, avgPerDay },
 *   trend: [{ date, count }], topRoutes: [{ route, name, count }],
 *   topModules: [{ module, count, percent }], byHour: [{ hour, count }],
 *   recent: [{ id, createdAt, user, pageName, route, module }]
 * }
 */
export const fetchTrustActivity = (trustId, { range, from, to, user, target }) =>
  apiGet(`/trust-insights/${trustId}/activity`, { range, from, to, user, target });

/**
 * GET /trust-insights/:trustId/members
 * Members who have logged in to the trust, each with their latest session event (all time).
 *
 * Response data:
 * {
 *   trust: { id, name }, total,
 *   members: [{ memberId, name, mobile, appPlatform, actionType, actionAt,
 *     actions: { today, yesterday, week, month, year } }]  // every session event, as recorded
 * }
 */
export const fetchTrustMemberLogins = (trustId) => apiGet(`/trust-insights/${trustId}/members`);

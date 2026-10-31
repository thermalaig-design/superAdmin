import { apiDelete, apiGet, apiPut } from '../../../lib/apiClient';

/**
 * GET /trust-insights
 * range: 'today' | '7d' | '30d' | 'custom' (custom needs from/to as YYYY-MM-DD)
 *
 * Response data:
 * {
 *   totalTrusts, createdToday,
 *   period: { count, from, to },
 *   lastTrust: { name, createdAt } | null,
 *   trusts: [{ id, name, logoUrl, appType, website, superUserName, superUserNumber, activityNumber, appActions, lastActivityAt,
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
 * GET /trust-insights/:trustId/member-actions
 * Same params and response as the activity above, but for the members using the trust's app (App Actions);
 * the user filter lists members, and the response adds topMembers: [{ id, name, count }].
 */
export const fetchTrustMemberActions = (trustId, { range, from, to, user, target }) =>
  apiGet(`/trust-insights/${trustId}/member-actions`, { range, from, to, user, target });

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

/**
 * Bank details (trust_bank_details, one per trust) and company details (columns on the Trust row); kind = 'bank' | 'company'.
 * GET returns the record (bank: null when none yet); PUT saves it (bank: creates or updates); DELETE removes
 * the bank details, or empties the company fields.
 */
export const fetchTrustDetails = (kind, trustId) => apiGet(`/trust-insights/${trustId}/${kind}-details`);
export const saveTrustDetails = (kind, trustId, values) => apiPut(`/trust-insights/${trustId}/${kind}-details`, values);
export const deleteTrustDetails = (kind, trustId) => apiDelete(`/trust-insights/${trustId}/${kind}-details`);

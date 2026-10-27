import { apiGet } from '../../../lib/apiClient';

/**
 * GET /registrations  (range: 'today' | '7d' | '30d' | 'custom' with from/to, plus search, page, pageSize)
 * The people who registered in the period, newest first. Response data: { total, page, pageSize,
 * registrations: [{ id, name, mobile, source, registeredAt, loggedIn, loginCount, firstLoginAt, appCount, actionCount }] }
 */
export const fetchRegistrations = ({ range, from, to, search, page, pageSize, campaign, source, platform, adSet, stage }) =>
  apiGet('/registrations', { range, from, to, search, page, pageSize, campaign, source, platform, adSet, stage });
// campaign / source / platform / adSet / stage: only the people behind one number of the dashboard's campaign table

/**
 * GET /registrations/:memberId/timeline
 * Everything one member did, newest first. Response data: { member: { id, name, mobile, source, registeredAt },
 * summary: { logins, apps, actions, appsVisited: [name] }, truncated,
 * events: [{ id, kind, title, detail, appName, at }] }  // kind: registered | login | logout | app_created | app_launched | page ...
 */
export const fetchRegistrationTimeline = (memberId) => apiGet(`/registrations/${memberId}/timeline`);

/**
 * GET /registrations/summary  (same range params)
 * The cards above the list. Response data: { leads, loggedIn, creators, apps }
 * (loggedIn / creators are people among the leads of the period; apps = apps they created)
 */
export const fetchRegistrationSummary = ({ range, from, to }) => apiGet('/registrations/summary', { range, from, to });

/** GET /registrations/campaigns  (range params, optional source) -> [{ label, leads }] for the Campaign filter */
export const fetchRegistrationCampaigns = ({ range, from, to, source }) => apiGet('/registrations/campaigns', { range, from, to, source });

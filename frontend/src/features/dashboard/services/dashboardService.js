import { apiGet } from '../../../lib/apiClient';

/**
 * GET /dashboard
 * range: 'today' | '7d' | '30d' | 'custom' (custom needs from/to as YYYY-MM-DD)
 *
 * Response data:
 * {
 *   period: { from, to },
 *   totals: { members, membersInPeriod, otpNotLogin, membersToday, appDownloaded, trusts, trustsInPeriod, trustsToday,
 *             leads, leadsInPeriod, leadsToday },
 *   activity: { total, byUsers, byMembers, setuAi, userPanel, otherApps },                 // page_activity rows in the period
 *   series: { members | trusts | activity | leads: { trend: [{ date, count }], byHour: [{ hour, count }] } },
 *   topTrusts: [{ id, name, count }],                        // busiest apps in the period
 *   leadChannels: [{ label, count }],                        // leads received in the period, by source
 *   leadConversion: { leads, withMobile, converted }         // converted = joined as a member after the lead came in
 *   funnel: { leads, withMobile, loggedIn, creators, apps, activeCreators, activeApps }  // each stage is a subset of the one before (people)
 *   sources: [{ key, label, platforms, leads, loggedIn, creators, apps, activeCreators, activeApps, actions, rank | null,
 *               sections: { funnel, campaigns, leadChannels, leadConversion } }]   // ad source cards; sections = the same four for that source
 *   activeApps: { scopeCounts: { all, meta, whatsapp, google, website, organic, unknown, direct }, apps: [{ id, name, owner, ownerMobile, createdAt, appActions, userPanel, score, logins, lastActiveAt,
 *                 firstLogin: { at, platform, method, city, state } | null,
 *                 cameFrom: { source, platform, campaign, adSet, receivedAt } | null }] }   // top 10 in the period, busiest first
 *   campaigns: [{ label, channels, leads, members, loggedIn, creators, apps, activeCreators, activeApps,
 *                platforms: [row], adSets: [row] }]       // per campaign; leads with no campaign are grouped by source
 * }
 * otpNotLogin: Members created in the range with exactly one reg_members row (SETU APP member)
 * and no all-time login matching members_id or the last 10 mobile digits.
 */
export const fetchDashboard = ({ range, from, to }) => apiGet('/dashboard', { range, from, to });

/**
 * GET /dashboard/active-apps?scope=…  (same range params)
 * scope: 'all' | 'meta' | 'whatsapp' | 'google' | 'website' | 'organic' | 'unknown' | 'direct' (owner came without an ad lead).
 * The top 10 apps ranked within that group. Response data: { apps: [same rows as dashboard.activeApps.apps],
 * scopeCounts: { all, meta, whatsapp, google, website, organic, unknown, direct } }  // apps with activity in the period, per group
 */
export const fetchActiveApps = ({ range, from, to, scope }) => apiGet('/dashboard/active-apps', { range, from, to, scope });

/**
 * GET /dashboard/campaign-leads  (same range params)
 * One page of the leads behind a campaign row, newest first. campaign is required; source ('meta' | 'whatsapp' | 'google' | 'website' |
 * 'organic'), platform, adSet and search (name or mobile number) narrow it. stage keeps only the people counted in that
 * column of the campaign table and adds summary { people, apps } to the response. sort ('asc' | 'desc') orders by the time the lead was received, newest first by default; pageSize is at most 100.
 * Response data: { total, page, pageSize, leads: [{ id, name, mobile, channel, adSet, receivedAt,
 *                  stage: 'lead' | 'member' | 'loggedIn' | 'app' | 'active' }] }
 */
export const fetchCampaignLeads = ({ range, from, to, campaign, source, platform, adSet, stage, search, page, pageSize, sort }) =>
  apiGet('/dashboard/campaign-leads', { range, from, to, campaign, source, platform, adSet, stage, search, page, pageSize, sort });

/**
 * GET /dashboard/app-journey?trustId=…  (same range params)
 * The detail behind one app's journey card. Response data: { appLink, appSlug, ownerMobile, joinedAt, downloaded, ownerSource,
 * modules: [{ label, count }] (where its users spend time), recent: [{ at, title, detail, kind, panel }], activityCount }
 */
export const fetchAppJourney = ({ trustId, range, from, to }) => apiGet('/dashboard/app-journey', { trustId, range, from, to });

/**
 * GET /dashboard/app-logins?trustId=…  (same range params, plus search, page, pageSize)
 * The login sessions behind an app's "App Logins" number, newest first. Response data: { trust: { id, name }, total, uniqueMembers,
 * page, pageSize, logins: [{ id, memberId, name, mobile, platform, method, city, state, device, at }] }
 */
export const fetchAppLogins = ({ trustId, range, from, to, search, page, pageSize }) =>
  apiGet('/dashboard/app-logins', { trustId, range, from, to, search, page, pageSize });

/**
 * GET /dashboard/otp-not-login  (same range params, plus status = all | notLoggedIn | loggedIn, source, campaign, search, sort, dir, page, pageSize)
 * The SETU app members behind the "OTP Not Login" card. Response data: { counts: { all, notLoggedIn, loggedIn }, total, sources: [{ key, label, count,
 * campaigns: [{ name, count, platforms: [{ label, count }] }] }], filteredTotal, page, pageSize,
 * people: [{ id, name, mobile, sourceKey, sourceLabel, platform, campaign, registeredAt, loggedIn }] }
 */
export const fetchOtpNotLogin = ({ range, from, to, status, source, campaign, search, sort, dir, page, pageSize }) =>
  apiGet('/dashboard/otp-not-login', { range, from, to, status, source, campaign, search, sort, dir, page, pageSize });

/**
 * GET /dashboard/new-apps  (same range params, plus source, search, sort, dir, page, pageSize)
 * The apps created in the period and who built them. Response data: { total, people, sources: [{ key, label, count }], filteredTotal, page, pageSize,
 * apps: [{ id, name, owner, ownerMobile, ownerMemberId, ownerApps, sourceKey, sourceLabel, platform, campaign, createdAt }] }
 */
export const fetchNewApps = ({ range, from, to, source, search, sort, dir, page, pageSize }) =>
  apiGet('/dashboard/new-apps', { range, from, to, source, search, sort, dir, page, pageSize });

/**
 * GET /dashboard/card-details  (same range params, plus card and source)
 * The rows behind one Platform Overview card for one lead source (omit source for all).
 * card: 'leads' | 'members' | 'notLogin' | 'loggedIn' | 'apps' | 'activity' | 'otherLogin' | 'setuActivity' | 'panelActivity' | 'otherActivity'.
 * Response data: { card, source, total, columns: [{ key, label, type }], rows: [{ …one value per column }] }
 * Logins and activity are grouped per person (and app) with a count; total is the card's number.
 */
export const fetchCardDetails = ({ range, from, to, card, source }) => apiGet('/dashboard/card-details', { range, from, to, card, source });

/**
 * GET /dashboard/app-products?trustId=…
 * Every product of one app, all time, newest first. Response data: { app: { id, name }, total, products: [{ id, name, category, status
 * ('active' | 'inactive' | 'draft'), price, mrp (only when higher than price), discountPct, billing, memberPrice, image (url | null), imageCount, createdAt }] }
 */
export const fetchAppProducts = ({ trustId }) => apiGet('/dashboard/app-products', { trustId });

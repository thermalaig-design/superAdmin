import { apiGet, apiPut } from '../../../lib/apiClient';

/**
 * GET /targets/campaigns
 * The campaigns with spend in the last 14 days. Response data: [{ id, name, platform: 'Meta' | 'Google', status, dailyBudget, spend, leads,
 * adSets: [{ id, name, leads, saved: { target, previousTarget, dailyBudget, alerts } | null }] }]
 * (a campaign whose leads carry no ad set has one entry with id '' and name null: the target is for the whole campaign)
 */
export const fetchTargetCampaigns = () => apiGet('/targets/campaigns');

/**
 * GET /targets/history  (window: 'today' | '14d' | '30d')
 * What each ad set cost and brought in over the window. Response data: { window, items: { 'campaignId:adSetId': { spend, leads, registrations,
 * logins, apps, costPerRegistration, costPerLogin, costPerApp } } }
 */
export const fetchTargetHistory = (window) => apiGet('/targets/history', { window });

/** PUT /targets/adsets { items: [{ campaignId, adSetId, target, dailyBudget, alerts }] } -> { saved } */
export const saveAdSetTargets = (items) => apiPut('/targets/adsets', { items });

/**
 * Sample numbers for the Targets pages (there is no backend for them yet). Replace `fetchTargetData` with a real API
 * call later: it only has to return { lastUpdate, budget, registrationsChange, campaigns: [{ id, spend, installs, registrations, logins, apps }] }.
 */

export const PERIODS = [
  { value: 'today', label: 'Last 24 hours', days: 1 }, // the key stays 'today' (saved view state); it means the last 24 hours
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '14d', label: 'Last 14 days', days: 14 },
  { value: 'month', label: 'This month', days: 30 },
];

export const CAMPAIGNS = [
  { id: 'google-app-india', name: 'Google App · India', platform: 'Google', test: false, adSets: [
    { id: 'google-app-search', name: 'App Install · Search' },
    { id: 'google-app-display', name: 'App Install · Display' },
  ] },
  { id: 'meta-app-promotion', name: 'Meta App Promotion', platform: 'Meta', test: false, adSets: [
    { id: 'meta-facebook', name: 'Facebook' },
    { id: 'meta-instagram', name: 'Instagram' },
  ] },
  { id: 'google-lead-form', name: 'Google Lead Form', platform: 'Google', test: false, adSets: [
    { id: 'google-lead-search', name: 'Lead Form · Search' },
  ] },
];

// Last 7 days. Lead Form has no installs (it is a lead form, not an app install campaign).
const LAST_7_DAYS = {
  'google-app-india': { spend: 7000, installs: 1150, registrations: 600, logins: 500, apps: 160, adSets: [
    { id: 'google-app-search', spend: 4200, installs: 700, registrations: 360, logins: 300, apps: 95 },
    { id: 'google-app-display', spend: 2800, installs: 450, registrations: 240, logins: 200, apps: 65 },
  ] },
  'meta-app-promotion': { spend: 3500, installs: 140, registrations: 92, logins: 75, apps: 26, adSets: [
    { id: 'meta-facebook', spend: 2100, installs: 84, registrations: 55, logins: 45, apps: 16 },
    { id: 'meta-instagram', spend: 1400, installs: 56, registrations: 37, logins: 30, apps: 10 },
  ] },
  'google-lead-form': { spend: 1000, installs: null, registrations: 10, logins: 8, apps: 2, adSets: [
    { id: 'google-lead-search', spend: 1000, installs: null, registrations: 10, logins: 8, apps: 2 },
  ] },
};

// How the other periods compare with the last 7 days; slightly different per number so the colours can move a little.
const SCALE = {
  today: { spend: 0.14, installs: 0.15, registrations: 0.13, logins: 0.13, apps: 0.16, budget: 2000, change: 8 },
  '7d': { spend: 1, installs: 1, registrations: 1, logins: 1, apps: 1, budget: 14000, change: 12 },
  '14d': { spend: 2, installs: 1.95, registrations: 2.05, logins: 2.05, apps: 2.1, budget: 28000, change: 9 },
  month: { spend: 4.2, installs: 4.1, registrations: 4.4, logins: 4.4, apps: 4.5, budget: 58800, change: 15 },
};

export function fetchTargetData(period) {
  const scale = SCALE[period] ?? SCALE['7d'];
  const scaled = (value, factor) => (value === null ? null : Math.round(value * factor));

  return {
    lastUpdate: 'today 6:00 am',
    budget: scale.budget,
    registrationsChange: scale.change, // % vs the period before
    campaigns: CAMPAIGNS.map(({ id }) => {
      const base = LAST_7_DAYS[id];
      return {
        id,
        spend: scaled(base.spend, scale.spend),
        installs: scaled(base.installs, scale.installs),
        registrations: scaled(base.registrations, scale.registrations),
        logins: scaled(base.logins, scale.logins),
        apps: scaled(base.apps, scale.apps),
        adSets: base.adSets?.map((adSet) => ({
          ...adSet,
          spend: scaled(adSet.spend, scale.spend),
          installs: scaled(adSet.installs, scale.installs),
          registrations: scaled(adSet.registrations, scale.registrations),
          logins: scaled(adSet.logins, scale.logins),
          apps: scaled(adSet.apps, scale.apps),
        })),
      };
    }),
  };
}

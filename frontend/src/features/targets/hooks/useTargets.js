import { useSyncExternalStore } from 'react';

import { CAMPAIGNS } from '../utils/sampleData';

const STORAGE_KEY = 'setu:targets:v1';

export const ALERT_OPTIONS = [
  { value: 'both', label: 'WhatsApp + Email' },
  { value: 'whatsapp', label: 'WhatsApp only' },
  { value: 'email', label: 'Email only' },
  { value: 'none', label: 'No alerts' },
];

const CAMPAIGN_DEFAULTS = {
  'google-app-india': { target: 40, dailyBudget: 1000 },
  'meta-app-promotion': { target: 140, dailyBudget: 500 },
  'google-lead-form': { target: 140, dailyBudget: 140 },
};

const AD_SET_DEFAULTS = {
  'google-app-india': {
    'google-app-search': { target: 40, dailyBudget: 500, minApps: 15, alerts: 'both' },
    'google-app-display': { target: 40, dailyBudget: 300, minApps: 15, alerts: 'both' },
  },
  'meta-app-promotion': {
    'meta-facebook': { target: 140, dailyBudget: 300, minApps: 15, alerts: 'both' },
    'meta-instagram': { target: 140, dailyBudget: 200, minApps: 15, alerts: 'both' },
  },
  'google-lead-form': {
    'google-lead-search': { target: 140, dailyBudget: 140, minApps: 1, alerts: 'both' },
  },
};

export const DEFAULT_TARGETS = {
  overall: 60,
  campaigns: Object.fromEntries(
    CAMPAIGNS.map(({ id, adSets = [] }) => [id, {
      ...CAMPAIGN_DEFAULTS[id], minApps: 15, alerts: 'both',
      adSets: Object.fromEntries(adSets.map(({ id: adSetId }) => [adSetId, AD_SET_DEFAULTS[id]?.[adSetId] ?? { ...CAMPAIGN_DEFAULTS[id], minApps: 15, alerts: 'both' }])),
    }])
  ),
};

// Targets live in localStorage for now. Both pages read them through this one store, so a save shows up everywhere at once.
const listeners = new Set();
let memory = null; // used when storage is unavailable
let lastRaw;
let lastValue = DEFAULT_TARGETS;

/** Saved values over the defaults, so a campaign added later still gets its defaults. */
function withDefaults(saved) {
  return {
    overall: Number(saved?.overall) > 0 ? Number(saved.overall) : DEFAULT_TARGETS.overall,
    campaigns: Object.fromEntries(
      CAMPAIGNS.map(({ id, adSets = [] }) => {
        const campaign = { ...DEFAULT_TARGETS.campaigns[id], ...(saved?.campaigns?.[id] ?? {}) };
        campaign.dailyBudget = Math.min(1000, Math.max(0, Number(campaign.dailyBudget) || 0));
        campaign.adSets = Object.fromEntries(adSets.map(({ id: adSetId }) => {
          const adSet = { ...DEFAULT_TARGETS.campaigns[id].adSets[adSetId], ...(saved?.campaigns?.[id]?.adSets?.[adSetId] ?? {}) };
          adSet.dailyBudget = Math.min(1000, Math.max(0, Number(adSet.dailyBudget) || 0));
          return [adSetId, adSet];
        }));
        return [id, campaign];
      })
    ),
  };
}

function getSnapshot() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = memory;
  }
  if (raw !== lastRaw) {
    lastRaw = raw;
    try {
      lastValue = raw ? withDefaults(JSON.parse(raw)) : DEFAULT_TARGETS;
    } catch {
      lastValue = DEFAULT_TARGETS;
    }
  }
  return lastValue;
}

function subscribe(listener) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function save(next) {
  const raw = JSON.stringify(next);
  memory = raw;
  try {
    localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // kept in memory for this visit
  }
  listeners.forEach((listener) => listener());
}

/** { targets, saveTargets(next), resetTargets() }: the saved targets, shared by the scorecard and the settings page. */
export function useTargets() {
  const targets = useSyncExternalStore(subscribe, getSnapshot);
  return { targets, saveTargets: save, resetTargets: () => save(DEFAULT_TARGETS) };
}

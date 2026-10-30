/** "₹14,000". Small amounts keep one decimal ("₹18.9"), everything from ₹20 up is whole rupees. */
export function money(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const rounded = value < 20 ? Math.round(value * 10) / 10 : Math.round(value);
  return `₹${rounded.toLocaleString('en-IN')}`;
}

/** Preserve paise so the platform spend breakdown adds up to the displayed total. */
export const spendMoney = (value) => Number.isFinite(value) ? `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

export const count = (value) => (value === null || value === undefined ? '–' : value.toLocaleString('en-IN'));

const divide = (a, b) => (b > 0 && Number.isFinite(a) ? a / b : null);

/** Green: at or below target. Yellow: up to 2x target. Red: above 2x, or money spent and no app made. */
export const STATUS = {
  green: { label: 'Good', short: 'At or below target', range: 'At or below target', color: 'var(--c-good)', bg: 'var(--c-good-bg)', order: 0 },
  yellow: { label: 'Watch', short: 'Up to 2x target', range: 'Up to 2x target', color: 'var(--c-warn-text)', bg: 'var(--c-warn-bg)', order: 1 },
  red: { label: 'Too costly', short: 'Above 2x target', range: 'Above 2x target', color: 'var(--c-bad-text)', bg: 'var(--c-bad-bg)', order: 2 },
};

export function statusOf(cost, target, spend = 0) {
  if (cost === null) return spend > 0 ? 'red' : null;
  if (!(target > 0)) return null;
  if (cost <= target) return 'green';
  return cost <= target * 2 ? 'yellow' : 'red';
}

/** What a campaign's colour means and what to do about it (shown in the scorecard's detail panel). */
export const ADVICE = {
  green: 'Green: it costs no more than the target. The budget can go up a little, in small steps.',
  yellow: 'Yellow: it costs more than the target, but less than double. Test one new video or hook, one change at a time.',
  red: 'Red: it costs more than double the target, or it spent money and made no app. Pause it or fix it.',
};

/** One campaign's numbers for a period, with the costs worked out from them. */
export function describeCampaign(campaign, raw, target, adSetTargets = {}) {
  const costPerApp = divide(raw.spend, raw.apps);
  return {
    ...campaign,
    ...raw,
    target,
    costPerRegistration: divide(raw.spend, raw.registrations),
    costPerLogin: divide(raw.spend, raw.logins),
    costPerApp,
    appsConnected: raw.apps !== null && raw.apps !== undefined,
    status: raw.apps == null ? null : statusOf(costPerApp, target, raw.spend),
    adSets: (raw.adSets ?? []).map((adSet) => {
      const adSetInfo = campaign.adSets?.find(({ id }) => id === adSet.id) ?? {};
      const adSetTarget = adSetTargets[adSet.id]?.target ?? target;
      const adSetCostPerApp = divide(adSet.spend, adSet.apps);
      return {
        ...adSetInfo,
        ...adSet,
        target: adSetTarget,
        costPerRegistration: divide(adSet.spend, adSet.registrations),
        costPerLogin: divide(adSet.spend, adSet.logins),
        costPerApp: adSetCostPerApp,
        status: adSet.apps == null || adSet.spend == null ? null : statusOf(adSetCostPerApp, adSetTarget, adSet.spend),
      };
    }),
  };
}

/**
 * The scorecard rows from the server's overview (leadExpense) and the campaigns with their saved targets (adset_targets).
 * A campaign's target is the average of its ad sets' saved targets; without any it is the overall target.
 */
export function buildRows(overview, savedCampaigns, overallTarget) {
  const rows = (overview?.campaigns ?? []).map((campaign) => {
    const saved = savedCampaigns?.find(({ id }) => id === campaign.id);
    const adSetTargets = Object.fromEntries([...(campaign.savedTargets ?? []), ...(saved?.adSets ?? [])].filter((adSet) => adSet.saved).map((adSet) => [adSet.id, adSet.saved]));
    const values = Object.values(adSetTargets).map(({ target }) => target).filter((target) => target > 0);
    const target = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : overallTarget;

    const raw = {
      spend: campaign.spend,
      installs: null,
      registrations: campaign.registrations,
      logins: null,
      apps: campaign.apps ?? null,
      knownApps: campaign.knownApps ?? 0,
      appsIncomplete: campaign.appsIncomplete,
      unassignedPlatformApps: campaign.unassignedPlatformApps ?? 0,
      approximate: overview.period?.dailySpendApproximate ?? false,
      adSets: (campaign.adSets ?? []).map((adSet) => ({ ...adSet, installs: null, logins: null })),
    };
    return describeCampaign({ id: campaign.id, name: campaign.name, platform: campaign.platform }, raw, target, adSetTargets);
  });

  const sum = (key) => rows.reduce((total, row) => total + (row[key] ?? 0), 0);
  const total = {
    spend: sum('spend'), installs: null, registrations: sum('registrations'), apps: overview?.apps?.total ?? null,
    approximate: overview?.period?.dailySpendApproximate ?? false,
    spendByPlatform: Object.fromEntries(['Meta', 'Google'].map((platform) => [platform, rows.filter((row) => row.platform === platform).reduce((value, row) => value + row.spend, 0)])),
  };
  const costPerApp = divide(total.spend, total.apps);

  return {
    rows,
    totals: {
      ...total,
      costPerRegistration: divide(total.spend, total.registrations),
      costPerApp,
      target: overallTarget,
      status: total.apps === null ? null : statusOf(costPerApp, overallTarget, total.spend),
    },
  };
}

/** The words next to the main card's coloured dot. */
export function overallVerdict(cost, target) {
  if (cost === null || !(target > 0)) return { text: 'no apps yet', status: cost === null ? 'red' : null };
  if (cost <= target) return { text: 'on target', status: 'green' };
  if (cost <= target * 1.25) return { text: 'slightly above', status: 'yellow' };
  if (cost <= target * 2) return { text: 'above target', status: 'yellow' };
  return { text: 'more than 2x target', status: 'red' };
}

/** Percentage of a over b, e.g. "27%"; "—" when it cannot be worked out. */
export function share(a, b) {
  return b > 0 && a !== null && a !== undefined ? `${Math.round((a / b) * 100)}%` : '—';
}

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useBlocker, useParams } from 'react-router-dom';

import AdSetCard from '../components/AdSetCard';
import CampaignTargetCard from '../components/CampaignTargetCard';
import KpiCard from '../components/KpiCard';
import { PlatformTile } from '../components/PlatformCard';
import { useTargetCampaigns, useTargetHistory } from '../hooks/useTargetCampaigns';
import { useTargetsView } from '../hooks/useTargetsView';
import { saveAdSetTargets } from '../services/targetsService';
import { money } from '../utils/targetMath';

const buttonBase = 'h-10 cursor-pointer whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-accent) disabled:cursor-not-allowed disabled:opacity-50';
const primary = `${buttonBase} bg-gradient-to-r from-(--c-grad-from) via-(--c-grad-via) to-(--c-grad-to) text-white shadow-[0_2px_8px_rgba(15,120,110,0.35)] hover:brightness-110`;
const secondary = `${buttonBase} border border-gray-300 bg-white text-(--c-text-2) hover:bg-gray-50`;
const WINDOWS = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '14d', label: 'Last 14 days' },
  { value: '30d', label: 'Last 30 days' },
];
const PLATFORM_TABS = [
  { value: null, label: 'All' },
  { value: 'Meta', label: 'Meta' },
  { value: 'Google', label: 'Google' },
];

const keyOf = (campaignId, adSetId) => `${campaignId}:${adSetId}`;
const isNumber = (text) => String(text).trim() !== '' && Number.isFinite(Number(text));

/** What the boxes of an ad set show before anything is typed: its saved target, or empty boxes (a lone ad set starts from the campaign budget). */
function startValues(campaign, adSet) {
  if (adSet.saved) {
    const { target, dailyBudget, alerts } = adSet.saved;
    return { target: String(target), dailyBudget: String(dailyBudget), alerts };
  }
  return { target: '', dailyBudget: campaign.adSets.length === 1 && campaign.dailyBudget != null ? String(campaign.dailyBudget) : '', alerts: 'both' };
}

function validate(values) {
  const errors = {};
  if (!isNumber(values.target) || Number(values.target) <= 0) errors.target = 'Enter an amount above ₹0.';
  if (!isNumber(values.dailyBudget) || Number(values.dailyBudget) < 0) errors.dailyBudget = 'Enter an amount of ₹0 or more.';
  return errors;
}

/** A small confirmation box over the page. */
function Dialog({ title, text, confirmLabel, cancelLabel, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation" onMouseDown={onCancel}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" className="animate-pop w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.3)]" onMouseDown={(event) => event.stopPropagation()}>
        <h2 id="dialog-title" className="text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm text-(--c-text-3)">{text}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={secondary} autoFocus>{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className={primary}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/** A numbered section title. */
function Step({ number, title, text, children }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-(--c-grad-from) to-(--c-grad-to) text-sm font-bold text-white shadow-[0_4px_10px_rgba(15,120,110,0.35)]">{number}</span>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold leading-tight">{title}</h2>
        <p className="text-xs text-(--c-muted)">{text}</p>
      </div>
      {children}
    </div>
  );
}

/**
 * Set Targets. The running campaigns come from leadExpense; a campaign has the ad sets found on its leads. Cards are read only
 * (what a campaign spent and brought in, and the totals of its targets); the forms inside the ad set cards are what can be edited
 * (saved in the adset_targets table).
 */
function TargetSettingsPage() {
  const queryClient = useQueryClient();
  const { campaignId } = useParams();
  const [view, setView] = useTargetsView(); // the platform chosen here or in the top bar narrows the list
  const { data: campaigns, loading, error } = useTargetCampaigns();
  const [windowKey, setWindowKey] = useState('14d'); // the period of the previous data: today, 14 or 30 days
  const { data: history, loading: historyLoading } = useTargetHistory(windowKey);
  const windowLabel = WINDOWS.find(({ value }) => value === windowKey).label;

  // only the ad sets that were changed are kept here (key = campaign:adSet); the rest show what is saved
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  const valuesOf = (campaign, adSet) => edits[keyOf(campaign.id, adSet.id)] ?? startValues(campaign, adSet);

  const edit = (campaign, adSet, field, value) => {
    setSaved(false);
    setSaveError('');
    const key = keyOf(campaign.id, adSet.id);
    setEdits((current) => ({ ...current, [key]: { ...(current[key] ?? startValues(campaign, adSet)), [field]: value } }));
  };

  const revert = (campaign, adSet) =>
    setEdits((current) => {
      const next = { ...current };
      delete next[keyOf(campaign.id, adSet.id)];
      return next;
    });

  const errorsOf = useMemo(() => Object.fromEntries(Object.entries(edits).map(([key, values]) => [key, validate(values)])), [edits]);
  const editedCount = Object.keys(edits).length;
  const dirty = editedCount > 0;
  const invalid = Object.values(errorsOf).some((found) => Object.keys(found).length > 0);

  // leaving with unsaved changes asks first (links inside the app, and closing the tab)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = async () => {
    if (invalid || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      const items = Object.entries(edits).map(([key, values]) => {
        const [campaign, ...rest] = key.split(':');
        return { campaignId: campaign, adSetId: rest.join(':'), target: Number(values.target), dailyBudget: Number(values.dailyBudget), alerts: values.alerts };
      });
      await saveAdSetTargets(items);
      await queryClient.invalidateQueries({ queryKey: ['target-campaigns'] });
      setEdits({});
      setSaved(true);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // the campaign card: totals of its ad sets' boxes (what is typed counts at once)
  const totalsOf = (campaign) => {
    const all = campaign.adSets.map((adSet) => valuesOf(campaign, adSet));
    const sum = (field) => all.reduce((total, values) => total + (isNumber(values[field]) ? Number(values[field]) : 0), 0);
    const hasBudget = all.some((values) => isNumber(values.dailyBudget));
    const hasTarget = all.some((values) => isNumber(values.target));
    return {
      target: hasTarget ? sum('target') : 0,
      dailyBudget: hasBudget ? sum('dailyBudget') : campaign.dailyBudget,
    };
  };

  const highlighted = campaigns?.find(({ id }) => id === campaignId) ?? null;
  if (campaigns && campaignId && !highlighted) return <Navigate to="/targets/set-target" replace />;

  const visible = (campaigns ?? []).filter((campaign) => (highlighted ? campaign.id === highlighted.id : !view.platform || campaign.platform === view.platform));
  // what a campaign spent and brought in over the chosen window (its ad sets added up); the 14-day figures stand in until it arrives
  const statsOf = (campaign) => {
    if (!history) return { spend: campaign.spend, leads: campaign.leads };
    const items = campaign.adSets.map((adSet) => history.items[keyOf(campaign.id, adSet.id)]).filter(Boolean);
    return { spend: items.reduce((total, item) => total + item.spend, 0), leads: items.reduce((total, item) => total + item.leads, 0) };
  };
  const adSetCount = visible.reduce((total, campaign) => total + campaign.adSets.length, 0);
  const totalSpend = visible.reduce((total, campaign) => total + statsOf(campaign).spend, 0);
  const totalLeads = visible.reduce((total, campaign) => total + statsOf(campaign).leads, 0);
  const setCount = visible.reduce((total, campaign) => total + campaign.adSets.filter((adSet) => adSet.saved).length, 0);

  const renderCampaign = (campaign) => (
    <div key={campaign.id} className="flex flex-col gap-4">
      <CampaignTargetCard campaign={campaign} totals={totalsOf(campaign)} stats={statsOf(campaign)} windowLabel={windowLabel} highlighted={highlighted?.id === campaign.id} />
      <div className="stagger grid grid-cols-1 gap-4 lg:grid-cols-2">
        {campaign.adSets.map((adSet) => {
          const key = keyOf(campaign.id, adSet.id);
          return (
            <AdSetCard
              key={key}
              campaign={campaign}
              adSet={adSet}
              values={valuesOf(campaign, adSet)}
              errors={errorsOf[key] ?? {}}
              edited={key in edits}
              history={history?.items[key]}
              historyLoading={historyLoading}
              windowLabel={windowLabel}
              onChange={(field, value) => edit(campaign, adSet, field, value)}
              onRevert={() => revert(campaign, adSet)}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-7">
      {/* hero */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-(--c-grad-from) via-(--c-grad-via) to-(--c-grad-to) px-6 py-7 text-white shadow-[0_14px_34px_rgba(15,120,110,0.32)] md:px-8">
        <span className="animate-float pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-white/10" aria-hidden="true" />
        <span className="animate-float pointer-events-none absolute -bottom-20 right-28 h-40 w-40 rounded-full bg-white/10 [animation-delay:-3s]" aria-hidden="true" />
        <span className="animate-float pointer-events-none absolute left-1/3 top-2 h-16 w-16 rounded-full bg-white/10 [animation-delay:-5s]" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/80">Targets</p>
            <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold tracking-tight">
              {highlighted ? (
                <>
                  <PlatformTile platform={highlighted.platform} className="h-10 w-10 shrink-0 rounded-xl bg-white/20" />
                  <span className="truncate">{highlighted.name}</span>
                </>
              ) : (
                'Set Targets'
              )}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-white/85">
              {highlighted ? (
                <>
                  Only this campaign is shown.{' '}
                  <Link to="/targets/set-target" className="font-semibold underline underline-offset-2">Show all targets</Link>
                </>
              ) : (
                'Pick a cost per app for each ad set. Cards show what is running; the forms are where you change things.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || invalid || saving}
            className="h-11 cursor-pointer rounded-full bg-white px-6 text-sm font-bold text-(--c-link) shadow-[0_6px_16px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(0,0,0,0.22)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {saving ? 'Saving…' : dirty ? `Save ${editedCount} ${editedCount === 1 ? 'change' : 'changes'}` : 'Save targets'}
          </button>
        </div>
      </header>

      {saved && (
        <p role="status" className="animate-reveal rounded-xl border border-(--c-good)/30 bg-(--c-good-bg) px-4 py-3 text-sm font-medium text-(--c-good-text)">
          ✓ Targets saved.
        </p>
      )}
      {(error || saveError) && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError || error}</p>
      )}

      {/* the numbers at a glance */}
      <div className="stagger grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <KpiCard accent="var(--c-c1)" label="Campaigns" value={loading && !campaigns ? null : visible.length} hint="Running in the last 14 days" />
        <KpiCard accent="var(--c-c4)" label="Ad sets" value={loading && !campaigns ? null : adSetCount} hint={`${setCount} with a target set`} />
        <KpiCard accent="var(--c-c2)" label="Spend" value={loading && !campaigns ? null : totalSpend} format={money} hint={windowLabel} />
        <KpiCard accent="var(--c-c3)" label="Leads" value={loading && !campaigns ? null : totalLeads} hint={windowLabel} />
      </div>

      {/* campaigns and their ad sets */}
      <section className="flex flex-col gap-5">
        <Step number="1" title="Campaign targets" text="Each campaign card is read only; set the target, budget and alerts in its ad set forms below it. The period buttons change the previous data.">
          <div className="flex gap-1 rounded-xl bg-(--c-band) p-1" role="group" aria-label="Period of the previous data">
            {WINDOWS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setWindowKey(value)}
                aria-pressed={windowKey === value}
                className={`flex h-8 cursor-pointer items-center rounded-lg px-3 text-sm font-semibold transition ${
                  windowKey === value ? 'bg-white text-(--c-link) shadow-sm' : 'text-(--c-text-3) hover:text-(--c-text)'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {!highlighted && (
            <div className="flex gap-1 rounded-xl bg-(--c-band) p-1" role="group" aria-label="Filter by platform">
              {PLATFORM_TABS.map(({ value, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setView({ platform: value })}
                  aria-pressed={view.platform === value}
                  className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition ${
                    view.platform === value ? 'bg-white text-(--c-link) shadow-sm' : 'text-(--c-text-3) hover:text-(--c-text)'
                  }`}
                >
                  {value && <PlatformTile platform={value} className="h-4 w-4 rounded [&_svg]:h-3 [&_svg]:w-3" />}
                  {label}
                </button>
              ))}
            </div>
          )}
        </Step>

        <div className="flex flex-wrap gap-2 text-[0.7rem] font-semibold text-(--c-text-3)">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-(--c-band) px-3 py-1">▣ Cards · read only</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-(--c-accent-soft) px-3 py-1 text-(--c-link)">✎ Forms · editable</span>
        </div>

        {loading && !campaigns && <div className="h-48 animate-pulse rounded-3xl bg-gray-100" />}
        {campaigns && visible.length === 0 && (
          <p className="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center text-sm text-(--c-muted)">No running campaigns {view.platform ? `on ${view.platform} ` : ''}in the last 14 days.</p>
        )}

        {highlighted
          ? visible.map(renderCampaign)
          : ['Meta', 'Google'].map((platform) => {
              const group = visible.filter((campaign) => campaign.platform === platform);
              if (group.length === 0) return null;
              return (
                <div key={platform} className="flex flex-col gap-5">
                  <div className="flex items-center gap-3">
                    <PlatformTile platform={platform} className="h-8 w-8 rounded-lg" />
                    <h3 className="text-base font-bold">{platform}</h3>
                    <span className="rounded-full bg-(--c-band) px-2.5 py-0.5 text-xs font-semibold text-(--c-text-3)">{group.length} {group.length === 1 ? 'campaign' : 'campaigns'}</span>
                    <span className="h-px flex-1 bg-(--c-border)" aria-hidden="true" />
                  </div>
                  {group.map(renderCampaign)}
                </div>
              );
            })}
      </section>

      {dirty && (
        <div className="animate-pop sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-(--c-accent)/40 bg-white px-5 py-3 shadow-[0_12px_32px_rgba(20,33,61,0.2)] sm:flex-row sm:items-center sm:justify-between" role="region" aria-label="Unsaved changes">
          <p className="text-sm font-semibold">
            {editedCount} unsaved {editedCount === 1 ? 'change' : 'changes'}
            {invalid && <span className="ml-2 font-medium text-(--c-bad-text)">· fix the red boxes to save</span>}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEdits({})} className={secondary}>Discard</button>
            <button type="button" onClick={save} disabled={invalid || saving} className={primary}>{saving ? 'Saving…' : 'Save targets'}</button>
          </div>
        </div>
      )}

      {blocker.state === 'blocked' && (
        <Dialog
          title="Leave without saving?"
          text="You have changes that are not saved yet. If you leave now they will be lost."
          confirmLabel="Leave"
          cancelLabel="Stay"
          onCancel={() => blocker.reset()}
          onConfirm={() => blocker.proceed()}
        />
      )}
    </div>
  );
}

export default TargetSettingsPage;

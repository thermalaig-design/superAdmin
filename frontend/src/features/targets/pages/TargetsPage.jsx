import { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import PlatformCard, { PlatformTile } from '../components/PlatformCard';
import Scorecard from '../components/Scorecard';
import StatTile from '../components/StatTile';
import StatusLegend from '../components/StatusLegend';
import { useTargets } from '../hooks/useTargets';
import { useTargetsView } from '../hooks/useTargetsView';
import { CAMPAIGNS, PERIODS } from '../utils/sampleData';
import { todayInBusinessTz } from '../../../utils/businessDate';
import { buildRows, count, money, overallVerdict, share, STATUS } from '../utils/targetMath';

const card = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]';
const gradientButton =
  'inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-r from-(--c-grad-from) via-(--c-grad-via) to-(--c-grad-to) px-4 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(15,120,110,0.35)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-accent)';

const PLATFORM_FILTERS = [{ value: null, label: 'All' }, { value: 'Meta', label: 'Meta' }, { value: 'Google', label: 'Google' }];

/** The Registrations page for a Targets period (it knows today / 7d / 30d / custom, so 14 days goes as a custom range). */
function registrationsLink(period) {
  if (period === 'today') return '/registrations?range=today';
  if (period === 'month') return '/registrations?range=30d';
  if (period === '14d') {
    const to = todayInBusinessTz();
    const from = new Date(Date.parse(`${to}T00:00:00Z`) - 13 * 86400000).toISOString().slice(0, 10);
    return `/registrations?range=custom&from=${from}&to=${to}`;
  }
  return '/registrations?range=7d';
}

const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

/**
 * Targets and Scorecard: how much it costs to get one business app created, overall and per campaign.
 * /targets/<campaign> opens that campaign's row in the scorecard (this is what clicking a platform card does).
 */
function TargetsPage() {
  const { targets } = useTargets();
  const navigate = useNavigate();
  const { campaignId } = useParams();
  const selectedId = CAMPAIGNS.some(({ id }) => id === campaignId) ? campaignId : null;

  const { hash, key } = useLocation();
  // period and the platform / colour filters are shared with the top bar menu
  const [view, setView] = useTargetsView();
  const { period, platform: platformFilter, status: statusFilter } = view;
  const setPlatformFilter = (platform) => setView({ platform });
  const setStatusFilter = (status) => setView({ status });

  const { rows, data, totals } = useMemo(() => buildRows(period, targets), [period, targets]);

  // the colour chips count the campaigns of the chosen platform
  const platformRows = platformFilter ? rows.filter((row) => row.platform === platformFilter) : rows;
  const countOf = useMemo(() => {
    const tally = { green: 0, yellow: 0, red: 0 };
    platformRows.forEach((row) => {
      if (row.status) tally[row.status] += 1;
    });
    return tally;
  }, [platformRows]);
  const shown = statusFilter ? platformRows.filter((row) => row.status === statusFilter) : platformRows;

  // arriving at /targets/<campaign> or /targets#section (from the top bar menu): bring that place into view
  useEffect(() => {
    const id = selectedId ? `row-${selectedId}` : hash.slice(1);
    if (!id) return undefined;
    const timer = setTimeout(() => scrollToId(id), 120);
    return () => clearTimeout(timer);
  }, [selectedId, hash, key]);

  const choose = (id) => {
    if (id === selectedId) scrollToId(`row-${id}`);
    else navigate(`/targets/${id}`);
  };

  const verdict = overallVerdict(totals.costPerApp, targets.overall);
  const change = data.registrationsChange;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {/* header */}
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Targets and Scorecard</h1>
            <span className="rounded-full bg-(--c-accent-soft) px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-(--c-link)">Sample data</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-(--c-text-2)" title="Change the period from the top bar">
            {PERIODS.find(({ value }) => value === period)?.label}
          </span>
          <Link to="/targets/set-target" onClick={() => setView({ platform: null })} className={gradientButton}>
            Set Targets <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      {/* five headline cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Spend" value={money(totals.spend)} tip="Money spent on ads in this period, across all campaigns." />
        <StatTile
          label="Registrations"
          value={count(totals.registrations)}
          tip="People who registered in the app after seeing an ad."
          to={registrationsLink(period)}
          action="See who registered"
        >
          <b style={{ color: change >= 0 ? 'var(--c-good)' : 'var(--c-bad-text)' }}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
          </b>{' '}
          vs the period before
        </StatTile>
        <StatTile label="Cost / Registration" value={money(totals.costPerRegistration)} tip="Spend ÷ registrations. Useful to know, but it is not the target." />
        <StatTile label="Business apps created" value={count(totals.apps)} tip="Registered users who went on to build a business app.">
          {share(totals.apps, totals.registrations)} of registered users built one
        </StatTile>
        <StatTile
          featured
          label="★ Cost / App"
          value={money(totals.costPerApp)}
          tip="Spend ÷ apps created. Lower is better. This is the number the whole page is about."
          onClick={() => scrollToId('platform-vs-target')}
          action="See cost per app by platform"
        >
          <span className="flex flex-wrap items-center gap-x-1.5">
            Target {money(targets.overall)} ·
            <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: verdict.status ? STATUS[verdict.status].color : undefined }}>
              <span className="h-2 w-2 rounded-full" style={{ background: verdict.status ? STATUS[verdict.status].color : 'var(--c-faint)' }} aria-hidden="true" />
              {verdict.text}
            </span>
          </span>
        </StatTile>
      </div>

      {/* platform vs target */}
      <section id="platform-vs-target" className={`${card} scroll-mt-24`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-lg font-bold">Platform vs Target</h2>
            <p className="mt-1 text-sm font-medium text-(--c-muted)">Cost per app created</p>
          </div>
          <div className="flex min-w-0 flex-col items-start gap-3 xl:items-end">
            {/* Platform options can grow (WhatsApp, Website, etc.) without pushing status filters out of place. */}
            <div className="scrollbar-none flex max-w-full shrink-0 gap-1 overflow-x-auto rounded-xl bg-(--c-page) p-1" role="group" aria-label="Filter by platform">
              {PLATFORM_FILTERS.map(({ value, label }) => {
                const active = platformFilter === value;
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPlatformFilter(value)}
                    className={`flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-accent) ${
                      active ? 'bg-gradient-to-r from-(--c-grad-from) via-(--c-grad-via) to-(--c-grad-to) text-white shadow-sm' : 'text-(--c-text-2) hover:bg-white'
                    }`}
                  >
                    {value && <PlatformTile platform={value} className="h-5 w-5 rounded-md [&_svg]:h-3.5 [&_svg]:w-3.5" />}
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="w-full">
              <StatusLegend counts={countOf} active={statusFilter} onChange={setStatusFilter} />
            </div>
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-(--c-muted)">
            No campaign matches this choice right now. Pick another platform or colour.
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {shown.map((row) => (
              <PlatformCard key={row.id} row={row} selected={selectedId === row.id} onSelect={() => choose(row.id)} />
            ))}
          </div>
        )}
      </section>

      {/* scorecard */}
      <section id="scorecard" className={`${card} scroll-mt-24`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Campaign Scorecard</h2>
          <p className="text-xs text-(--c-muted)">Click a column name to sort · click the pencil to edit a target</p>
        </div>
        <div className="mt-4">
          {shown.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-(--c-muted)">
              No campaign matches this choice. Change the platform or colour above to see more.
            </p>
          ) : (
            <Scorecard rows={shown} totals={totals} flashId={selectedId} />
          )}
        </div>
      </section>

      {/* next step */}
      <div className="flex flex-col gap-3 rounded-2xl border border-(--c-accent)/30 bg-(--c-accent-soft) p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-3xl text-sm font-medium text-(--c-text-2)">
          Set a cost-per-app target for each campaign. Review it every 2 weeks.
        </p>
        <Link to="/targets/set-target" onClick={() => setView({ platform: null })} className={gradientButton}>
          Go to Set Targets <span aria-hidden="true">→</span>
        </Link>
      </div>

      <p className="text-xs text-(--c-muted)">All numbers are examples to show the design. Real numbers will appear once data flows into the panel.</p>
    </div>
  );
}

export default TargetsPage;

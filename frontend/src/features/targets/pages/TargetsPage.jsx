import { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import PeriodFilter from '../../../components/PeriodFilter';

import PlatformCard, { PlatformTile } from '../components/PlatformCard';
import Scorecard from '../components/Scorecard';
import StatTile from '../components/StatTile';
import StatusLegend from '../components/StatusLegend';
import { useTargetCampaigns, useTargetOverview } from '../hooks/useTargetCampaigns';
import { useTargets } from '../hooks/useTargets';
import { useTargetsView } from '../hooks/useTargetsView';
import { buildRows, count, money, overallVerdict, spendMoney, STATUS } from '../utils/targetMath';

const card = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]';
const gradientButton =
  'inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-r from-(--c-grad-from) via-(--c-grad-via) to-(--c-grad-to) px-4 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(15,120,110,0.35)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-accent)';

const PLATFORM_FILTERS = [{ value: null, label: 'All' }, { value: 'Meta', label: 'Meta' }, { value: 'Google', label: 'Google' }];

const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

/**
 * Targets and Scorecard: how much it costs to get one business app created, overall and per campaign.
 * /targets/<campaign> opens that campaign's row in the scorecard (this is what clicking a platform card does).
 */
function TargetsPage() {
  const { targets } = useTargets();
  const navigate = useNavigate();
  const { campaignId } = useParams();

  const { hash, key } = useLocation();
  // period and the platform / colour filters are shared with the top bar menu
  const [view, setView] = useTargetsView();
  const { period, platform: platformFilter, status: statusFilter } = view;
  const filter = { range: period, ...(period === 'custom' ? { from: view.from, to: view.to } : {}) };
  const setPlatformFilter = (platform) => setView({ platform });
  const setStatusFilter = (status) => setView({ status });

  const { data: overview, error, loading } = useTargetOverview(filter);
  const { data: savedCampaigns } = useTargetCampaigns();
  const { rows, totals } = useMemo(() => buildRows(overview, savedCampaigns, targets.overall), [overview, savedCampaigns, targets.overall]);
  const selectedId = rows.some(({ id }) => id === campaignId) ? campaignId : null;
  const ready = Boolean(overview) && !loading;

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

  const verdict = ready ? overallVerdict(totals.costPerApp, targets.overall) : { text: 'Loading', status: null };
  const change = overview?.registrationsChange ?? null;
  const missingCampaigns = Object.entries(overview?.apps?.unassignedCampaign ?? {}).filter(([, value]) => value > 0);
  const cost = (value) => `${totals.approximate && value !== null ? '≈ ' : ''}${money(value)}`;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {/* header */}
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Targets and Scorecard</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/targets/set-target" onClick={() => setView({ platform: null })} className={gradientButton}>
            Set Targets <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <p className="text-sm text-(--c-text-3)">For the selected date range</p>
        <PeriodFilter filter={filter} onChange={({ range, from, to }) => setView({ period: range, from, to })} />
      </div>
      {ready && totals.approximate && (
        <p className="text-xs text-(--c-muted)">Ad spend and clicks are daily totals ({overview.period.spendFrom} to {overview.period.spendTo}). Apps follow the selected hours, so Cost/App is approximate (≈).</p>
      )}

      {/* five headline cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Spend" value={ready ? spendMoney(totals.spend) : '…'} tip="Total INR ad spend. Meta + Google = total spend.">
          {ready && ['Meta', 'Google'].map((platform) => (
            <span key={platform} className="mt-1 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5"><PlatformTile platform={platform} className="h-4 w-4 rounded [&_svg]:h-3 [&_svg]:w-3" />{platform}</span>
              <b className="tabular-nums">{spendMoney(totals.spendByPlatform[platform])}</b>
            </span>
          ))}
        </StatTile>
        <StatTile
          label="Clicks"
          value={ready ? count(totals.registrations) : '…'}
          tip="Total clicks on the ads in this period."
        >
          {change === null ? (
            'No data for the period before'
          ) : (
            <>
              <b style={{ color: change >= 0 ? 'var(--c-good)' : 'var(--c-bad-text)' }}>
                {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
              </b>{' '}
              vs the period before
            </>
          )}
        </StatTile>
        <StatTile label="Cost / Click" value={ready ? money(totals.costPerRegistration) : '…'} tip="Spend ÷ clicks. Useful to know, but it is not the target." />
        <StatTile label="Business apps created" value={ready ? count(totals.apps) : '…'} tip="Business apps (Trust rows) created in this range by Meta/Google owners. First ad lead before app creation, otherwise the member's source. Includes apps whose exact campaign is not tracked. Organic/other sources are excluded.">
          {ready && <>Meta {count(overview.apps.byPlatform.Meta)} · Google {count(overview.apps.byPlatform.Google)}<br />From paid ad sources</>}
        </StatTile>
        <StatTile
          featured
          label="★ Cost / App"
          value={ready ? cost(totals.costPerApp) : '…'}
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

        {ready && missingCampaigns.length > 0 && (
          <p className="mt-4 rounded-xl bg-(--c-page) px-3 py-2 text-xs text-(--c-text-3)">
            Campaign tracking missing: {missingCampaigns.map(([platform, value]) => `${platform} ${count(value)} apps`).join(' · ')}. Included in the total above; campaign Cost/App and colours stay blank until the campaign is known.
          </p>
        )}
        {!ready ? (
          <div className="mt-5 h-40 animate-pulse rounded-2xl bg-gray-100" />
        ) : shown.length === 0 ? (
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
          {!ready ? (
            <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
          ) : shown.length === 0 ? (
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

      <p className="text-xs text-(--c-muted)">Spend and clicks: ad platforms' daily records. Apps created: actual business apps created in this range, attributed once to the owner's first lead or member source. Cost/App = spend ÷ apps created; installs and logins are separate.</p>
    </div>
  );
}

export default TargetsPage;

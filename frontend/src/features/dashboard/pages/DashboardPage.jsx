import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigationType, useSearchParams } from 'react-router-dom';

import AreaChart from '../../../components/AreaChart';
// import { PieIcon } from '../../../components/sidebar/icons'; // Lead Mix & Conversion card
// import DonutChart from '../../../components/DonutChart'; // Lead Mix & Conversion card (hidden for now)
import PeriodFilter from '../../../components/PeriodFilter';
import { AppsIcon, CampaignIcon, ChartIcon, TargetIcon } from '../../../components/sidebar/icons';
import StatCards from '../../../components/StatCards';
import { useSessionState } from '../../../hooks/useSessionState';
// import { COLORS } from '../../marketing/utils/leadStats'; // Lead Mix & Conversion card
import { COLORS } from '../../marketing/utils/leadStats';
import { formatPercent, percentOf } from '../../../utils/percent';
import { periodTitle } from '../../trust-insights/utils/periodTitle';
import { buildActivitySeries } from '../../trust-insights/utils/trustSeries';
import CampaignTable from '../components/CampaignTable';
import CardDetails from '../components/CardDetails';
// import LeadConversion from '../components/LeadConversion'; // Lead Mix & Conversion card
import MostActiveApps from '../components/MostActiveApps';
import ReportSection from '../components/ReportSection';
import SourceFilterBar from '../components/SourceFilterBar';
import SourceQualityCards from '../components/SourceQualityCards';
import { useActiveApps } from '../hooks/useActiveApps';
import { useCardDetails } from '../hooks/useCardDetails';
import { useDashboard } from '../hooks/useDashboard';
import { SOURCES, sourceByKey } from '../utils/sources';

const card = 'min-w-0 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]';
const number = (value) => value?.toLocaleString('en-IN');
const EMPTY_SERIES = { trend: [], byHour: [] };
// const CHANNEL_COLORS = { Facebook: COLORS.facebook, Instagram: COLORS.instagram, Website: COLORS.website, WhatsApp: '#1fa855', 'Google Ads': COLORS.google, Organic: '#d63384' };
const SCROLL_KEY = 'dashboard:scroll';
const REPORT_IDS = ['sources', 'campaigns', 'apps', 'growth']; // 'mix' (Lead Mix & Conversion) is hidden for now

/** Investor overview: how big the platform is, how fast it is growing, and whether the marketing is working. */
function DashboardPage() {
  const [filter, setFilter] = useSessionState('dashboard:filter', { range: '7d' });
  const { data, loadedAt, loading, error } = useDashboard(filter);

  // The chosen source lives in the URL (/?source=meta&open=campaigns) so the sidebar can link straight to it.
  const [params, setParams] = useSearchParams();
  const sourceKey = sourceByKey(params.get('source'))?.key ?? null;
  const openParam = params.get('open');
  const setSourceKey = (key) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (key) next.set('source', key);
        else next.delete('source');
        next.delete('open');
        return next;
      },
      { replace: true }
    );

  // A selected source with no leads shows its own (empty) numbers, not everyone's.
  const source = data?.sources.find((s) => s.key === sourceKey) ?? null;
  const leadData = sourceKey ? source?.sections : data;

  // Which report cards are open; remembered for this tab.
  const [open, setOpen] = useSessionState('dashboard:open-reports', { sources: true });
  const toggle = (id) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  const allOpen = REPORT_IDS.every((id) => open[id]);
  const toggleAll = () => setOpen(Object.fromEntries(REPORT_IDS.map((id) => [id, !allOpen])));

  // Leaving the page through a link (a campaign number, an app name…): remember where we were. Saved at the click itself,
  // before the next page can change the scroll position.
  useEffect(() => {
    const save = () => {
      try {
        sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
      } catch {
        // not saved; the page still works
      }
    };
    document.addEventListener('click', save, true);
    return () => document.removeEventListener('click', save, true);
  }, []);

  // Coming back (browser back / "Back to Dashboard"): return to the same place on the page, not the top.
  const navigationType = useNavigationType();
  const [savedY] = useState(() => {
    try {
      return navigationType === 'POP' ? Number(sessionStorage.getItem(SCROLL_KEY)) || 0 : 0;
    } catch {
      return 0;
    }
  });
  const returning = savedY > 0;

  // Opened from a sidebar link: open that card and scroll to it (not when coming back: that returns to the saved place).
  // location.key changes on every click of a link, even to the address already shown, so the same link works again.
  // Only the first run after coming back is skipped: later clicks on the top bar always scroll.
  const { key: locationKey } = useLocation();
  const skipScroll = useRef(returning);
  useEffect(() => {
    if (!openParam || !REPORT_IDS.includes(openParam)) return;
    setOpen((prev) => ({ ...prev, [openParam]: true }));
    if (skipScroll.current) {
      skipScroll.current = false;
      return;
    }
    requestAnimationFrame(() => document.getElementById(`report-${openParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [openParam, sourceKey, setOpen, locationKey]);

  const restored = useRef(false);
  const ready = Boolean(data);
  useEffect(() => {
    if (restored.current || !ready || !returning) return;
    restored.current = true;
    requestAnimationFrame(() => window.scrollTo(0, savedY));
  }, [ready, returning, savedY]);

  // Most Active Apps follows the global source, but can still be changed on its own.
  const [appScope, setAppScope] = useSessionState('dashboard:app-scope', 'all');
  // Only when the global source actually changes: coming back to the page keeps the scope chosen before.
  const lastSource = useRef(sourceKey);
  useEffect(() => {
    if (lastSource.current === sourceKey) return;
    lastSource.current = sourceKey;
    setAppScope(sourceKey ?? 'all');
  }, [sourceKey, setAppScope]);
  const scopedApps = useActiveApps(filter, appScope);
  const activeApps = appScope === 'all' ? data?.activeApps : scopedApps.data;
  const activeAppsLoading = appScope === 'all' ? loading && !data : scopedApps.loading;

  const graphs = useMemo(() => {
    const build = (key) => buildActivitySeries(data?.series[key] ?? EMPTY_SERIES, data?.period, loadedAt);
    return { members: build('members'), trusts: build('trusts'), activity: build('activity'), leads: build('leads') };
  }, [data, loadedAt]);

  // const channels = (leadData?.leadChannels ?? []).map(({ label, count }) => ({
  //   label,
  //   value: count,
  //   color: CHANNEL_COLORS[label] ?? COLORS.other,
  // }));

  const t = data?.totals;
  // With a source chosen, every card shows only the people who came from that source.
  const sc = sourceKey ? source?.cards ?? {} : null;
  const act = sc ? sc.activity : data?.activity;

  // Click a card to see its number split by source (the chips), then click a source to open the rows behind it.
  const [pickedCard, setPickedCard] = useState(null);
  const pick = (key) => setPickedCard((current) => (current === key ? null : key));
  const select = (key) => ({ onSelect: () => pick(key), active: pickedCard === key });
  const cardValue = {
    leads: (c) => c.leadsInPeriod,
    members: (c) => c.membersInPeriod,
    notLogin: (c) => c.otpNotLogin,
    loggedIn: (c) => c.otpLoggedIn,
    apps: (c) => c.trustsInPeriod,
    activity: (c) => c.activity.total,
    otherLogin: (c) => c.pwaLogins,
    setuActivity: (c) => c.activity.setuAi,
    panelActivity: (c) => c.activity.userPanel,
    otherActivity: (c) => c.activity.otherApps,
  };
  const CARD_TITLES = {
    leads: 'New Leads',
    members: 'New Members',
    notLogin: 'SETU AI · Not login',
    loggedIn: 'SETU AI · Logged in',
    apps: 'New Apps',
    activity: 'App Activity',
    otherLogin: 'Other App Login',
    setuActivity: 'SETU APP Activity',
    panelActivity: 'User Panel Activity',
    otherActivity: 'Other App Activity',
  };
  const stats = [
    {
      accent: 'var(--c-c3)',
      label: 'New Leads',
      parts: [{ value: number(sc ? sc.leadsInPeriod : t?.leadsInPeriod) }],
      split: !sc && t?.leadsBySource && [
        { label: 'Meta', value: t.leadsBySource.meta, color: COLORS.facebook },
        { label: 'Google', value: t.leadsBySource.google, color: COLORS.google },
        ...(t.leadsBySource.other ? [{ label: 'Other', value: t.leadsBySource.other, color: COLORS.other }] : []),
      ],
      hint: !sc && t ? `Total ${number(t.leads)} · ${number(t.leadsToday)} today` : undefined,
      ...select('leads'),
    },
    {
      accent: 'var(--c-c2)',
      label: 'New Members',
      parts: [{ value: number(sc ? sc.membersInPeriod : t?.membersInPeriod) }],
      ...select('members'),
    },
    {
      accent: 'var(--c-bad-text)',
      label: 'SETU AI',
      parts: [
        { value: number(sc ? sc.otpNotLogin : t?.otpNotLogin), caption: 'Not login', color: '#dc2626', ...select('notLogin') },
        { value: number(sc ? sc.otpLoggedIn : t?.otpLoggedIn), caption: 'Logged in', color: '#16a34a', ...select('loggedIn') },
      ],
    },
    {
      accent: 'var(--c-good)',
      label: 'New Apps',
      parts: [{ value: number(sc ? sc.trustsInPeriod : t?.trustsInPeriod) }],
      hint: !sc && t ? `Total ${number(t.trusts)} · ${number(t.trustsToday)} today` : undefined,
      ...select('apps'),
    },
    {
      accent: 'var(--c-c4)',
      label: 'App Activity',
      parts: [{ value: number(act?.total) }],
      ...select('activity'),
    },
    {
      accent: 'var(--c-c3)',
      label: 'Other App Login',
      parts: [{ value: number(sc ? sc.pwaLogins : t?.pwaLogins) }],
      ...select('otherLogin'),
    },
    {
      accent: 'var(--c-c2)',
      label: 'SETU APP Activity',
      parts: [{ value: number(act?.setuAi) }],
      ...select('setuActivity'),
    },
    {
      accent: 'var(--c-good)',
      label: 'User Panel Activity',
      parts: [{ value: number(act?.userPanel) }],
      ...select('panelActivity'),
    },
    {
      accent: 'var(--c-bad-text)',
      label: 'Other App Activity',
      parts: [{ value: number(act?.otherApps) }],
      ...select('otherActivity'),
    },
  ];

  // The chips: the picked card's number per source (the leads per source when no card is picked).
  const valueOf = pickedCard ? (s) => cardValue[pickedCard](s.cards) : (s) => s.leads;
  const chipCounts = data && { all: data.sources.reduce((sum, s) => sum + valueOf(s), 0), ...Object.fromEntries(data.sources.map((s) => [s.key, valueOf(s)])) };
  const details = useCardDetails(filter, pickedCard, sourceKey);

  const chart = (title, noun, data_, nounPlural) => (
    <section className={card}>
      <AreaChart title={periodTitle(title, filter, data?.period)} series={data_} loading={loading} noun={noun} nounPlural={nounPlural} emptyText={`No ${nounPlural ?? `${noun}s`} in this period`} />
    </section>
  );

  const label = sourceByKey(sourceKey)?.label;
  const campaigns = leadData?.campaigns;
  // const conversion = leadData?.leadConversion;
  // const conversionRate = conversion?.withMobile ? Math.round((conversion.converted / conversion.withMobile) * 100) : null;
  const stillActive = (s) => (s?.creators ? `${formatPercent(percentOf(s.activeCreators, s.creators))}%` : '—');
  const initialLoad = loading && !data;

  return (
    <div className="mx-auto max-w-7xl">
      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Platform Overview</h2>
          <p className="mt-1 text-sm text-(--c-text-3)">For the selected date range</p>
        </div>
        <PeriodFilter filter={filter} onChange={setFilter} />
      </div>

      <section className="mt-4">
        <StatCards stats={stats} loading={initialLoad} />
      </section>

      <div className="mt-5">
        <SourceFilterBar
          value={sourceKey}
          onChange={setSourceKey}
          counts={chipCounts}
        />
        {pickedCard && (
          <CardDetails
            key={`${pickedCard}:${sourceKey}`}
            title={`${CARD_TITLES[pickedCard]} · ${label ?? 'All sources'}`}
            details={details.data?.card === pickedCard && (details.data?.source ?? null) === sourceKey ? details.data : null}
            loading={details.loading}
            error={details.error}
          />
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Detailed Reports{label ? ` · ${label}` : ''}</h2>
          <p className="mt-1 text-sm text-(--c-text-3)">Click a card to open it. Closed cards show a quick summary.</p>
        </div>
        <button type="button" onClick={toggleAll} className="h-10 cursor-pointer rounded-full border border-gray-300 bg-white px-4 text-sm font-semibold text-(--c-text-2) hover:bg-gray-50">
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      <div className="stagger mt-4 space-y-4">
        <ReportSection
          id="sources"
          title="Lead Source Quality"
          subtitle="How many leads logged in and built an app, per source"
          icon={<TargetIcon />}
          iconBg="linear-gradient(135deg, #a78bfa, #6d3fd8)"
          open={!!open.sources}
          onToggle={() => toggle('sources')}
          summary={SOURCES.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1 font-semibold">
              <span className="rounded px-1 text-[0.6rem] text-white" style={{ background: s.color }}>{s.letter}</span>
              {stillActive(data?.sources.find((x) => x.key === s.key))}
            </span>
          ))}
        >
          <SourceQualityCards sources={data?.sources} selected={sourceKey} onSelect={setSourceKey} loading={initialLoad} embedded />
        </ReportSection>

        <ReportSection
          id="campaigns"
          title="Campaign Performance"
          subtitle="Which campaign brings people who build and use apps"
          count={campaigns?.length}
          icon={<CampaignIcon />}
          iconBg="linear-gradient(135deg, #f59e0b, #d9701a)"
          open={!!open.campaigns}
          onToggle={() => toggle('campaigns')}
          summary={campaigns && `${campaigns.length} campaign${campaigns.length === 1 ? '' : 's'}${campaigns[0] ? ` · top: ${campaigns[0].label}` : ''}`}
        >
          <CampaignTable
            campaigns={campaigns}
            scope={label}
            filter={filter}
            sourceKey={sourceKey}
            embedded
          />
        </ReportSection>

        <ReportSection
          id="apps"
          title="Most Active Apps"
          subtitle="The busiest apps in this period, and where their owners came from"
          count={activeApps?.apps.length}
          icon={<AppsIcon />}
          iconBg="linear-gradient(135deg, #14b8a6, #0f766e)"
          open={!!open.apps}
          onToggle={() => toggle('apps')}
          summary={activeApps && `${activeApps.apps.length} app${activeApps.apps.length === 1 ? '' : 's'}`}
        >
          <MostActiveApps
            apps={activeApps?.apps}
            scopeCounts={data?.activeApps.scopeCounts ?? activeApps?.scopeCounts}
            scope={appScope}
            onScopeChange={setAppScope}
            filter={filter}
            loading={activeAppsLoading}
            embedded
          />
        </ReportSection>

        <ReportSection
          id="growth"
          title="Growth Over Time"
          subtitle="Members, apps, activity and leads in the selected period"
          icon={<ChartIcon />}
          iconBg="linear-gradient(135deg, #38b6d8, #1f86a8)"
          open={!!open.growth}
          onToggle={() => toggle('growth')}
          summary={t && `+${number(t.membersInPeriod)} members · +${number(t.trustsInPeriod)} apps · +${number(t.leadsInPeriod)} leads`}
        >
          <div className="grid gap-5 lg:grid-cols-2">
            {chart('Members Joined', 'member', graphs.members)}
            {chart('Apps Created', 'app', graphs.trusts)}
            {chart('App Activity', 'action', graphs.activity)}
            {chart('Leads Received', 'lead', graphs.leads)}
          </div>
        </ReportSection>

        {/* Lead Mix & Conversion card: hidden for now. Uncomment this block and the imports / values above to bring it back.
        <ReportSection
          id="mix"
          title="Lead Mix & Conversion"
          subtitle="Where leads came from and how many became members"
          icon={<PieIcon />}
          iconBg="linear-gradient(135deg, #ec4899, #be185d)"
          open={!!open.mix}
          onToggle={() => toggle('mix')}
          summary={conversionRate !== null && `${conversionRate}% of leads became members`}
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <section className={card}>
              <DonutChart title={label ? `Lead Sources · ${label}` : 'Lead Sources'} slices={channels} loading={loading} />
            </section>
            <LeadConversion conversion={conversion} loading={loading} scope={label} />
          </div>
        </ReportSection>
        */}
      </div>
    </div>
  );
}

export default DashboardPage;

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';

import BackLink from '../../../components/BackLink';
import PeriodDropdown from '../../../components/PeriodDropdown';
import Pagination from '../../../components/Pagination';
import ScrollTable from '../../../components/ScrollTable';
import SearchInput from '../../../components/SearchInput';
import SortableTh, { HeadCell } from '../../../components/SortableTh';
import { formatDateTime } from '../../../utils/formatDate';
import { periodQuery } from '../../member-insights/utils/periodQuery';
import { useCampaignLeads } from '../hooks/useCampaignLeads';

const STAGES = {
  lead: { label: 'Lead only', className: 'bg-gray-100 text-(--c-muted)' },
  member: { label: 'Joined', className: 'bg-(--c-accent-soft) text-(--c-link)' },
  loggedIn: { label: 'Logged in', className: 'bg-(--c-accent-soft) text-(--c-link)' },
  app: { label: 'Created app', className: 'bg-amber-50 text-amber-700' },
  active: { label: 'App in use', className: 'bg-green-50 text-green-700' },
};

const STAGE_KEYS = ['loggedIn', 'notLoggedIn', 'app', 'noApp', 'active'];

/** What the Progress column says: the number that was clicked on the dashboard, so every row of a list reads the same. */
const PROGRESS = {
  loggedIn: { label: 'Logged in', style: 'loggedIn' },
  notLoggedIn: { label: 'Not logged in', style: 'lead' },
  app: { label: 'Created app', style: 'app' },
  noApp: { label: 'Logged in, no app', style: 'loggedIn' },
  active: { label: 'App in use', style: 'active' },
};
const LEAD_PROGRESS = { label: 'Lead', style: 'lead' };

const META_PLATFORMS = ['Facebook', 'Instagram'];
const PERIOD_LABELS = { today: 'Today', '7d': 'Last 7 Days', '30d': 'Last 30 Days' };

const COLUMNS = 6;
const BADGE = 'inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold';

/** Where a lead's badge leads: one app opens its activity, several open the member's list of apps; earlier steps have no app to open. */
function appPath(lead, period) {
  if (!lead.memberId || !lead.appIds?.length) return null;
  const query = periodQuery(period);
  return lead.appIds.length === 1
    ? `/member-insights/${lead.memberId}/apps/${lead.appIds[0]}/activity${query}`
    : `/member-insights/${lead.memberId}/apps${query}`;
}

/** The individual leads behind a campaign (or one of its platforms / ad sets), searchable and sortable by when they came in. */
function CampaignLeadsPage() {
  const [params] = useSearchParams();
  // Facebook / Instagram filter: opens on the platform chosen on the dashboard, if any
  // The Facebook / Instagram filter is only for Meta campaigns (not Google Ads, Website or Organic)
  const channels = (params.get('channels') ?? '').split(',').filter(Boolean);
  // WhatsApp campaigns split by their kind (Members.sub_source, e.g. Directory); worth a filter only when there is more than one
  const known = channels.filter((name) => !/\(other\)$/.test(name));
  const platformOptions = channels.length ? known.filter((name) => META_PLATFORMS.includes(name) || known.length > 1) : params.get('source') === 'meta' ? META_PLATFORMS : [];
  const [platform, setPlatform] = useState(() => params.get('platform') || undefined);
  const target = {
    campaign: params.get('campaign') ?? '',
    source: params.get('source') || undefined,
    platform,
    adSet: params.get('adSet') || undefined,
    stage: STAGE_KEYS.includes(params.get('stage')) ? params.get('stage') : undefined, // opened from the Logged In / Apps Created column
  };

  // opens on the period chosen on the dashboard
  const [period, setPeriod] = useState(() => ({
    range: params.get('range') || '7d',
    from: params.get('from') || undefined,
    to: params.get('to') || undefined,
  }));

  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState({ key: 'receivedAt', dir: 'desc' });

  // the Back link and the search live in the top bar (TopBar renders the slot)
  const [slot, setSlot] = useState(null);
  useEffect(() => {
    setSlot(document.getElementById('topbar-slot'));
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0); // open at the top, not where the dashboard was scrolled
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(input.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  const { data, loading, error } = useCampaignLeads(period, target, { search, page, pageSize, sort: sort.dir });
  const total = data?.total ?? 0;

  const onSort = (key) => {
    setSort((current) => ({ key, dir: current.dir === 'asc' ? 'desc' : 'asc' }));
    setPage(1);
  };

  const onPeriodChange = (patch) => {
    setPeriod((prev) => ({
      ...prev,
      ...patch,
      ...(patch.range && patch.range !== 'custom' ? { from: undefined, to: undefined } : {}),
    }));
    setPage(1);
  };

  const scope = [target.platform, target.adSet].filter(Boolean).join(' · ');
  const VIEW = {
    loggedIn: { title: 'Logged In', hint: 'Leads from this campaign who logged in to the app.', list: 'Leads who logged in' },
    notLoggedIn: { title: 'Not Logged In', hint: 'Leads from this campaign who have never logged in to the app.', list: 'Leads who never logged in' },
    app: { title: 'Created App', hint: 'People from this campaign who logged in and created an app.', list: 'People who created an app' },
    noApp: { title: 'Logged In, No App', hint: 'People from this campaign who logged in but have not created an app yet.', list: 'People who logged in without creating an app' },
    active: { title: 'Apps In Use', hint: 'People from this campaign whose app has had activity.', list: 'People with an app in use' },
    }[target.stage] ?? { title: 'Total Leads', hint: 'Every lead this campaign brought in during the selected period.', list: 'Leads' };
  const progress = PROGRESS[target.stage] ?? LEAD_PROGRESS;
  const summary = data?.summary;
  const plural = (n, one, many) => `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;
  const stageSummary =
    summary &&
    {
      app: `${plural(summary.people, 'person', 'people')} built ${plural(summary.apps, 'app', 'apps')} in total`,
      noApp: plural(summary.people, 'person', 'people'),
      active: plural(summary.people, 'person', 'people'),
      loggedIn: plural(summary.people, 'person', 'people'),
      notLoggedIn: plural(summary.people, 'lead', 'leads'),
    }[target.stage];

  return (
    <div className="mx-auto max-w-6xl">
      {slot &&
        createPortal(
          <>
            <div className="shrink-0 whitespace-nowrap">
              <BackLink to="/" label="Back to Dashboard" button />
            </div>
            {target.campaign && (
              <div className="hidden w-full max-w-md md:block">
                <SearchInput value={input} onChange={setInput} placeholder="Search name or mobile number" label="Search leads" />
              </div>
            )}
            {target.campaign && (
              <div className="hidden md:block">
                <PeriodDropdown filter={period} onChange={onPeriodChange} />
              </div>
            )}
          </>,
          slot
        )}
      <header className="mt-4 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{VIEW.title}</h1>
        {target.campaign && (
          <p className="text-base font-semibold text-(--c-link)">
            <span className="font-medium text-(--c-muted)">Campaign: </span>
            {target.campaign}
          </p>
        )}
        <p className="max-w-3xl text-sm text-(--c-text-3)">{[VIEW.hint, stageSummary, scope].filter(Boolean).join(' · ')}</p>
      </header>

      {!target.campaign ? (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          No campaign selected. Open this page from the Campaign Performance table.
        </p>
      ) : (
        <>
          {error && (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          {/* Phones: the search and the period sit here, since the top bar has no room for them */}
          <div className="mt-4 flex items-center gap-2 md:hidden">
            <div className="min-w-0 flex-1">
              <SearchInput value={input} onChange={setInput} placeholder="Search name or mobile number" label="Search leads" />
            </div>
            <PeriodDropdown filter={period} onChange={onPeriodChange} align="right" />
          </div>

          {/* Stays right under the top bar while scrolling , so it is always clear whose data this is */}
          <div className="sticky top-[4.25rem] z-[15] mt-4">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl border border-(--c-accent)/30 bg-white px-4 py-2.5 shadow md:px-5 md:py-3-[0_4px_14px_rgba(20,33,61,0.08)]">
              <div className="min-w-0">
                <p className="hidden text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-(--c-muted) md:block">Showing data for</p>
                <p className="truncate text-sm font-semibold text-(--c-link)">{target.campaign}</p>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 md:mt-1">
                  <span className="text-lg font-bold leading-tight">{VIEW.title}</span>
                  {data && <span className="rounded-full bg-(--c-accent-soft) px-2.5 py-0.5 text-xs font-bold text-(--c-link)">{total.toLocaleString('en-IN')}</span>}
                  <span className="rounded-full bg-(--c-page) px-2.5 py-0.5 text-xs font-medium text-(--c-text-2)">
                    {period.range === 'custom' ? `${period.from} to ${period.to}` : PERIOD_LABELS[period.range]}
                  </span>
                  {target.adSet && <span className="rounded-full bg-(--c-page) px-2.5 py-0.5 text-xs font-medium text-(--c-text-2)">{target.adSet}</span>}
                  {search && <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Search: {search}</span>}
                </div>
              </div>
              {platformOptions.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="hidden text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-(--c-muted) md:block">Platform</span>
                <div className="inline-flex gap-1 rounded-xl bg-(--c-page) p-1" role="group" aria-label="Filter by platform">
                  {[undefined, ...platformOptions].map((name) => {
                    const active = platform === name;
                    return (
                      <button
                        key={name ?? 'all'}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setPlatform(name);
                          setPage(1);
                        }}
                        className={`cursor-pointer whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                          active
                            ? 'bg-gradient-to-r from-(--c-grad-from) via-(--c-grad-via) to-(--c-grad-to) text-white shadow-sm'
                            : 'text-(--c-text-2) hover:bg-white'
                        }`}
                      >
                        {name ?? 'All'}
                      </button>
                    );
                  })}
                </div>
              </div>
              )}
            </div>
          </div>

          <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-semibold">{VIEW.list}</h2>
                {data && <span className="rounded-full bg-(--c-accent-soft) px-2.5 py-0.5 text-xs font-semibold text-(--c-link)">{total.toLocaleString('en-IN')}</span>}
              </div>
            </div>

            <ScrollTable className="mt-4" busy={loading && !!data}>
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr>
                    <HeadCell>Name</HeadCell>
                    <HeadCell>Mobile</HeadCell>
                    <HeadCell>Platform</HeadCell>
                    <HeadCell>Ad Set</HeadCell>
                    <SortableTh label="Received At" sortKey="receivedAt" sort={sort} onSort={onSort} />
                    <HeadCell>Progress</HeadCell>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-gray-200 ${loading && data ? 'opacity-60' : ''}`}>
                  {!data &&
                    loading &&
                    Array.from({ length: 6 }, (_, i) => (
                      <tr key={i}>
                        <td colSpan={COLUMNS} className="px-4 py-3.5">
                          <div className="h-5 animate-pulse rounded bg-gray-100" />
                        </td>
                      </tr>
                    ))}

                  {data && data.leads.length === 0 && (
                    <tr>
                      <td colSpan={COLUMNS} className="px-4 py-12 text-center text-(--c-text-3)">
                        {search ? 'No leads match your search.' : 'No leads in this period.'}
                      </td>
                    </tr>
                  )}

                  {data?.leads.map((lead) => {
                    const stage = STAGES[progress.style];
                    const to = ['app', 'active'].includes(target.stage) ? appPath(lead, period) : null;
                    return (
                      <tr key={lead.id}>
                        <td className="px-4 py-3 font-semibold">{lead.name || 'Unnamed lead'}</td>
                        <td className="px-4 py-3 tabular-nums text-(--c-text-2)">{lead.mobile || <span className="text-(--c-faint)">—</span>}</td>
                        <td className="px-4 py-3 text-(--c-text-2)">{lead.channel}</td>
                        <td className="px-4 py-3 text-(--c-text-2)">{lead.adSet || <span className="text-(--c-faint)">—</span>}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-(--c-text-2)">{lead.receivedAt ? formatDateTime(lead.receivedAt) : '—'}</td>
                        <td className="px-4 py-3">
                          {to ? (
                            <Link
                              to={to}
                              state={{ backLabel: 'Campaign Leads', section: '/' }}
                              title={lead.appIds.length === 1 ? 'Open this app' : `Open the ${lead.appIds.length} apps this member created`}
                              className={`${BADGE} ${stage.className} hover:underline`}
                            >
                              {progress.label}
                              {lead.appIds.length > 1 ? ` (${lead.appIds.length})` : ''} →
                            </Link>
                          ) : (
                            <span className={`${BADGE} ${stage.className}`}>{progress.label}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollTable>

            {data && (
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                loading={loading}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default CampaignLeadsPage;

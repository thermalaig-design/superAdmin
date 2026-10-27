import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';

import BackLink from '../../../components/BackLink';
import Pagination from '../../../components/Pagination';
import PeriodDropdown from '../../../components/PeriodDropdown';
import ScrollTable from '../../../components/ScrollTable';
import OptionDropdown from '../../../components/OptionDropdown';
import SearchInput from '../../../components/SearchInput';
import { HeadCell } from '../../../components/SortableTh';
import { formatDateTime } from '../../../utils/formatDate';
import { SOURCES } from '../../dashboard/utils/sources';
import SummaryCards from '../components/SummaryCards';
import { useRegistrationCampaigns, useRegistrations, useRegistrationSummary } from '../hooks/useRegistrations';

const PERIOD_LABELS = { today: 'Today', '7d': 'Last 7 Days', '30d': 'Last 30 Days' };
const COLUMNS = 6;
const SOURCE_OPTIONS = [{ value: '', label: 'All sources' }, ...SOURCES.map((source) => ({ value: source.key, label: source.label }))];
const STAGE_OPTIONS = [
  { value: '', label: 'All people' },
  { value: 'loggedIn', label: 'Logged in' },
  { value: 'app', label: 'Created an app' },
  { value: 'noApp', label: 'Logged in, no app' },
  { value: 'active', label: 'App in use' },
];
const BADGE = 'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold';
const dash = <span className="text-(--c-faint)">—</span>;

const initials = (person) => (person.name ? person.name.trim().slice(0, 1).toUpperCase() : '#');

/** Everyone who registered in the selected period, with the numbers on top. Open a person to see everything they did. */
function RegistrationsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [fromDashboard] = useState(() => Boolean(params.get('campaign')));
  const openPerson = (id) => navigate(`/registrations/${id}`, { state: { backLabel: 'Registrations' } });

  // opens on the period chosen on the Targets page
  const [period, setPeriod] = useState(() => ({
    range: params.get('range') || 'today',
    from: params.get('from') || undefined,
    to: params.get('to') || undefined,
  }));
  // Opened from a campaign number on the dashboard: that source / campaign / stage is already chosen, and can be changed here.
  const [filters, setFilters] = useState(() => ({
    source: params.get('source') || '',
    campaign: params.get('campaign') || '',
    stage: params.get('stage') || '',
    platform: params.get('platform') || undefined, // narrowed further by a platform / ad set sub-row on the dashboard
    adSet: params.get('adSet') || undefined,
  }));
  const filtered = Boolean(filters.source || filters.campaign || filters.stage);
  const target = { campaign: filters.campaign || undefined, source: filters.source || undefined, platform: filters.platform, adSet: filters.adSet, stage: filters.stage || undefined };

  const [input, setInput] = useState(() => params.get('search') || '');
  const [search, setSearch] = useState(() => params.get('search') || '');
  const [page, setPage] = useState(() => Math.max(1, Number.parseInt(params.get('page'), 10) || 1));
  const [pageSize, setPageSize] = useState(() => Number.parseInt(params.get('pageSize'), 10) || 25);

  // The address always mirrors what is chosen here, so coming Back from a person lands on this exact list (same filters, search and page).
  useEffect(() => {
    const next = new URLSearchParams();
    const set = (key, value) => value && next.set(key, value);
    set('range', period.range);
    set('from', period.from);
    set('to', period.to);
    set('source', filters.source);
    set('campaign', filters.campaign);
    set('stage', filters.stage);
    set('platform', filters.platform);
    set('adSet', filters.adSet);
    set('search', search);
    if (page > 1) next.set('page', String(page));
    if (pageSize !== 25) next.set('pageSize', String(pageSize));
    setParams(next, { replace: true });
  }, [period, filters, search, page, pageSize, setParams]);

  // the Back link, search and period live in the top bar (TopBar renders the slot)
  const [slot, setSlot] = useState(null);
  useEffect(() => {
    setSlot(document.getElementById('topbar-slot'));
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(input.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  const setFilter = (patch) => {
    setFilters((prev) => ({ ...prev, platform: undefined, adSet: undefined, ...patch, ...(patch.source !== undefined ? { campaign: '' } : {}) }));
    setPage(1);
  };

  const { data: campaignList } = useRegistrationCampaigns(period, filters.source || undefined);
  const campaignOptions = [
    { value: '', label: 'All campaigns' },
    ...(campaignList ?? []).map((item) => ({ value: item.label, label: item.label, count: item.leads })),
    ...(filters.campaign && !campaignList?.some((item) => item.label === filters.campaign) ? [{ value: filters.campaign, label: filters.campaign }] : []),
  ];

  const { data, loading, error } = useRegistrations(period, { search, page, pageSize }, target);
  const { data: summary, loading: summaryLoading, error: summaryError } = useRegistrationSummary(period, { enabled: !filtered });
  const total = data?.total ?? 0;

  const onPeriodChange = (patch) => {
    setPeriod((prev) => ({
      ...prev,
      ...patch,
      ...(patch.range && patch.range !== 'custom' ? { from: undefined, to: undefined } : {}),
    }));
    setPage(1);
  };

  const periodLabel = period.range === 'custom' ? `${period.from} to ${period.to}` : PERIOD_LABELS[period.range];

  return (
    <div className="mx-auto max-w-7xl">
      {slot &&
        createPortal(
          <>
            <div className="shrink-0 whitespace-nowrap">
              <BackLink to={fromDashboard ? '/' : '/targets'} label={fromDashboard ? 'Back to Dashboard' : 'Back to Targets'} button />
            </div>
            <div className="hidden w-full max-w-md md:block">
              <SearchInput value={input} onChange={setInput} placeholder="Search name or mobile number" label="Search registrations" />
            </div>
            <div className="hidden md:block">
              <PeriodDropdown filter={period} onChange={onPeriodChange} />
            </div>
          </>,
          slot
        )}

      {/* heading */}
      <header className="relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-r from-(--c-grad-from) via-(--c-grad-via) to-(--c-grad-to) px-6 py-6 text-white shadow-[0_8px_24px_rgba(15,120,110,0.28)] md:px-8">
        <span className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-16 right-24 h-36 w-36 rounded-full bg-white/10" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/80">User actions</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Registrations</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/85">Who registered, how far they got, and what each person did. Open a person to see every step they took.</p>
          </div>
          <span className="rounded-full bg-white/20 px-3.5 py-1.5 text-sm font-semibold backdrop-blur">{periodLabel}</span>
        </div>
      </header>

      {(error || summaryError) && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error || summaryError}
        </p>
      )}

      {/* Phones: the search and the period sit here, since the top bar has no room for them */}
      <div className="mt-4 flex items-center gap-2 md:hidden">
        <div className="min-w-0 flex-1">
          <SearchInput value={input} onChange={setInput} placeholder="Search name or mobile number" label="Search registrations" />
        </div>
        <PeriodDropdown filter={period} onChange={onPeriodChange} align="right" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <OptionDropdown label="Source" value={filters.source} options={SOURCE_OPTIONS} onChange={(value) => setFilter({ source: value })} />
        <OptionDropdown label="Campaign" value={filters.campaign} options={campaignOptions} onChange={(value) => setFilter({ campaign: value })} />
        <OptionDropdown label="Stage" value={filters.stage} options={STAGE_OPTIONS} onChange={(value) => setFilter({ stage: value })} />
        {filtered && (
          <button type="button" onClick={() => setFilter({ source: '', campaign: '', stage: '' })} className="h-10 cursor-pointer rounded-xl px-3 text-sm font-semibold text-(--c-link) hover:bg-(--c-accent-soft)">
            Clear filters
          </button>
        )}
      </div>

      {!filtered && <SummaryCards summary={summary} loading={summaryLoading && !summary} />}

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-lg font-bold">{filtered ? 'People matching the filters' : 'People who registered'}</h2>
          {data && <span className="rounded-full bg-(--c-accent-soft) px-2.5 py-0.5 text-xs font-bold text-(--c-link)">{total.toLocaleString('en-IN')}</span>}
          {search && <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Search: {search}</span>}
        </div>

        <ScrollTable className="mt-4" busy={loading && !!data}>
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr>
                <HeadCell>Person</HeadCell>
                <HeadCell>Apps Created</HeadCell>
                <HeadCell>Registered At</HeadCell>
                <HeadCell>Source</HeadCell>
                <HeadCell>Logged In</HeadCell>
                <HeadCell>Actions</HeadCell>
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

              {data && data.registrations.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS} className="px-4 py-12 text-center text-(--c-text-3)">
                    {search ? 'No registrations match your search.' : filtered ? 'Nobody matches these filters in this period.' : 'Nobody registered in this period.'}
                  </td>
                </tr>
              )}

              {data?.registrations.map((person) => (
                <tr
                  key={person.id}
                  onClick={() => openPerson(person.id)}
                  onKeyDown={(event) => event.key === 'Enter' && openPerson(person.id)}
                  tabIndex={0}
                  title="Open this person's activity"
                  className="cursor-pointer transition hover:bg-(--c-accent-soft) focus-visible:bg-(--c-accent-soft) focus-visible:outline-none"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-(--c-grad-from) to-(--c-grad-to) text-sm font-bold text-white">
                        {initials(person)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{person.name || 'No name yet'}</p>
                        <p className="tabular-nums text-xs text-(--c-muted)">{person.mobile || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {person.appNames.length > 0 ? (
                      <span className="font-bold text-(--c-text)">{person.appNames.join(', ')}</span>
                    ) : (
                      dash
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-(--c-text-2)">{formatDateTime(person.registeredAt)}</td>
                  <td className="px-4 py-3 text-(--c-text-2)">{person.source || 'Unknown'}</td>
                  <td className="px-4 py-3">
                    <span className={`${BADGE} ${person.loggedIn ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-(--c-muted)'}`}>
                      {person.loggedIn ? `Yes${person.loginCount > 1 ? ` · ${person.loginCount}×` : ''}` : 'Not yet'}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-(--c-text-2)">{person.actionCount.toLocaleString('en-IN')}</td>
                </tr>
              ))}
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
    </div>
  );
}

export default RegistrationsPage;

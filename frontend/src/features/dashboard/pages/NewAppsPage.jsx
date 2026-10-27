import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import BackLink from '../../../components/BackLink';
import OptionDropdown from '../../../components/OptionDropdown';
import Pagination from '../../../components/Pagination';
import PeriodDropdown from '../../../components/PeriodDropdown';
import LoadingBar from '../../../components/LoadingBar';
import ScrollTable from '../../../components/ScrollTable';
import SearchInput from '../../../components/SearchInput';
import SortableTh from '../../../components/SortableTh';
import { formatDateTime } from '../../../utils/formatDate';
import { formatPercent, percentOf } from '../../../utils/percent';
import SourceIcon from '../components/SourceIcon';
import { useNewApps } from '../hooks/useNewApps';
import { sourceByKey } from '../utils/sources';

const COLUMNS = 5;
const card = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]';
const dash = <span className="text-(--c-faint)">—</span>;
const number = (value) => value.toLocaleString('en-IN');

// the page's sections, as shortcuts in the top bar
const SECTIONS = [
  { id: 'summary', label: 'Summary' },
  { id: 'apps', label: 'Apps' },
];

// a source the backend can return that the dashboard has no colour for (the people who came with no ad lead)
const DIRECT = { key: 'direct', label: 'Direct (no ad lead)', letter: 'D', color: '#0f9488' };
const metaOf = (key) => sourceByKey(key) ?? DIRECT;

// the same sorts the column headings give, as a list (for the phone's card list)
const SORT_CHOICES = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'app:asc', label: 'App A–Z' },
  { value: 'app:desc', label: 'App Z–A' },
  { value: 'owner:asc', label: 'Owner A–Z' },
  { value: 'ownerApps:desc', label: 'Most apps by one person' },
];

const initials = (text) => (text ?? '').trim().slice(0, 1).toUpperCase() || '#';

/**
 * The apps created in the period (the "New Apps" number on the dashboard) and the people who built them: choose where the
 * builders came from, search, and sort by any column.
 */
function NewAppsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // opens on the period chosen on the dashboard
  const [period, setPeriod] = useState(() => ({
    range: params.get('range') || '7d',
    from: params.get('from') || undefined,
    to: params.get('to') || undefined,
  }));
  const [source, setSource] = useState();
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' });

  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [slot, setSlot] = useState(null);
  const [current, setCurrent] = useState('summary');
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

  const { data, loading, error } = useNewApps(period, { source, search, sort, page, pageSize });
  const filtered = data?.filteredTotal ?? 0;
  const ready = Boolean(data);

  // the section on screen is highlighted in the top bar
  useEffect(() => {
    if (!ready) return undefined;
    const seen = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => seen.set(entry.target.id, entry.isIntersecting));
        const first = SECTIONS.find(({ id }) => seen.get(id));
        if (first) setCurrent(first.id);
      },
      { rootMargin: '-80px 0px -55% 0px' }
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ready]);
  const goTo = (id) => {
    setCurrent(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onSort = (key) => {
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc' }));
    setPage(1);
  };
  const chooseSource = (key) => {
    setSource(key);
    setPage(1);
  };
  const sortValue = `${sort.key}:${sort.dir}`;
  const onSortChoice = (value) => {
    const [key, dir] = value.split(':');
    setSort({ key, dir });
    setPage(1);
  };

  const onPeriodChange = (patch) => {
    setPeriod((prev) => ({
      ...prev,
      ...patch,
      ...(patch.range && patch.range !== 'custom' ? { from: undefined, to: undefined } : {}),
    }));
    chooseSource(undefined);
  };

  // "All" first, then the sources that actually built apps
  const options = data ? [{ key: undefined, label: 'All', count: data.total, tone: '#0f9488' }, ...data.sources.map((item) => ({ ...item, tone: metaOf(item.key).color }))] : [];
  const sourceLabel = options.find((item) => item.key === source)?.label ?? 'All';

  return (
    <div className="mx-auto max-w-6xl pb-10">
      {slot &&
        createPortal(
          <>
            <div className="shrink-0 whitespace-nowrap">
              <BackLink to="/" label="Back to Dashboard" button />
            </div>
            <div className="hidden min-w-0 flex-1 items-center justify-center gap-4 md:flex lg:gap-5">
              <nav className="hidden shrink-0 items-center gap-4 xl:flex" aria-label="Sections of this page">
                {SECTIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => goTo(id)}
                    aria-current={current === id ? 'true' : undefined}
                    className={`h-10 shrink-0 cursor-pointer whitespace-nowrap border-b-2 px-0.5 text-sm font-medium transition-colors ${
                      current === id ? 'border-(--c-accent) font-semibold text-(--c-link)' : 'border-transparent text-(--c-text-2) hover:border-gray-300 hover:text-(--c-text)'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              <span className="hidden h-6 w-px shrink-0 bg-gray-200 xl:block" aria-hidden="true" />
              <OptionDropdown
                value={source ?? 'all'}
                onChange={(value) => chooseSource(value === 'all' ? undefined : value)}
                label="Where the builders came from"
                icon={
                  <svg viewBox="0 0 20 20" className="h-4 w-4 text-(--c-link)" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 5h14l-5.5 6.5V16l-3-1.5v-3L3 5Z" />
                  </svg>
                }
                options={options.map((item) => ({ value: item.key ?? 'all', label: item.label, tone: item.tone, count: item.count }))}
              />
              <PeriodDropdown filter={period} onChange={onPeriodChange} />
            </div>
          </>,
          slot
        )}

      <header className="mt-4">
        <h1 className="text-3xl font-bold tracking-tight">New Apps</h1>
        <p className="mt-1 max-w-2xl text-(--c-text-3)">
          {data
            ? `${number(data.total)} ${data.total === 1 ? 'app was' : 'apps were'} created by ${number(data.people)} ${data.people === 1 ? 'person' : 'people'} in the selected period. Pick a source to see only the apps of people who came from there.`
            : 'The apps created in the selected period and who built them.'}
        </p>
      </header>

      {/* phones: the top bar has no room, so the same controls sit in a bar that stays under it */}
      <div className="sticky top-16 z-10 -mx-1 mt-3 flex flex-col gap-2 bg-(--c-page)/95 px-1 py-2 backdrop-blur md:hidden">
        <div className="flex gap-2">
          <OptionDropdown
            block
            value={source ?? 'all'}
            onChange={(value) => chooseSource(value === 'all' ? undefined : value)}
            label="Where the builders came from"
            icon={
              <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-(--c-link)" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 5h14l-5.5 6.5V16l-3-1.5v-3L3 5Z" />
              </svg>
            }
            options={options.map((item) => ({ value: item.key ?? 'all', label: item.label, tone: item.tone, count: item.count }))}
          />
          <PeriodDropdown block align="right" filter={period} onChange={onPeriodChange} />
        </div>
        <nav className="scrollbar-none flex gap-2 overflow-x-auto" aria-label="Sections of this page">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => goTo(id)}
              aria-current={current === id ? 'true' : undefined}
              className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                current === id ? 'border-(--c-accent) bg-(--c-accent-soft) text-(--c-link)' : 'border-gray-200 bg-white text-(--c-text-2)'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {/* 1. summary: where the builders came from, as tiles */}
      <section id="summary" className={`${card} mt-5 scroll-mt-48 md:scroll-mt-20 animate-page`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold">Summary</h2>
            <p className="text-sm text-(--c-text-3)">Tap a source to see its apps. The date range is when the apps were created.</p>
          </div>
        </div>

        {!data && loading && <div className="mt-4 h-28 animate-pulse rounded-2xl bg-gray-100" />}
        <div className="stagger mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {options.map((item) => {
            const active = source === item.key;
            const meta = item.key ? metaOf(item.key) : null;
            const share = item.key ? percentOf(item.count, data.total) : null;
            return (
              <button
                key={item.key ?? 'all'}
                type="button"
                aria-pressed={active}
                onClick={() => chooseSource(item.key)}
                style={{ '--tone': item.tone }}
                className={`group relative cursor-pointer overflow-hidden rounded-2xl border p-3 text-left transition duration-200 sm:p-4 hover:-translate-y-1 hover:shadow-[0_14px_28px_-12px_color-mix(in_srgb,var(--tone)_60%,transparent)] ${
                  active ? 'border-(--tone) bg-[color-mix(in_srgb,var(--tone)_8%,white)] shadow-[0_8px_20px_-10px_color-mix(in_srgb,var(--tone)_60%,transparent)]' : 'border-gray-200 bg-white'
                }`}
              >
                <span className="absolute inset-x-0 top-0 h-1 bg-(--tone)" aria-hidden="true" />
                <span className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-(--c-muted)">
                    {meta ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[0.6rem] text-white" style={{ background: meta.color }}>
                        <SourceIcon sourceKey={item.key} letter={meta.letter} className="h-3 w-3" />
                      </span>
                    ) : (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-(--tone)" aria-hidden="true" />
                    )}
                    <span className="truncate">{item.key ? item.label : 'All apps'}</span>
                  </span>
                  {active && <span className="shrink-0 rounded-full bg-(--tone) px-2 py-px text-[0.65rem] font-bold text-white">Showing</span>}
                </span>
                <span className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{number(item.count)}</span>
                  {share !== null && <span className="text-sm font-semibold text-(--c-muted)">{formatPercent(share)}%</span>}
                </span>
                <span className="mt-1 block text-xs text-(--c-muted)">{item.key ? 'Built by people from here' : `Built by ${number(data.people)} ${data.people === 1 ? 'person' : 'people'}`}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. the apps themselves */}
      <section id="apps" className={`${card} mt-4 scroll-mt-48 md:scroll-mt-20 animate-page [animation-delay:80ms]`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-base font-semibold">Apps</h2>
            {data && <span className="rounded-full bg-(--c-accent-soft) px-2.5 py-0.5 text-xs font-semibold text-(--c-link)">{number(filtered)}</span>}
            {source && (
              <button type="button" onClick={() => chooseSource(undefined)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100">
                {sourceLabel} <span aria-hidden="true">✕</span>
                <span className="sr-only">Clear filter</span>
              </button>
            )}
          </div>
          <div className="sm:w-72">
            <SearchInput value={input} onChange={setInput} placeholder="Search app, owner or mobile number" label="Search apps" />
          </div>
        </div>
        <p className="mt-1 hidden text-xs text-(--c-muted) md:block">Tap a column heading to sort. Tap an app to see everything its creator did.</p>
        <div className="mt-3 flex items-center gap-2 md:hidden">
          <span className="shrink-0 text-xs font-semibold text-(--c-muted)">Sort</span>
          <OptionDropdown block value={sortValue} onChange={onSortChoice} label="Sort the apps" options={SORT_CHOICES} />
        </div>

        {/* phones: one card per app */}
        <ul className={`relative mt-3 flex flex-col gap-2 md:hidden ${loading && data ? 'opacity-60' : ''}`}>
          <LoadingBar as="li" active={loading && !!data} className="absolute inset-0 z-10 md:hidden" />
          {!data && loading && Array.from({ length: 4 }, (_, i) => <li key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />)}
          {data && data.apps.length === 0 && <li className="rounded-xl bg-(--c-page) px-4 py-8 text-center text-sm text-(--c-text-3)">{search || source ? 'No apps match.' : 'No apps were created in this period.'}</li>}
          {data?.apps.map((app) => (
            <li key={app.id} className={`relative rounded-xl border border-gray-200 p-3 ${app.ownerMemberId ? 'transition-colors hover:bg-(--c-accent-soft)/50' : ''}`}>
              {app.ownerMemberId && (
                <Link
                  to={`/registrations/${app.ownerMemberId}`}
                  state={{ backLabel: 'New Apps' }}
                  aria-label={`View ${app.owner || 'the creator'}'s activity for ${app.name}`}
                  className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-accent)"
                />
              )}
              <div className="flex items-start gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-xs font-bold text-amber-700">{initials(app.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold">{app.name}</p>
                  {app.ownerApps > 1 && <span className="mt-0.5 inline-block rounded-full bg-amber-50 px-2 py-px text-[0.7rem] font-semibold text-amber-700">{app.ownerApps} apps by this person</span>}
                </div>
              </div>
              <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-gray-100 pt-2.5 text-xs">
                <div className="min-w-0">
                  <dt className="font-semibold uppercase tracking-wide text-(--c-muted)">Built by</dt>
                  <dd className="truncate text-(--c-text-2)">
                    {app.owner || dash}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-(--c-muted)">Mobile</dt>
                  <dd className="tabular-nums text-(--c-text-2)">{app.ownerMobile || dash}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="font-semibold uppercase tracking-wide text-(--c-muted)">Came from</dt>
                  <dd className="text-(--c-text-2)">{[app.sourceLabel, app.platform !== app.sourceLabel && app.platform].filter(Boolean).join(' · ')}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-(--c-muted)">Created</dt>
                  <dd className="text-(--c-text-2)">{formatDateTime(app.createdAt)}</dd>
                </div>
                {app.campaign && (
                  <div className="col-span-2">
                    <dt className="font-semibold uppercase tracking-wide text-(--c-muted)">Campaign</dt>
                    <dd className="line-clamp-2 text-(--c-text-2)">{app.campaign}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>

        <ScrollTable className="mt-3 hidden md:block" busy={loading && !!data}>
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr>
                <SortableTh label="App" sortKey="app" sort={sort} onSort={onSort} />
                <SortableTh label="Built by" sortKey="owner" sort={sort} onSort={onSort} />
                <SortableTh label="Mobile" sortKey="mobile" sort={sort} onSort={onSort} />
                <SortableTh label="Came from" sortKey="source" sort={sort} onSort={onSort} />
                <SortableTh label="Created at" sortKey="createdAt" sort={sort} onSort={onSort} />
              </tr>
            </thead>
            <tbody className={`divide-y divide-gray-100 ${loading && data ? 'opacity-60' : ''}`}>
              {!data &&
                loading &&
                Array.from({ length: 6 }, (_, i) => (
                  <tr key={i}>
                    <td colSpan={COLUMNS} className="px-4 py-3.5">
                      <div className="h-5 animate-pulse rounded bg-gray-100" />
                    </td>
                  </tr>
                ))}

              {data && data.apps.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS} className="px-4 py-12 text-center text-(--c-text-3)">
                    {search || source ? 'No apps match.' : 'No apps were created in this period.'}
                  </td>
                </tr>
              )}

              {data?.apps.map((app) => (
                <tr
                  key={app.id}
                  onClick={(event) => {
                    if (app.ownerMemberId && !event.target.closest('a')) {
                      navigate(`/registrations/${app.ownerMemberId}`, { state: { backLabel: 'New Apps' } });
                    }
                  }}
                  className={`transition-colors hover:bg-(--c-accent-soft)/50 ${app.ownerMemberId ? 'cursor-pointer' : ''}`}
                >
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-xs font-bold text-amber-700">{initials(app.name)}</span>
                      <span className="min-w-0">
                        {app.ownerMemberId ? (
                          <Link to={`/registrations/${app.ownerMemberId}`} state={{ backLabel: 'New Apps' }} title="See what this app's creator did" className="block break-words font-semibold hover:text-(--c-link) hover:underline">
                            {app.name}
                          </Link>
                        ) : (
                          <span className="block break-words font-semibold">{app.name}</span>
                        )}
                        {app.ownerApps > 1 && <span className="mt-0.5 inline-block rounded-full bg-amber-50 px-2 py-px text-[0.7rem] font-semibold text-amber-700">{app.ownerApps} apps by this person</span>}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {app.ownerMemberId ? (
                      <Link to={`/registrations/${app.ownerMemberId}`} state={{ backLabel: 'New Apps' }} title="See what this person did" className="font-medium hover:text-(--c-link) hover:underline">
                        {app.owner || <span className="font-normal text-(--c-faint)">No name</span>}
                      </Link>
                    ) : (
                      app.owner || dash
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-(--c-text-2)">{app.ownerMobile || dash}</td>
                  <td className="px-4 py-3 text-(--c-text-2)">
                    <span className="whitespace-nowrap">{app.sourceLabel}</span>
                    {(app.platform && app.platform !== app.sourceLabel) || app.campaign ? (
                      <p className="line-clamp-2 max-w-64 text-xs text-(--c-muted)">{[app.platform !== app.sourceLabel && app.platform, app.campaign].filter(Boolean).join(' · ')}</p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-(--c-text-2)">{formatDateTime(app.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollTable>

        {data && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filtered}
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

export default NewAppsPage;

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';

import BackLink from '../../../components/BackLink';
import Pagination from '../../../components/Pagination';
import OptionDropdown from '../../../components/OptionDropdown';
import PeriodDropdown from '../../../components/PeriodDropdown';
import LoadingBar from '../../../components/LoadingBar';
import ScrollTable from '../../../components/ScrollTable';
import SearchInput from '../../../components/SearchInput';
import SortableTh from '../../../components/SortableTh';
import { formatDateTime } from '../../../utils/formatDate';
import { formatPercent, percentOf } from '../../../utils/percent';
import SourceIcon from '../components/SourceIcon';
import { useOtpNotLogin } from '../hooks/useOtpNotLogin';
import { sourceByKey } from '../utils/sources';

const COLUMNS = 6;
const card = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]';
const dash = <span className="text-(--c-faint)">—</span>;
const number = (value) => value.toLocaleString('en-IN');

// the three groups a member can be shown in: each is a big tile the page can be switched with
const STATUSES = [
  { value: 'all', label: 'All members', short: 'All', hint: 'Everyone who registered', tone: '#0f9488' },
  { value: 'notLoggedIn', label: 'Not logged in', short: 'Not logged in', hint: 'Registered, never logged in', tone: '#dc2626' },
  { value: 'loggedIn', label: 'Logged in', short: 'Logged in', hint: 'Registered and logged in', tone: '#16a34a' },
];

// the page's sections, as shortcuts in the top bar
const SECTIONS = [
  { id: 'summary', label: 'Summary' },
  { id: 'sources', label: 'Sources' },
  { id: 'people', label: 'People' },
];

// the same sorts the column headings give, as a list (for the phone's card list)
const SORT_CHOICES = [
  { value: 'registeredAt:desc', label: 'Newest first' },
  { value: 'registeredAt:asc', label: 'Oldest first' },
  { value: 'name:asc', label: 'Name A–Z' },
  { value: 'name:desc', label: 'Name Z–A' },
  { value: 'source:asc', label: 'Source A–Z' },
  { value: 'status:asc', label: 'Not logged in first' },
];

const initials = (person) => (person.name ?? '').trim().slice(0, 1).toUpperCase() || '#';

/**
 * The SETU app members who registered in the period (the two numbers on the dashboard's OTP card): switch between all / not logged in /
 * logged in, see where they came from and which campaign, and sort the people by any column.
 */
function OtpNotLoginPage() {
  const [params] = useSearchParams();

  // opens on the period chosen on the dashboard
  const [period, setPeriod] = useState(() => ({
    range: params.get('range') || '7d',
    from: params.get('from') || undefined,
    to: params.get('to') || undefined,
  }));
  const [status, setStatus] = useState(() => (STATUSES.some((item) => item.value === params.get('status')) ? params.get('status') : 'notLoggedIn'));
  const [sort, setSort] = useState({ key: 'registeredAt', dir: 'desc' });
  const [source, setSource] = useState();
  const [campaign, setCampaign] = useState();
  const [openSource, setOpenSource] = useState();

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

  const { data, loading, error } = useOtpNotLogin(period, { status, source, campaign, search, sort, page, pageSize });
  const total = data?.total ?? 0;
  const filtered = data?.filteredTotal ?? 0;
  const counts = data?.counts;

  // the section on screen is highlighted in the top bar
  const ready = Boolean(data);
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
    setSource(undefined);
    setCampaign(undefined);
    setPage(1);
  };
  const onSort = (key) => {
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc' }));
    setPage(1);
  };
  const changeStatus = (value) => {
    setStatus(value);
    setSource(undefined);
    setCampaign(undefined);
    setPage(1);
  };
  const pick = (nextSource, nextCampaign) => {
    setSource(nextSource);
    setCampaign(nextCampaign);
    setPage(1);
    if (nextSource) document.getElementById('people')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const filterLabel = [source && data?.sources.find((s) => s.key === source)?.label, campaign].filter(Boolean).join(' · ');
  const statusLabel = STATUSES.find((item) => item.value === status)?.label;

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
                value={status}
                onChange={changeStatus}
                label="Show members"
                icon={
                  <svg viewBox="0 0 20 20" className="h-4 w-4 text-(--c-link)" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="10" cy="7" r="3" />
                    <path d="M4 16.5c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5" />
                  </svg>
                }
                options={STATUSES.map((item) => ({ value: item.value, label: item.short, tone: item.tone, count: counts?.[item.value] }))}
              />
              <div className="shrink-0">
                <PeriodDropdown filter={period} onChange={onPeriodChange} />
              </div>
            </div>
          </>,
          slot
        )}

      <header className="mt-4">
        <h1 className="text-3xl font-bold tracking-tight">OTP Members</h1>
        <p className="mt-1 max-w-2xl text-(--c-text-3)">
          People who registered on the SETU app. Pick a group below to see who they are, where they came from and whether they ever logged in.
        </p>
      </header>

      {/* phones: the top bar has no room, so the same controls sit in a bar that stays under it */}
      <div className="sticky top-16 z-10 -mx-1 mt-3 flex flex-col gap-2 bg-(--c-page)/95 px-1 py-2 backdrop-blur md:hidden">
        <div className="flex gap-2">
          <OptionDropdown
            block
            value={status}
            onChange={changeStatus}
            label="Show members"
            icon={
              <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-(--c-link)" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="10" cy="7" r="3" />
                <path d="M4 16.5c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5" />
              </svg>
            }
            options={STATUSES.map((item) => ({ value: item.value, label: item.short, tone: item.tone, count: counts?.[item.value] }))}
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

      {/* 1. summary: pick the group, pick the period */}
      <section id="summary" className={`${card} mt-5 scroll-mt-48 md:scroll-mt-20 animate-page`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold">Summary</h2>
            <p className="text-sm text-(--c-text-3)">Tap a group to see its people. The date range is when they registered.</p>
          </div>
        </div>

        <div className="stagger mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          {STATUSES.map((item) => {
            const active = status === item.value;
            const count = counts?.[item.value];
            const share = counts ? percentOf(count, counts.all) : null;
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={active}
                onClick={() => changeStatus(item.value)}
                style={{ '--tone': item.tone }}
                className={`group relative cursor-pointer overflow-hidden rounded-2xl border p-3 text-left transition duration-200 sm:p-4 hover:-translate-y-1 hover:shadow-[0_14px_28px_-12px_color-mix(in_srgb,var(--tone)_60%,transparent)] ${
                  active ? 'border-(--tone) bg-[color-mix(in_srgb,var(--tone)_8%,white)] shadow-[0_8px_20px_-10px_color-mix(in_srgb,var(--tone)_60%,transparent)]' : 'border-gray-200 bg-white'
                }`}
              >
                <span className="absolute inset-x-0 top-0 h-1 bg-(--tone)" aria-hidden="true" />
                <span className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-[0.62rem] font-bold uppercase leading-3.5 tracking-[0.06em] text-(--c-muted) sm:gap-2 sm:text-xs sm:tracking-[0.08em]">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-(--tone)" aria-hidden="true" />
                    {item.label}
                  </span>
                  {active && <span className="hidden rounded-full bg-(--tone) px-2 py-px text-[0.65rem] font-bold text-white sm:inline">Showing</span>}
                </span>
                {counts ? (
                  <span className="mt-2 flex flex-wrap items-baseline gap-x-2">
                    <span className="text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{number(count)}</span>
                    {item.value !== 'all' && share !== null && <span className="text-sm font-semibold text-(--c-muted)">{formatPercent(share)}%</span>}
                  </span>
                ) : (
                  <span className="mt-2 block h-8 w-14 animate-pulse rounded bg-gray-100 sm:h-9 sm:w-20" />
                )}
                <span className="mt-1 hidden text-xs text-(--c-muted) sm:block">{item.hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. where they came from: source, then the campaigns inside it */}
      <section id="sources" className={`${card} mt-4 scroll-mt-48 md:scroll-mt-20 animate-page [animation-delay:80ms]`}>
        <div>
          <h2 className="text-base font-semibold">Where they came from</h2>
          <p className="text-sm text-(--c-text-3)">
            {statusLabel} · tap a source to open its campaigns, then tap one to list only those people.
          </p>
        </div>

        {!data && loading && <div className="mt-4 h-24 animate-pulse rounded-xl bg-gray-100" />}
        {data && data.sources.length === 0 && <p className="mt-4 rounded-xl bg-(--c-page) px-4 py-6 text-center text-sm text-(--c-muted)">No one in this group for this period.</p>}

        <ul className="stagger mt-4 flex flex-col gap-2">
          {data?.sources.map((group) => {
            const meta = sourceByKey(group.key);
            const open = openSource === group.key || source === group.key;
            const share = percentOf(group.count, total) ?? 0;
            return (
              <li key={group.key} className="rounded-xl bg-(--c-page)">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenSource(open ? undefined : group.key)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-white"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: meta?.color }}>
                    <SourceIcon sourceKey={group.key} letter={meta?.letter} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold">{group.label}</span>
                      <span className="shrink-0 tabular-nums">
                        <b className="text-lg">{number(group.count)}</b> <span className="text-xs text-(--c-muted)">{formatPercent(share)}%</span>
                      </span>
                    </span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-gray-200">
                      <span className="block h-full origin-left animate-grow rounded-full" style={{ width: `${share}%`, background: meta?.color }} />
                    </span>
                  </span>
                  <span className={`shrink-0 text-(--c-muted) transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">
                    ▾
                  </span>
                </button>

                {open && (
                  <div className="animate-reveal px-4 pb-3">
                    <button
                      type="button"
                      onClick={() => pick(group.key)}
                      className={`mb-2 cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition ${source === group.key && !campaign ? 'bg-(--c-link) text-white' : 'bg-white text-(--c-link) hover:shadow-sm'}`}
                    >
                      Show all {number(group.count)} from {group.label}
                    </button>
                    <ul className="flex flex-col gap-1">
                      {group.campaigns.map((item) => {
                        const active = source === group.key && campaign === item.name;
                        return (
                          <li key={item.name}>
                            <button
                              type="button"
                              onClick={() => pick(group.key, item.name)}
                              className={`flex w-full cursor-pointer flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg px-3 py-2 text-left text-sm transition ${active ? 'bg-white shadow-sm ring-1 ring-(--c-link)' : 'bg-white/60 hover:bg-white'}`}
                            >
                              <span className="min-w-0 break-words font-medium">{item.name}</span>
                              <span className="flex shrink-0 items-center gap-2">
                                {item.platforms.map((p) => (
                                  <span key={p.label} className="rounded-full bg-(--c-page) px-2 py-px text-xs text-(--c-text-2)">
                                    {p.label} <b>{number(p.count)}</b>
                                  </span>
                                ))}
                                <b className="tabular-nums">{number(item.count)}</b>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* 3. who they are */}
      <section id="people" className={`${card} mt-4 scroll-mt-48 md:scroll-mt-20 animate-page [animation-delay:160ms]`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-base font-semibold">People</h2>
            {data && <span className="rounded-full bg-(--c-accent-soft) px-2.5 py-0.5 text-xs font-semibold text-(--c-link)">{number(filtered)}</span>}
            <span className="rounded-full bg-(--c-page) px-2.5 py-0.5 text-xs font-semibold text-(--c-text-2)">{statusLabel}</span>
            {filterLabel && (
              <button type="button" onClick={() => pick()} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100">
                {filterLabel} <span aria-hidden="true">✕</span>
                <span className="sr-only">Clear filter</span>
              </button>
            )}
          </div>
          <div className="sm:w-72">
            <SearchInput value={input} onChange={setInput} placeholder="Search name or mobile number" label="Search people" />
          </div>
        </div>
        <p className="mt-1 hidden text-xs text-(--c-muted) md:block">Tap a column heading to sort. Tap a name to see everything that person did.</p>
        <div className="mt-3 flex items-center gap-2 md:hidden">
          <span className="shrink-0 text-xs font-semibold text-(--c-muted)">Sort</span>
          <OptionDropdown block value={sortValue} onChange={onSortChoice} label="Sort the people" options={SORT_CHOICES} />
        </div>

        {/* phones: one card per person */}
        <ul className={`relative mt-3 flex flex-col gap-2 md:hidden ${loading && data ? 'opacity-60' : ''}`}>
          <LoadingBar as="li" active={loading && !!data} className="absolute inset-0 z-10 md:hidden" />
          {!data && loading && Array.from({ length: 4 }, (_, i) => <li key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />)}
          {data && data.people.length === 0 && (
            <li className="rounded-xl bg-(--c-page) px-4 py-8 text-center text-sm text-(--c-text-3)">{search || filterLabel ? 'No one matches.' : 'No one in this group for this period.'}</li>
          )}
          {data?.people.map((person) => (
            <li key={person.id} className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/registrations/${person.id}`} className="group flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--c-accent-soft) text-xs font-bold text-(--c-link)">{initials(person)}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold group-hover:text-(--c-link)">{person.name || <span className="font-normal text-(--c-faint)">No name</span>}</span>
                    <span className="block text-sm tabular-nums text-(--c-text-2)">{person.mobile || dash}</span>
                  </span>
                </Link>
                <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${person.loggedIn ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${person.loggedIn ? 'bg-green-500' : 'bg-red-500'}`} aria-hidden="true" />
                  {person.loggedIn ? 'Logged in' : 'Not logged in'}
                </span>
              </div>
              <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-gray-100 pt-2.5 text-xs">
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-(--c-muted)">Source</dt>
                  <dd className="text-(--c-text-2)">{[person.sourceLabel, person.platform].filter(Boolean).join(' · ')}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-(--c-muted)">Registered</dt>
                  <dd className="text-(--c-text-2)">{formatDateTime(person.registeredAt)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="font-semibold uppercase tracking-wide text-(--c-muted)">Campaign</dt>
                  <dd className="line-clamp-2 text-(--c-text-2)">{person.campaign}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>

        <ScrollTable className="mt-3 hidden md:block" busy={loading && !!data}>
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr>
                <SortableTh label="Name" sortKey="name" sort={sort} onSort={onSort} />
                <SortableTh label="Mobile" sortKey="mobile" sort={sort} onSort={onSort} />
                <SortableTh label="Status" sortKey="status" sort={sort} onSort={onSort} />
                <SortableTh label="Source" sortKey="source" sort={sort} onSort={onSort} />
                <SortableTh label="Campaign" sortKey="campaign" sort={sort} onSort={onSort} />
                <SortableTh label="Registered at" sortKey="registeredAt" sort={sort} onSort={onSort} />
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

              {data && data.people.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS} className="px-4 py-12 text-center text-(--c-text-3)">
                    {search || filterLabel ? 'No one matches.' : 'No one in this group for this period.'}
                  </td>
                </tr>
              )}

              {data?.people.map((person) => (
                <tr key={person.id} className="transition-colors hover:bg-(--c-accent-soft)/50">
                  <td className="px-4 py-3">
                    <Link to={`/registrations/${person.id}`} title="See what this person did" className="group flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--c-accent-soft) text-xs font-bold text-(--c-link)">{initials(person)}</span>
                      <span className="font-semibold group-hover:text-(--c-link) group-hover:underline">{person.name || <span className="font-normal text-(--c-faint)">No name</span>}</span>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-(--c-text-2)">{person.mobile || dash}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${person.loggedIn ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${person.loggedIn ? 'bg-green-500' : 'bg-red-500'}`} aria-hidden="true" />
                      {person.loggedIn ? 'Logged in' : 'Not logged in'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-(--c-text-2)">
                    {person.sourceLabel}
                    {person.platform && <p className="text-xs text-(--c-muted)">{person.platform}</p>}
                  </td>
                  <td className="max-w-64 px-4 py-3 text-(--c-text-2)">
                    <span className="line-clamp-2" title={person.campaign}>
                      {person.campaign}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-(--c-text-2)">{formatDateTime(person.registeredAt)}</td>
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

export default OtpNotLoginPage;

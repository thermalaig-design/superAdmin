import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import BackLink from '../../../components/BackLink';
import Pagination from '../../../components/Pagination';
import PeriodFilter from '../../../components/PeriodFilter';
import ScrollTable from '../../../components/ScrollTable';
import SearchInput from '../../../components/SearchInput';
import { HeadCell } from '../../../components/SortableTh';
import { formatDateTime } from '../../../utils/formatDate';
import { useAppLogins } from '../hooks/useAppLogins';

const COLUMNS = 6;
const PLATFORMS = { android: 'Android', ios: 'iOS', web: 'Web' };
const METHODS = { otp: 'Mobile OTP', secret_code: 'Secret code' };
const dash = <span className="text-(--c-faint)">—</span>;

/** Every login to one app in the selected period (the number behind "App Logins" on the dashboard): who, how, from where. */
function AppLoginsPage() {
  const { trustId } = useParams();
  const [params] = useSearchParams();

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(input.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  const { data, loading, error } = useAppLogins(trustId, period, { search, page, pageSize });
  const total = data?.total ?? 0;

  return (
    <div className="mx-auto max-w-6xl">
      <BackLink to="/" label="Back to Dashboard" />
      <h1 className="mt-3 text-3xl font-bold tracking-tight">{data ? `${data.trust.name} · App Logins` : 'App Logins'}</h1>
      <p className="mt-1 text-(--c-text-3)">
        {data && !search
          ? `${total.toLocaleString('en-IN')} login${total === 1 ? '' : 's'} by ${data.uniqueMembers.toLocaleString('en-IN')} different ${data.uniqueMembers === 1 ? 'person' : 'people'} in the selected period.`
          : 'Every time someone logged in to this app in the selected period.'}
      </p>

      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]">
        <p className="text-sm font-semibold">Logins in</p>
        <div className="mt-2">
          <PeriodFilter
            filter={period}
            onChange={(patch) => {
              setPeriod((prev) => ({
                ...prev,
                ...patch,
                ...(patch.range && patch.range !== 'custom' ? { from: undefined, to: undefined } : {}),
              }));
              setPage(1);
            }}
          />
        </div>
      </div>

      <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold">Logins</h2>
            {data && <span className="rounded-full bg-(--c-accent-soft) px-2.5 py-0.5 text-xs font-semibold text-(--c-link)">{total.toLocaleString('en-IN')}</span>}
          </div>
          <div className="sm:w-72">
            <SearchInput value={input} onChange={setInput} placeholder="Search name or mobile number" label="Search logins" />
          </div>
        </div>

        <ScrollTable className="mt-4" busy={loading && !!data}>
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr>
                <HeadCell>Name</HeadCell>
                <HeadCell>Mobile</HeadCell>
                <HeadCell>Platform</HeadCell>
                <HeadCell>Login method</HeadCell>
                <HeadCell>Location</HeadCell>
                <HeadCell>Logged in at</HeadCell>
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

              {data && data.logins.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS} className="px-4 py-12 text-center text-(--c-text-3)">
                    {search ? 'No logins match your search.' : 'No logins in this period.'}
                  </td>
                </tr>
              )}

              {data?.logins.map((login) => (
                <tr key={login.id}>
                  <td className="px-4 py-3 font-semibold">
                    {login.memberId && login.name ? (
                      <Link to={`/member-insights/${login.memberId}/trusts`} state={{ backLabel: 'App Logins', section: '/' }} title="See this member's apps" className="hover:text-(--c-link) hover:underline">
                        {login.name}
                      </Link>
                    ) : (
                      login.name || <span className="font-normal text-(--c-faint)">Unknown</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-(--c-text-2)">{login.mobile || dash}</td>
                  <td className="px-4 py-3 text-(--c-text-2)">
                    {PLATFORMS[login.platform] ?? login.platform ?? dash}
                    {login.device && <p className="text-xs text-(--c-muted)">{login.device}</p>}
                  </td>
                  <td className="px-4 py-3 text-(--c-text-2)">{METHODS[login.method] ?? login.method ?? dash}</td>
                  <td className="px-4 py-3 text-(--c-text-2)">{[login.city, login.state].filter(Boolean).join(', ') || dash}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-(--c-text-2)">{login.at ? formatDateTime(login.at) : '—'}</td>
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

export default AppLoginsPage;

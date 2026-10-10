import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import Avatar from '../../../components/Avatar';
import ScrollTable from '../../../components/ScrollTable';
import SearchInput from '../../../components/SearchInput';
import SortableTh from '../../../components/SortableTh';
import { formatDateTime } from '../../../utils/formatDate';
import { useMemberTrusts } from '../hooks/useMemberTrusts';
import { FIRST_DIRECTION, formatJoinedDate, searchMemberTrusts, sortMemberTrusts } from '../utils/memberTrusts';

const Empty = () => <span className="text-[#9aa0b4]">—</span>;

/** One bar holding all the counts, divided into equal parts. */
function SummaryBar({ summary }) {
  const items = [
    ['Total', summary.total],
    ['Active', summary.active],
    ['Inactive', summary.inactive],
  ];

  return (
    <div className="mt-6 grid max-w-md grid-cols-3 divide-x divide-gray-200 rounded-xl border border-gray-200 bg-[#fbf6f3]">
      {items.map(([label, value]) => (
        <div key={label} className="px-4 py-3">
          <p className="text-xs font-medium text-[#5b627a]">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
        </div>
      ))}
    </div>
  );
}

function MemberTrustsPage() {
  const { memberId } = useParams();
  const { data, loading, error } = useMemberTrusts(memberId);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'registeredAt', dir: 'asc' });

  const rows = useMemo(
    () => sortMemberTrusts(searchMemberTrusts(data?.trusts ?? [], search), sort),
    [data, search, sort]
  );

  const onSort = (key) =>
    setSort((current) =>
      current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: FIRST_DIRECTION[key] }
    );

  const member = data?.member;

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/member-insights" className="text-sm font-medium text-[#b04a4f] hover:underline">
        ← Back to Member Insights
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Trusts of {member ? member.name ?? 'Unnamed member' : 'member'}</h1>
      {member && (
        <p className="mt-1 text-[#5b627a]">
          {[member.mobile, member.email, member.companyName].filter(Boolean).join(' · ') || 'Every trust this member is registered in.'}
        </p>
      )}

      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {data && <SummaryBar summary={data.summary} />}

      {!error && (
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold">All Trusts</h2>
            <div className="sm:w-72">
              <SearchInput value={search} onChange={setSearch} placeholder="Search trust, role or number" label="Search trusts" />
            </div>
          </div>

          <ScrollTable className="mt-4">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr>
                  <SortableTh label="Trust" sortKey="name" sort={sort} onSort={onSort} />
                  <SortableTh label="Role" sortKey="role" sort={sort} onSort={onSort} />
                  <SortableTh label="Membership No." sortKey="membershipNumber" sort={sort} onSort={onSort} />
                  <SortableTh label="Joined" sortKey="joinedDate" sort={sort} onSort={onSort} />
                  <SortableTh label="Status" sortKey="isActive" sort={sort} onSort={onSort} />
                  <SortableTh label="Last Activity" sortKey="lastActivityAt" sort={sort} onSort={onSort} />
                  <SortableTh label="Registered At" sortKey="registeredAt" sort={sort} onSort={onSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading &&
                  Array.from({ length: 5 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-4 py-3.5">
                        <div className="h-5 animate-pulse rounded bg-gray-100" />
                      </td>
                    </tr>
                  ))}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-[#5b627a]">
                      {search ? 'No trusts match your search.' : 'This member is not registered in any trust.'}
                    </td>
                  </tr>
                )}

                {rows.map((trust) => (
                  <tr key={trust.registrationId}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={trust.name} logoUrl={trust.logoUrl} />
                        <div className="min-w-0">
                          {trust.trustId ? (
                            <Link
                              to={`/member-insights/${memberId}/activity?trust=${trust.trustId}`}
                              title="View this member's activity in this trust"
                              className="font-semibold text-[#b04a4f] hover:underline">
                              {trust.name}
                            </Link>
                          ) : (
                            <span className="font-semibold">{trust.name}</span>
                          )}
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-[#5b627a]">
                            {trust.appType && <span>{trust.appType}</span>}
                            {trust.isPrimary && (
                              <span className="rounded-full bg-[#fde6d6] px-2 py-0.5 font-medium text-[#b04a4f]">Primary</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-[#3a3f55]">{trust.role ?? <Empty />}</td>
                    <td className="px-4 py-3 tabular-nums text-[#3a3f55]">{trust.membershipNumber ?? <Empty />}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#3a3f55]">{formatJoinedDate(trust.joinedDate) ?? <Empty />}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                          trust.isActive ? 'bg-[#dff3e5] text-[#1f6b34]' : 'bg-gray-100 text-[#5b627a]'
                        }`}
                      >
                        {trust.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#3a3f55]">{trust.lastActivityAt ? formatDateTime(trust.lastActivityAt) : <Empty />}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#3a3f55]">{formatDateTime(trust.registeredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollTable>
        </section>
      )}
    </div>
  );
}

export default MemberTrustsPage;

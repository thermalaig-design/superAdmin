import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import ScrollTable from '../../../components/ScrollTable';
import { PlatformTile } from './PlatformCard';
import { useEditPath } from '../hooks/useEditPath';
import { useTargetsView } from '../hooks/useTargetsView';
import { count, money, STATUS } from '../utils/targetMath';

const COLUMNS = [
  { key: 'name', label: 'Campaign' },
  { key: 'spend', label: 'Spend' },
  { key: 'installs', label: 'Installs' },
  { key: 'registrations', label: 'Registrations' },
  { key: 'costPerRegistration', label: 'CPR', tip: 'Cost per registration: spend ÷ registrations' },
  { key: 'apps', label: 'Apps created' },
  { key: 'costPerApp', label: '★ Cost/App', tip: 'Cost per app: spend ÷ apps created. Lower is better.' },
  { key: 'target', label: 'Target' },
  { key: 'status', label: 'Status' },
];

function StatusPill({ status }) {
  if (!status) return <span className="text-(--c-faint)">—</span>;
  const { label, color, bg } = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: bg, color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  );
}

const sortValue = (row, key) => (key === 'status' ? (row.status ? STATUS[row.status].order : null) : row[key]);

/** A small pencil that opens the target form of this campaign (or of the overall target). */
function EditTarget({ to = '/targets/set-target', platform = null, name }) {
  const [, setView] = useTargetsView();
  return (
    <Link
      to={to}
      onClick={(event) => {
        event.stopPropagation();
        setView({ platform });
      }}
      title={`Edit the target of ${name}`}
      aria-label={`Edit the target of ${name}`}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-(--c-muted) transition hover:bg-(--c-accent-soft) hover:text-(--c-link) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-accent)"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16v4Z" />
        <path d="m13.5 6.5 4 4" />
      </svg>
    </Link>
  );
}

/** The campaigns as a table: sortable columns, a total row, and a pencil by each target that opens its form. */
function Scorecard({ rows, totals, flashId }) {
  const editPath = useEditPath();
  const [sort, setSort] = useState(null); // { key, dir } or null = original order
  const [openCampaigns, setOpenCampaigns] = useState(() => new Set());

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = sortValue(a, sort.key);
      const y = sortValue(b, sort.key);
      if (x === null || x === undefined) return 1; // empty values always go last
      if (y === null || y === undefined) return -1;
      return (typeof x === 'string' ? x.localeCompare(y) : x - y) * factor;
    });
  }, [rows, sort]);

  const onSort = (key) => setSort((current) => (current?.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  return (
    <ScrollTable>
      <table className="w-full min-w-[920px] text-sm">
        <thead className="bg-(--c-page)">
          <tr>
            {COLUMNS.map(({ key, label, tip }) => {
              const active = sort?.key === key;
              return (
                <th key={key} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-3 py-3 text-left text-xs font-bold uppercase tracking-[0.06em] text-(--c-text)">
                  <button
                    type="button"
                    onClick={() => onSort(key)}
                    title={tip ?? `Sort by ${label}`}
                    className="flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-md uppercase hover:text-(--c-link) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-accent)"
                  >
                    {label}
                    <span className={`text-[0.7rem] ${active ? 'text-(--c-link)' : 'text-(--c-faint)'}`} aria-hidden="true">
                      {active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sorted.map((row) => {
                const color = row.status ? STATUS[row.status].color : undefined;
                const isOpen = openCampaigns.has(row.id);
                const canExpand = Boolean(row.adSets?.length);
                const toggleCampaign = () => setOpenCampaigns((current) => {
                  const next = new Set(current);
                  next.has(row.id) ? next.delete(row.id) : next.add(row.id);
                  return next;
                });
                return (
                  <Fragment key={row.id}>
              <tr
                id={`row-${row.id}`}
                onClick={canExpand ? toggleCampaign : undefined}
                onKeyDown={canExpand ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleCampaign();
                  }
                } : undefined}
                tabIndex={canExpand ? 0 : undefined}
                aria-expanded={canExpand ? isOpen : undefined}
                className={`transition-colors duration-500 hover:bg-gray-50 ${canExpand ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-(--c-accent)' : ''} ${flashId === row.id ? 'bg-(--c-accent-soft)' : ''}`}
              >
                <td className="px-3 py-3 font-semibold">
                  <div className="flex items-center gap-2">
                    <PlatformTile platform={row.platform} className="h-7 w-7 rounded-lg [&_svg]:h-4 [&_svg]:w-4" />
                    {canExpand ? <span className="text-left">{row.name}<span className="ml-2 text-xs text-(--c-muted)">{isOpen ? '▲' : '▼'}</span></span> : row.name}
                  </div>
                </td>
                <td className="px-3 py-3 tabular-nums">{money(row.spend)}</td>
                <td className="px-3 py-3 tabular-nums">{count(row.installs)}</td>
                <td className="px-3 py-3 tabular-nums">{count(row.registrations)}</td>
                <td className="px-3 py-3 tabular-nums">{money(row.costPerRegistration)}</td>
                <td className="px-3 py-3 tabular-nums">{count(row.apps)}</td>
                <td className="px-3 py-3 font-bold tabular-nums" style={{ color }}>{money(row.costPerApp)}</td>
                <td className="px-3 py-3 tabular-nums">
                  <span className="flex items-center gap-1">
                    {money(row.target)}
                    <EditTarget to={editPath(row)} platform={row.platform} name={row.name} />
                  </span>
                </td>
                <td className="px-3 py-3"><StatusPill status={row.status} /></td>
              </tr>
              {isOpen && row.adSets?.map((adSet) => (
                <tr key={`${row.id}-${adSet.id}`} className="bg-(--c-page)/70 text-(--c-text-2)">
                  <td className="px-3 py-2 pl-12 font-medium">
                    <span className="flex items-center gap-2"><span className="ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-(--c-muted)" aria-hidden="true" />{adSet.name}</span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{money(adSet.spend)}</td>
                  <td className="px-3 py-2 tabular-nums">{count(adSet.installs)}</td>
                  <td className="px-3 py-2 tabular-nums">{count(adSet.registrations)}</td>
                  <td className="px-3 py-2 tabular-nums">{money(adSet.costPerRegistration)}</td>
                  <td className="px-3 py-2 tabular-nums">{count(adSet.apps)}</td>
                  <td className="px-3 py-2 font-bold tabular-nums" style={{ color: adSet.status ? STATUS[adSet.status].color : undefined }}>{money(adSet.costPerApp)}</td>
                  <td className="px-3 py-2 tabular-nums">
                    <span className="flex items-center gap-1">
                      {money(adSet.target)}
                      <EditTarget to={editPath(row)} platform={row.platform} name={`${row.name} ad set ${adSet.name}`} />
                    </span>
                  </td>
                  <td className="px-3 py-2"><StatusPill status={adSet.status} /></td>
                </tr>
              ))}
                  </Fragment>
                );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300 bg-(--c-page) font-bold">
            <td className="px-3 py-3">All campaigns</td>
            <td className="px-3 py-3 tabular-nums">{money(totals.spend)}</td>
            <td className="px-3 py-3 tabular-nums">{count(totals.installs)}</td>
            <td className="px-3 py-3 tabular-nums">{count(totals.registrations)}</td>
            <td className="px-3 py-3 tabular-nums">{money(totals.costPerRegistration)}</td>
            <td className="px-3 py-3 tabular-nums">{count(totals.apps)}</td>
            <td className="px-3 py-3 tabular-nums" style={{ color: totals.status ? STATUS[totals.status].color : undefined }}>{money(totals.costPerApp)}</td>
            <td className="px-3 py-3 tabular-nums">
              <span className="flex items-center gap-1">
                {money(totals.target)}
                <EditTarget name="all campaigns" />
              </span>
            </td>
            <td className="px-3 py-3"><StatusPill status={totals.status} /></td>
          </tr>
        </tfoot>
      </table>
    </ScrollTable>
  );
}

export default Scorecard;

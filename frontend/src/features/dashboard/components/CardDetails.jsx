import { Fragment, useMemo, useState } from 'react';

import { firstDirection, matchesPerson, nextSort, number, sortRows, when } from '../utils/tableHelpers';
import AppGroups from './AppGroups';
import PageDonuts from './PageDonuts';

const PAGE = 25;

const cell = (column, row) => {
  const value = row[column.key];
  if (column.type === 'date') return when(value);
  if (column.type === 'number') return number(value ?? 0);
  return value ?? '—';
};

/** A total with where it came from (the split by source is shown when all sources are). `stat` is { count, bySource: [{ key, label, count }] }. */
function StatBox({ label, note, stat, showSplit }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-(--c-muted)">{label}</p>
      <p className="mt-1.5 text-[1.75rem] font-semibold leading-none tabular-nums">{number(stat.count)}</p>
      <p className="mt-1.5 text-xs text-(--c-muted)">{note}</p>
      {showSplit && stat.bySource.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {stat.bySource.map((entry) => (
            <span key={entry.key} className="text-xs text-(--c-text-2)">
              {entry.label} <b className="font-semibold tabular-nums text-(--c-text)">{number(entry.count)}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The rows behind the picked card (the page gives it a new `key` per card and source, which clears the search and the order) for the picked source,
 * right under the source bar: searched by name or mobile number, ordered by clicking a column heading, 25 at a time.
 * The activity cards come grouped by app (see AppGroups): one row per app, with its people inside.
 * `details` is the card-details response; `title` names the card and source.
 */
function CardDetails({ title, details, loading, error }) {
  const [search, setSearch] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [openRow, setOpenRow] = useState(null); // the person whose pages are open under their row
  const [sort, setSort] = useState(null); // { key, direction }; null = the order the list came in

  const byApp = Boolean(details?.rows[0] && 'appId' in details.rows[0]);

  // the list comes ordered by most actions, else newest first: that is the starting order
  const first = details?.columns.find((column) => column.key === 'count') ?? details?.columns.find((column) => column.type === 'number') ?? details?.columns.find((column) => column.type === 'date');
  const sortKey = sort?.key ?? first?.key;
  const sortDirection = sort?.direction ?? 'desc';
  const current = sortKey ? { key: sortKey, direction: sortDirection } : null;

  // click a heading: order by it; click the same heading again: the other way round
  const sortBy = (column) => {
    setSort(nextSort(current, column));
    setOpenRow(null);
    setShown(PAGE);
  };

  const rows = useMemo(() => {
    if (!details || byApp) return [];
    const needle = search.trim().toLowerCase();
    const found = !needle ? details.rows : details.rows.filter((row) => matchesPerson(row, needle) || String(row.owner ?? '').toLowerCase().includes(needle));
    return sortRows(found, details.columns, { key: sortKey, direction: sortDirection });
  }, [details, byApp, search, sortKey, sortDirection]);

  return (
    <section className="mt-5 rounded-2xl border border-(--c-border) bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.06)] sm:p-5" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {details && (
            <p className="mt-1 text-sm text-(--c-text-3)">
              Total <b className="tabular-nums text-(--c-text)">{number(details.total)}</b>
              {details.rows.length !== details.total && <> · {number(details.rows.length)} rows</>}
            </p>
          )}
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>
      ) : loading || !details ? (
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-(--c-band)" />
      ) : (
        <>
          {details.pages && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-(--c-band) p-4">
              <p className="mb-3 text-sm font-semibold">
                Pages opened <span className="font-normal text-(--c-muted)">· {number(details.total)} times across {number(details.pages.length)} pages</span>
              </p>
              <PageDonuts pages={details.pages} />
              {details.stats && (
                <div className="mt-5 grid gap-3 border-t border-gray-200 pt-4 sm:grid-cols-2">
                  <StatBox label="Total products created" note="Products added to apps in this period" stat={details.stats.products} showSplit={!details.source} />
                  <StatBox label="Total members" note="Members who joined apps in this period (SETU app not counted)" stat={details.stats.members} showSplit={!details.source} />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {error || loading || !details ? null : (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setOpenRow(null);
              setShown(PAGE);
            }}
            placeholder={byApp ? 'Search by app, name or mobile number' : 'Search by name or mobile number'}
            className="h-10 w-full rounded-full border border-gray-300 bg-white px-4 text-sm sm:w-80"
            aria-label={byApp ? 'Search by app, name or mobile number' : 'Search by name or mobile number'}
          />
          <p className="text-xs text-(--c-muted)">{byApp ? 'Click an app to see its active members or products, a heading to sort' : 'Click a column heading to sort'}</p>
        </div>
      )}

      {error || loading || !details ? null : byApp ? (
        <AppGroups rows={details.rows} search={search} />
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-(--c-muted)">{search.trim() ? `No one matches "${search.trim()}".` : 'Nothing here in this period.'}</p>
      ) : (
        <>
          {/* Phones: one card per row (nothing to slide sideways), with a sort picker instead of the column headings */}
          <div className="mt-3 md:hidden">
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="card-sort">Sort by</label>
              <select
                id="card-sort"
                value={current?.key ?? ''}
                onChange={(event) => {
                  const column = details.columns.find((item) => item.key === event.target.value);
                  if (column) {
                    setSort({ key: column.key, direction: firstDirection(column) });
                    setOpenRow(null);
                    setShown(PAGE);
                  }
                }}
                className="h-10 min-w-0 flex-1 rounded-full border border-gray-300 bg-white px-3 text-sm"
              >
                {details.columns.map((column) => (
                  <option key={column.key} value={column.key}>Sort by {column.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setSort({ key: sortKey, direction: sortDirection === 'asc' ? 'desc' : 'asc' });
                  setOpenRow(null);
                  setShown(PAGE);
                }}
                aria-label={sortDirection === 'asc' ? 'Ascending, tap for descending' : 'Descending, tap for ascending'}
                className="h-10 w-10 shrink-0 cursor-pointer rounded-full border border-gray-300 bg-white text-sm font-semibold text-(--c-text-2)"
              >
                {sortDirection === 'asc' ? '▲' : '▼'}
              </button>
            </div>
            <ul className="mt-3 space-y-2.5">
              {rows.slice(0, shown).map((row, index) => {
                const expandable = Boolean(row.pages);
                const isOpen = expandable && openRow === index;
                const [titleColumn, ...rest] = details.columns;
                return (
                  <li key={index} className={`rounded-xl border border-gray-200 p-3 ${isOpen ? 'bg-(--c-accent-soft)' : 'bg-white'}`}>
                    <div
                      className={expandable ? 'cursor-pointer' : undefined}
                      onClick={expandable ? () => setOpenRow(isOpen ? null : index) : undefined}
                      role={expandable ? 'button' : undefined}
                    >
                      <p className="flex items-start gap-2 text-sm font-semibold">
                        <span className="shrink-0 text-xs font-medium tabular-nums text-(--c-muted)">{expandable ? (isOpen ? '▾' : '▸') : ''} {index + 1}.</span>
                        <span className="min-w-0 break-words">{cell(titleColumn, row)}</span>
                      </p>
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                        {rest.map((column) => (
                          <div key={column.key} className="min-w-0">
                            <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-(--c-muted)">{column.label}</dt>
                            <dd className={`break-words ${column.type === 'number' ? 'font-semibold tabular-nums' : ''}`}>{cell(column, row)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    {isOpen && (
                      <div className="mt-3 border-t border-gray-200 pt-3">
                        <p className="mb-3 text-sm font-semibold">
                          {row.name ?? 'This person'} <span className="font-normal text-(--c-muted)">· {number(row.count)} times across {number(row.pages.length)} pages</span>
                        </p>
                        <PageDonuts pages={row.pages} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-3 hidden overflow-x-auto rounded-xl border border-gray-200 md:block">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-(--c-band) text-xs uppercase tracking-wide text-(--c-muted)">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">#</th>
                  {details.columns.map((column) => {
                    const on = current?.key === column.key;
                    return (
                      <th key={column.key} aria-sort={on ? (current.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className={`px-3 py-2.5 font-semibold ${column.type === 'number' ? 'text-right' : ''}`}>
                        <button
                          type="button"
                          onClick={() => sortBy(column)}
                          title={`Sort by ${column.label.toLowerCase()}`}
                          className={`inline-flex cursor-pointer items-center gap-1 uppercase tracking-wide transition hover:text-(--c-text) ${on ? 'text-(--c-text)' : ''}`}
                        >
                          {column.label}
                          <span aria-hidden="true" className={on ? 'text-(--c-link)' : 'opacity-40'}>{on ? (current.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.slice(0, shown).map((row, index) => {
                  const expandable = Boolean(row.pages);
                  const isOpen = expandable && openRow === index;
                  return (
                    <Fragment key={index}>
                      <tr
                        className={`hover:bg-(--c-accent-soft) ${expandable ? 'cursor-pointer' : ''} ${isOpen ? 'bg-(--c-accent-soft)' : ''}`}
                        onClick={expandable ? () => setOpenRow(isOpen ? null : index) : undefined}
                        title={expandable ? 'Click to see which pages this person opened' : undefined}
                      >
                        <td className="px-3 py-2.5 tabular-nums text-(--c-muted)">{expandable ? (isOpen ? '▾' : '▸') : ''} {index + 1}</td>
                        {details.columns.map((column) => (
                          <td key={column.key} className={`px-3 py-2.5 ${column.type === 'number' ? 'text-right font-semibold tabular-nums' : ''}`}>{cell(column, row)}</td>
                        ))}
                      </tr>
                      {isOpen && (
                        <tr className="bg-(--c-band)">
                          <td colSpan={details.columns.length + 1} className="px-4 py-4">
                            <p className="mb-3 text-sm font-semibold">
                              {row.name ?? 'This person'} <span className="font-normal text-(--c-muted)">· {number(row.count)} times across {number(row.pages.length)} pages</span>
                            </p>
                            <PageDonuts pages={row.pages} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {shown < rows.length && (
            <button type="button" onClick={() => setShown((count) => count + PAGE * 4)} className="mt-3 cursor-pointer rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-(--c-text-2) hover:bg-gray-50">
              Show more ({number(rows.length - shown)} left)
            </button>
          )}
        </>
      )}
    </section>
  );
}

export default CardDetails;

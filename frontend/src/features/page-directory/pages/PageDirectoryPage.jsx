import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import ScrollTable from '../../../components/ScrollTable';
import SearchInput from '../../../components/SearchInput';
import { HeadCell } from '../../../components/SortableTh';
import { useApiQuery } from '../../../hooks/useApiQuery';
import { fetchPageRoutes, updatePageRoute } from '../services/pageDirectoryService';

const PLATFORMS = [
  { value: null, label: 'All' },
  { value: 'app', label: 'App' },
  { value: 'user_panel', label: 'User Panel' },
];
const PLATFORM_LABEL = { app: 'App', user_panel: 'User Panel' };
const PLATFORM_STYLE = { app: 'bg-(--c-accent-soft) text-(--c-link)', user_panel: 'bg-(--c-good-bg) text-(--c-good-text)' };

// The editable columns: the key is the field sent to the server, `column` the row property that holds its value.
const FIELDS = {
  module: { column: 'module', type: 'text', label: 'Module' },
  name: { column: 'name', type: 'text', label: 'Page name' },
  helpLink: { column: 'help_link', type: 'url', label: 'Help link', placeholder: 'https://… (empty removes it)' },
};

const INPUT = 'h-9 w-full rounded-lg border border-gray-300 bg-white px-2.5 text-sm outline-none focus:border-(--c-accent) focus:ring-2 focus:ring-(--c-accent)/20';
const ICON = { className: 'h-4.5 w-4.5', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24', 'aria-hidden': true };
const ICON_BUTTON = 'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition disabled:cursor-wait disabled:opacity-50';

/** Page Directory: every page route with its platform and module. Module, page name and help link are edited in place; route and platform are read only. */
function PageDirectoryPage() {
  const queryClient = useQueryClient();
  const { data: routes, loading, error } = useApiQuery(['page-routes'], fetchPageRoutes);

  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState(null);
  const [editing, setEditing] = useState(null); // { id, field } of the cell being edited
  const [value, setValue] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rowError, setRowError] = useState('');

  const counts = useMemo(() => {
    const result = { all: routes?.length ?? 0 };
    routes?.forEach((row) => {
      result[row.platform] = (result[row.platform] ?? 0) + 1;
    });
    return result;
  }, [routes]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (routes ?? []).filter(
      (row) =>
        (!platform || row.platform === platform) &&
        (!query || [row.route, row.module, row.name, row.help_link].some((text) => text?.toLowerCase().includes(query)))
    );
  }, [routes, search, platform]);

  const startEdit = (row, field) => {
    setRowError('');
    setEditing({ id: row.id, field });
    setValue(row[FIELDS[field].column] ?? '');
  };

  const cancel = () => {
    setEditing(null);
    setRowError('');
  };

  const save = async (row, changes) => {
    setBusyId(row.id);
    setRowError('');
    try {
      await updatePageRoute(row.id, changes);
      await queryClient.invalidateQueries({ queryKey: ['page-routes'] });
      setEditing(null);
    } catch (err) {
      setRowError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const submit = (event, row) => {
    event.preventDefault();
    save(row, { [editing.field]: value });
  };

  const removeHelpLink = (row) => {
    if (window.confirm(`Remove the help link of "${row.name}"?`)) save(row, { helpLink: '' });
  };

  /** One editable cell: the value with a pencil next to it; the pencil turns it into an input with save / cancel. */
  const renderCell = (row, field) => {
    const { column, type, placeholder, label } = FIELDS[field];
    const busy = busyId === row.id;

    if (editing?.id === row.id && editing.field === field) {
      return (
        <form onSubmit={(event) => submit(event, row)} onKeyDown={(event) => event.key === 'Escape' && cancel()} className="flex items-center gap-1.5">
          <input type={type} className={`${INPUT} min-w-36`} value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} aria-label={label} required={field !== 'helpLink'} autoFocus />
          <button type="submit" disabled={busy} title="Save" aria-label={`Save ${label}`} className={`${ICON_BUTTON} shrink-0 bg-(--c-accent) text-white`}>
            <svg {...ICON}>
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          </button>
          <button type="button" onClick={cancel} disabled={busy} title="Cancel" aria-label="Cancel" className={`${ICON_BUTTON} shrink-0 text-(--c-text-2) hover:bg-gray-100`}>
            <svg {...ICON}>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </form>
      );
    }

    const text = row[column];
    return (
      <div className="flex items-center gap-0.5">
        <div className="min-w-0">
          {field === 'helpLink' ? (
            text ? (
              <a href={text} target="_blank" rel="noreferrer" title={text} className="block truncate text-(--c-link) underline-offset-2 hover:underline">
                {text}
              </a>
            ) : (
              <span className="text-(--c-muted)">Not added</span>
            )
          ) : (
            <span className={field === 'name' ? 'font-semibold' : undefined}>{text}</span>
          )}
        </div>
        <button type="button" onClick={() => startEdit(row, field)} disabled={busyId !== null} title={`Edit ${label}`} aria-label={`Edit ${label} of ${row.name}`} className={`${ICON_BUTTON} shrink-0 text-(--c-link) hover:bg-(--c-accent-soft)`}>
          <svg {...ICON}>
            <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
            <path d="m13.5 6.5 4 4" />
          </svg>
        </button>
        {field === 'helpLink' && text && (
          <button type="button" onClick={() => removeHelpLink(row)} disabled={busy} title="Remove help link" aria-label={`Remove help link of ${row.name}`} className={`${ICON_BUTTON} shrink-0 text-red-600 hover:bg-red-50`}>
            <svg {...ICON}>
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-gradient-to-r from-(--c-grad-from) via-(--c-grad-via) to-(--c-grad-to) px-5 py-5 text-white md:px-8 md:py-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Page Directory</h1>
          <p className="mt-1 text-sm text-white/85">Every page route with its platform and module. Use the pencil next to a module, page name or help link to edit it.</p>
        </div>
        <div className="rounded-2xl bg-white/15 px-5 py-2.5 text-center">
          <p className="text-2xl font-bold tabular-nums">{loading ? '…' : counts.all}</p>
          <p className="text-xs font-medium text-white/85">Total pages</p>
        </div>
      </header>

      {(error || rowError) && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error || rowError}
        </p>
      )}

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-3 md:p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by platform">
            {PLATFORMS.map(({ value: key, label }) => {
              const active = platform === key;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setPlatform(key)}
                  aria-pressed={active}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-1.5 text-sm font-medium transition ${
                    active
                      ? 'bg-gradient-to-r from-(--c-grad-from) via-(--c-grad-via) to-(--c-grad-to) text-white'
                      : 'bg-(--c-accent-soft)/60 text-(--c-link) hover:bg-(--c-accent-soft)'
                  }`}
                >
                  {label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[0.7rem] font-bold tabular-nums ${active ? 'bg-white/25' : 'bg-white/70'}`}>{counts[key ?? 'all'] ?? 0}</span>
                </button>
              );
            })}
          </div>
          <div className="w-full lg:w-80">
            <SearchInput value={search} onChange={setSearch} placeholder="Search route, module, page or link" label="Search page routes" />
          </div>
        </div>

        {/* Phones: one card per page, so nothing has to be slid sideways */}
        <ul className="mt-4 space-y-3 md:hidden">
          {loading && <li className="py-6 text-center text-sm text-(--c-text-2)">Loading…</li>}
          {!loading && rows.length === 0 && <li className="py-6 text-center text-sm text-(--c-text-2)">No pages match.</li>}
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-gray-200 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 break-all font-mono text-xs text-(--c-text-2)">{row.route}</p>
                <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${PLATFORM_STYLE[row.platform] ?? 'bg-gray-100 text-(--c-text-2)'}`}>
                  {PLATFORM_LABEL[row.platform] ?? row.platform}
                </span>
              </div>
              <dl className="mt-3 space-y-2.5 text-sm">
                {[['module', 'Module'], ['name', 'Page Name'], ['helpLink', 'Help Link']].map(([field, title]) => (
                  <div key={field}>
                    <dt className="text-xs font-semibold text-(--c-text-3)">{title}</dt>
                    <dd className="mt-0.5">{renderCell(row, field)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>

        <ScrollTable className="mt-4 hidden md:block">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[11%]" />
              <col className="w-[17%]" />
              <col className="w-[20%]" />
              <col className="w-[28%]" />
            </colgroup>
            <thead>
              <tr>
                <HeadCell>Route</HeadCell>
                <HeadCell>Platform</HeadCell>
                <HeadCell>Module</HeadCell>
                <HeadCell>Page Name</HeadCell>
                <HeadCell>Help Link</HeadCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-(--c-text-2)">Loading…</td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-(--c-text-2)">No pages match.</td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="break-all px-4 py-3 font-mono text-xs text-(--c-text-2)">{row.route}</td>
                  <td className="px-4 py-3">
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${PLATFORM_STYLE[row.platform] ?? 'bg-gray-100 text-(--c-text-2)'}`}>
                      {PLATFORM_LABEL[row.platform] ?? row.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3">{renderCell(row, 'module')}</td>
                  <td className="px-4 py-3">{renderCell(row, 'name')}</td>
                  <td className="px-4 py-3">{renderCell(row, 'helpLink')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollTable>
        {!loading && routes && (
          <p className="mt-3 text-xs text-(--c-text-3)">
            Showing {rows.length} of {counts.all} pages
          </p>
        )}
      </section>
    </div>
  );
}

export default PageDirectoryPage;

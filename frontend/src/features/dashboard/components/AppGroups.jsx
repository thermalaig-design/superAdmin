import { Fragment, useMemo, useState } from 'react';

import { firstDirection, matchesPerson, nextSort, number, sortRows, when } from '../utils/tableHelpers';
import AppProducts from './AppProducts';
import PageDonuts from './PageDonuts';

const PAGE = 25;
const APP_COLUMNS = [
  { key: 'app', label: 'App', type: 'text' },
  { key: 'userCount', label: 'Active members', type: 'number' },
  { key: 'members', label: 'Members', type: 'number' },
  { key: 'products', label: 'Products', type: 'number' },
  { key: 'count', label: 'Actions', type: 'number' },
  { key: 'at', label: 'Last active', type: 'date' },
];
const USER_COLUMNS = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'mobile', label: 'Mobile', type: 'number' },
  { key: 'count', label: 'Actions', type: 'number' },
  { key: 'at', label: 'Last active', type: 'date' },
];
const START = { key: 'count', direction: 'desc' }; // most actions first

/** The pages of several people added together: same page (module, name, platform) counted once. */
function mergePages(lists) {
  const merged = new Map();
  lists.flat().forEach((page) => {
    const key = `${page.platform}|${page.module}|${page.name}`;
    const entry = merged.get(key) ?? { ...page, count: 0 };
    entry.count += page.count;
    merged.set(key, entry);
  });
  return [...merged.values()].sort((a, b) => b.count - a.count);
}

/** One row per app: how many people used it, its members and products, and all their actions together. */
function groupByApp(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = row.appId ?? row.app;
    const group = groups.get(key) ?? { appId: key, app: row.app ?? '—', members: row.members, products: row.products, users: [], count: 0, at: null };
    group.users.push(row);
    group.count += row.count;
    if (row.at && (!group.at || new Date(row.at) > new Date(group.at))) group.at = row.at;
    groups.set(key, group);
  });
  return [...groups.values()].map((group) => ({ ...group, userCount: group.users.length, pages: mergePages(group.users.map((user) => user.pages ?? [])) }));
}

/** A column heading that sorts; shows ▲ / ▼ on the sorted one and a faint ↕ on the others. */
function Heading({ column, sort, onSort }) {
  const on = sort?.key === column.key;
  return (
    <th aria-sort={on ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className={`px-3 py-2.5 font-semibold ${column.type === 'number' && column.key !== 'mobile' ? 'text-right' : ''}`}>
      <button type="button" onClick={() => onSort(column)} title={`Sort by ${column.label.toLowerCase()}`} className={`inline-flex cursor-pointer items-center gap-1 uppercase tracking-wide transition hover:text-(--c-text) ${on ? 'text-(--c-text)' : ''}`}>
        {column.label}
        <span aria-hidden="true" className={on ? 'text-(--c-link)' : 'opacity-40'}>{on ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
      </button>
    </th>
  );
}

/** The people of one app: a table of their own (sortable, 25 at a time); click a person to see which pages they opened. */
function AppUsers({ group, users, userSort, onUserSort }) {
  const [shown, setShown] = useState(PAGE);
  const [openUser, setOpenUser] = useState(null);
  const sorted = useMemo(() => sortRows(users, USER_COLUMNS, userSort), [users, userSort]);

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <ul className="divide-y divide-gray-100 md:hidden">
        {sorted.slice(0, shown).map((user, index) => {
          const key = `${user.name}|${user.mobile}`;
          const expandable = Boolean(user.pages);
          const isOpen = expandable && openUser === key;
          return (
            <li key={key + index} className={`p-3 ${isOpen ? 'bg-(--c-accent-soft)' : ''}`}>
              <div className={expandable ? 'cursor-pointer' : undefined} role={expandable ? 'button' : undefined} onClick={expandable ? () => setOpenUser(isOpen ? null : key) : undefined}>
                <p className="flex items-start gap-2 text-sm font-semibold">
                  <span className="shrink-0 text-xs font-medium tabular-nums text-(--c-muted)">{expandable ? (isOpen ? '▾' : '▸') : ''} {index + 1}.</span>
                  <span className="min-w-0 break-words">{user.name ?? '—'}</span>
                </p>
                <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                  <div className="min-w-0"><dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-(--c-muted)">Mobile</dt><dd>{user.mobile ?? '—'}</dd></div>
                  <div className="min-w-0"><dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-(--c-muted)">Actions</dt><dd className="font-semibold tabular-nums">{number(user.count)}</dd></div>
                  <div className="col-span-2 min-w-0"><dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-(--c-muted)">Last active</dt><dd>{when(user.at)}</dd></div>
                </dl>
              </div>
              {isOpen && (
                <div className="mt-3 border-t border-gray-200 pt-3">
                  <p className="mb-3 text-sm font-semibold">
                    {user.name ?? 'This person'} <span className="font-normal text-(--c-muted)">in {group.app} · {number(user.count)} times across {number(user.pages.length)} pages</span>
                  </p>
                  <PageDonuts pages={user.pages} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <table className="hidden w-full text-left text-sm md:table">
        <thead className="bg-(--c-band) text-xs uppercase tracking-wide text-(--c-muted)">
          <tr>
            <th className="px-3 py-2.5 font-semibold">#</th>
            {USER_COLUMNS.map((column) => (
              <Heading key={column.key} column={column} sort={userSort} onSort={onUserSort} />
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.slice(0, shown).map((user, index) => {
            const key = `${user.name}|${user.mobile}`;
            const expandable = Boolean(user.pages);
            const isOpen = expandable && openUser === key;
            return (
              <Fragment key={key + index}>
                <tr
                  className={`hover:bg-(--c-accent-soft) ${expandable ? 'cursor-pointer' : ''} ${isOpen ? 'bg-(--c-accent-soft)' : ''}`}
                  onClick={expandable ? () => setOpenUser(isOpen ? null : key) : undefined}
                  title={expandable ? 'Click to see which pages this person opened' : undefined}
                >
                  <td className="px-3 py-2.5 tabular-nums text-(--c-muted)">{expandable ? (isOpen ? '▾' : '▸') : ''} {index + 1}</td>
                  <td className="px-3 py-2.5">{user.name ?? '—'}</td>
                  <td className="px-3 py-2.5">{user.mobile ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{number(user.count)}</td>
                  <td className="px-3 py-2.5">{when(user.at)}</td>
                </tr>
                {isOpen && (
                  <tr className="bg-(--c-band)">
                    <td colSpan={USER_COLUMNS.length + 1} className="px-4 py-4">
                      <p className="mb-3 text-sm font-semibold">
                        {user.name ?? 'This person'} <span className="font-normal text-(--c-muted)">in {group.app} · {number(user.count)} times across {number(user.pages.length)} pages</span>
                      </p>
                      <PageDonuts pages={user.pages} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {shown < sorted.length && (
        <div className="border-t border-gray-100 p-3">
          <button type="button" onClick={() => setShown((count) => count + PAGE * 4)} className="cursor-pointer rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-(--c-text-2) hover:bg-gray-50">
            Show more members ({number(sorted.length - shown)} left)
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * The activity list, one row per app. Click an app to see where all its users went (the donuts) and then its users;
 * click a user to see their own donuts. The search finds an app by name, or a person by name or mobile number (that app opens to show them).
 * `rows` is the card-details rows: one per person and app, with appId, app, members, products, count, at, pages.
 */
function AppGroups({ rows, search }) {
  const [sort, setSort] = useState(START);
  const [userSort, setUserSort] = useState(START);
  const [opened, setOpened] = useState(null); // { appId, tab: 'users' | 'products' }: the app that is open and what it shows
  const [shown, setShown] = useState(PAGE);

  const groups = useMemo(() => groupByApp(rows), [rows]);
  const needle = search.trim().toLowerCase();

  // an app matches by its name (all its people are shown) or by a person in it (only those people, and the app opens)
  const found = useMemo(() => {
    if (!needle) return groups.map((group) => ({ group, users: group.users, byPerson: false }));
    return groups.flatMap((group) => {
      if (group.app.toLowerCase().includes(needle)) return [{ group, users: group.users, byPerson: false }];
      const users = group.users.filter((user) => matchesPerson(user, needle));
      return users.length ? [{ group, users, byPerson: true }] : [];
    });
  }, [groups, needle]);

  const ordered = useMemo(() => {
    const keyed = found.map((entry) => ({ ...entry.group, entry }));
    return sortRows(keyed, APP_COLUMNS, sort).map((group) => group.entry);
  }, [found, sort]);

  /** What opens under an app: the tabs, then its products or its people (with the donuts of the pages they opened). */
  const renderDetail = (group, users, byPerson, tab) => (
    <>
        {!byPerson && (
          <div className="mb-4 flex flex-wrap gap-2" role="tablist">
            {[
              { key: 'users', label: `Active members ${number(group.userCount)}` },
              { key: 'products', label: `Products ${number(group.products ?? 0)}` },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={tab === item.key}
                onClick={() => setOpened({ appId: group.appId, tab: item.key })}
                className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-semibold transition ${tab === item.key ? 'border-transparent bg-(--c-link) text-white' : 'border-gray-300 bg-white text-(--c-text-2) hover:bg-gray-50'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
        {tab === 'products' ? (
          <AppProducts trustId={group.appId} appName={group.app} />
        ) : (
          <>
            {group.pages.length > 0 && (
              <>
                <p className="mb-3 text-sm font-semibold">
                  {group.app} <span className="font-normal text-(--c-muted)">· {number(group.count)} actions by {number(group.userCount)} active {group.userCount === 1 ? 'member' : 'members'} across {number(group.pages.length)} pages</span>
                </p>
                <PageDonuts pages={group.pages} />
              </>
            )}
            <AppUsers group={group} users={users} userSort={userSort} onUserSort={(c) => setUserSort((current) => nextSort(current, c))} />
          </>
        )}
    </>
  );

  if (ordered.length === 0) return <p className="mt-4 text-sm text-(--c-muted)">{needle ? `No app or person matches "${search.trim()}".` : 'Nothing here in this period.'}</p>;

  return (
    <>
      <div className="mt-3 md:hidden">
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="app-sort">Sort by</label>
          <select
            id="app-sort"
            value={sort?.key ?? ''}
            onChange={(event) => {
              const column = APP_COLUMNS.find((item) => item.key === event.target.value);
              if (column) {
                setSort({ key: column.key, direction: firstDirection(column) });
                setShown(PAGE);
              }
            }}
            className="h-10 min-w-0 flex-1 rounded-full border border-gray-300 bg-white px-3 text-sm"
          >
            {APP_COLUMNS.map((column) => (
              <option key={column.key} value={column.key}>Sort by {column.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setSort((current) => ({ key: current.key, direction: current.direction === 'asc' ? 'desc' : 'asc' }));
              setShown(PAGE);
            }}
            aria-label={sort?.direction === 'asc' ? 'Ascending, tap for descending' : 'Descending, tap for ascending'}
            className="h-10 w-10 shrink-0 cursor-pointer rounded-full border border-gray-300 bg-white text-sm font-semibold text-(--c-text-2)"
          >
            {sort?.direction === 'asc' ? '▲' : '▼'}
          </button>
        </div>
        <ul className="mt-3 space-y-2.5">
          {ordered.slice(0, shown).map(({ group, users, byPerson }, index) => {
            const isOpen = byPerson || opened?.appId === group.appId;
            const tab = byPerson ? 'users' : opened?.tab;
            return (
              <li key={group.appId} className={`rounded-xl border border-gray-200 p-3 ${isOpen ? 'bg-(--c-accent-soft)' : 'bg-white'}`}>
                <div className="cursor-pointer" role="button" onClick={() => !byPerson && setOpened(isOpen ? null : { appId: group.appId, tab: 'users' })}>
                  <p className="flex items-start gap-2 text-sm font-semibold">
                    <span className="shrink-0 text-xs font-medium tabular-nums text-(--c-muted)">{isOpen ? '▾' : '▸'} {index + 1}.</span>
                    <span className="min-w-0 break-words">{group.app}</span>
                  </p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    <div><dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-(--c-muted)">Active members</dt><dd className="font-semibold tabular-nums">{number(group.userCount)}</dd></div>
                    <div><dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-(--c-muted)">Members</dt><dd className="font-semibold tabular-nums">{number(group.members ?? 0)}</dd></div>
                    <div>
                      <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-(--c-muted)">Products</dt>
                      <dd className="font-semibold tabular-nums">
                        {group.products > 0 ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpened(isOpen && tab === 'products' ? null : { appId: group.appId, tab: 'products' });
                            }}
                            className="cursor-pointer text-(--c-link) underline decoration-dotted decoration-2 underline-offset-4"
                          >
                            {number(group.products)}
                          </button>
                        ) : (
                          0
                        )}
                      </dd>
                    </div>
                    <div><dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-(--c-muted)">Actions</dt><dd className="font-semibold tabular-nums">{number(group.count)}</dd></div>
                    <div className="col-span-2"><dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-(--c-muted)">Last active</dt><dd>{when(group.at)}</dd></div>
                  </dl>
                </div>
                {isOpen && <div className="mt-3 border-t border-gray-200 pt-3">{renderDetail(group, users, byPerson, tab)}</div>}
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
              {APP_COLUMNS.map((column) => (
                <Heading
                  key={column.key}
                  column={column}
                  sort={sort}
                  onSort={(c) => {
                    setSort((current) => nextSort(current, c));
                    setShown(PAGE);
                  }}
                />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ordered.slice(0, shown).map(({ group, users, byPerson }, index) => {
              const isOpen = byPerson || opened?.appId === group.appId;
              const tab = byPerson ? 'users' : opened?.tab;
              return (
                <Fragment key={group.appId}>
                  <tr
                    className={`cursor-pointer hover:bg-(--c-accent-soft) ${isOpen ? 'bg-(--c-accent-soft)' : ''}`}
                    onClick={() => !byPerson && setOpened(isOpen ? null : { appId: group.appId, tab: 'users' })}
                    title="Click to see this app's active members"
                  >
                    <td className="px-3 py-2.5 tabular-nums text-(--c-muted)">{isOpen ? '▾' : '▸'} {index + 1}</td>
                    <td className="px-3 py-2.5 font-semibold">{group.app}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{number(group.userCount)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{number(group.members ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {group.products > 0 ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpened(isOpen && tab === 'products' ? null : { appId: group.appId, tab: 'products' });
                          }}
                          title="See the products of this app"
                          className="cursor-pointer rounded-md font-semibold text-(--c-link) underline decoration-dotted decoration-2 underline-offset-4 hover:decoration-solid"
                        >
                          {number(group.products)}
                        </button>
                      ) : (
                        0
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{number(group.count)}</td>
                    <td className="px-3 py-2.5">{when(group.at)}</td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-(--c-band)">
                      <td colSpan={APP_COLUMNS.length + 1} className="px-4 py-4">
                        {renderDetail(group, users, byPerson, tab)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {shown < ordered.length && (
        <button type="button" onClick={() => setShown((count) => count + PAGE * 4)} className="mt-3 cursor-pointer rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-(--c-text-2) hover:bg-gray-50">
          Show more apps ({number(ordered.length - shown)} left)
        </button>
      )}
    </>
  );
}

export default AppGroups;

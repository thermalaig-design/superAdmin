import { Link } from 'react-router-dom';

import Avatar from '../../../components/Avatar';
import { formatDateTime } from '../../../utils/formatDate';
import { formatTimestamp } from './chart';

const EMPTY = <span className="text-(--c-faint)">—</span>;

/** The saved link may lack a protocol ("example.com"); returns a usable href and the text to show, or null. */
function websiteLink(website) {
  if (!website) return null;
  const hasProtocol = /^https?:\/\//i.test(website);
  return {
    href: hasProtocol ? website : `https://${website}`,
    label: website.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
  };
}

/** Link to one of a trust's activity pages (users: '', members: '/member-actions'), carrying the selected date range along. */
function activityLink(trustId, filter, suffix = '') {
  const params = new URLSearchParams({ range: filter.range });
  if (filter.range === 'custom') {
    params.set('from', filter.from);
    params.set('to', filter.to);
  }
  return `/trust-insights/${trustId}${suffix}?${params}`;
}

/**
 * The trust table's columns, in order. `extra` columns are the less important ones: they can be hidden with the
 * table's "more columns" button. `sortKey` is the key used by sortTrusts (none = not sortable).
 * `cell(trust, { filter })` returns the cell content.
 */
export const TRUST_COLUMNS = [
  {
    id: 'trust',
    label: 'Trust',
    cell: (t, { filter }) => (
      <div className="flex items-center gap-3">
        <Avatar name={t.name} logoUrl={t.logoUrl} />
        <Link
        state={{ backLabel: 'Trust Insights', section: '/organization-insights' }}
        to={activityLink(t.id, filter)} className="font-semibold hover:text-(--c-link) hover:underline">
          {t.name}
        </Link>
      </div>
    ),
  },
  {
    id: 'appType',
    label: 'App Type',
    sortKey: 'appType',
    cell: (t) =>
      t.appType ? (
        <span className="whitespace-nowrap rounded-full bg-(--c-accent-soft)/70 px-2.5 py-1 text-xs font-medium text-(--c-link)">
          {t.appType}
        </span>
      ) : (
        EMPTY
      ),
  },
  {
    id: 'details',
    label: 'Trust Details',
    tdClass: 'whitespace-nowrap',
    cell: (t, { onDetails }) => (
      <span className="inline-flex items-center gap-1.5">
        {[
          ['bank', 'Bank'],
          ['company', 'Company'],
        ].map(([kind, label], i) => (
          <span key={kind} className="inline-flex items-center gap-1.5">
            {i > 0 && <span className="text-(--c-faint)">/</span>}
            <button
              type="button"
              onClick={() => onDetails(kind, t)}
              className="cursor-pointer font-medium text-(--c-link) hover:underline"
            >
              {label}
            </button>
          </span>
        ))}
      </span>
    ),
  },
  {
    id: 'createdAt',
    label: 'Created At',
    sortKey: 'createdAt',
    tdClass: 'whitespace-nowrap text-(--c-text-2)',
    cell: (t) => formatDateTime(t.createdAt),
  },
  {
    id: 'link',
    label: 'Link',
    cell: (t) => {
      const link = websiteLink(t.website);
      return link ? (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block max-w-[220px] truncate text-(--c-link) hover:underline"
          title={link.href}
        >
          {link.label}
        </a>
      ) : (
        EMPTY
      );
    },
  },
  {
    id: 'superUser',
    label: 'Super User',
    extra: true,
    tdClass: 'whitespace-nowrap text-(--c-text-2)',
    cell: (t) => t.superUserName || '—',
  },
  {
    id: 'superUserNumber',
    label: 'Super User Number',
    extra: true,
    tdClass: 'tabular-nums text-(--c-text-2)',
    cell: (t) => t.superUserNumber || '—',
  },
  {
    id: 'activity',
    label: 'User Activity',
    sortKey: 'activityNumber',
    tdClass: 'tabular-nums',
    cell: (t, { filter }) => (
      <Link
        state={{ backLabel: 'Trust Insights', section: '/organization-insights' }}
        to={activityLink(t.id, filter)} className="font-medium text-(--c-link) hover:underline">
        {t.activityNumber ?? 0}
      </Link>
    ),
  },
  {
    id: 'appActions',
    label: 'App Actions',
    sortKey: 'appActions',
    tdClass: 'font-semibold tabular-nums',
    cell: (t, { filter }) =>
      t.appActions > 0 ? (
        <Link
          state={{ backLabel: 'Trust Insights', section: '/organization-insights' }}
          to={activityLink(t.id, filter, '/member-actions')}
          className="text-(--c-link) hover:underline"
          title="View what members did in this app"
        >
          {t.appActions.toLocaleString('en-IN')}
        </Link>
      ) : (
        EMPTY
      ),
  },
  {
    id: 'lastActivity',
    label: 'Last Activity',
    sortKey: 'lastActivityAt',
    tdClass: 'whitespace-nowrap tabular-nums text-(--c-text-2)',
    cell: (t) => (t.lastActivityAt ? formatTimestamp(t.lastActivityAt) : <span className="text-(--c-faint)">No activity yet</span>),
  },
  {
    id: 'logins',
    label: 'Unique Member Logins',
    sortKey: 'uniqueMemberLogins',
    tdClass: 'tabular-nums',
    cell: (t) =>
      t.uniqueMemberLogins > 0 ? (
        <Link
        state={{ backLabel: 'Trust Insights', section: '/organization-insights' }}
        to={`/trust-insights/${t.id}/members`} className="font-medium text-(--c-link) hover:underline" title="View members who logged in">
          {t.uniqueMemberLogins}
        </Link>
      ) : (
        <span className="text-(--c-text-2)">0</span>
      ),
  },
  {
    id: 'lastLogin',
    label: 'Last Member Login',
    sortKey: 'lastMemberLoginAt',
    extra: true,
    tdClass: 'whitespace-nowrap tabular-nums text-(--c-text-2)',
    cell: (t) => (t.lastMemberLoginAt ? formatTimestamp(t.lastMemberLoginAt) : <span className="text-(--c-faint)">No logins yet</span>),
  },
];

export const EXTRA_COLUMN_COUNT = TRUST_COLUMNS.filter((c) => c.extra).length;

/** The label of the hidden (extra) column the table is sorted by, or null when the sort column is on screen. */
export const hiddenSortLabel = (sortKey, showExtra) =>
  showExtra ? null : TRUST_COLUMNS.find((c) => c.extra && c.sortKey === sortKey)?.label ?? null;

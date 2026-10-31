import { TRUST_COLUMNS } from '../utils/trustColumns';

const cellOf = (id) => TRUST_COLUMNS.find((column) => column.id === id).cell;
const trustCell = cellOf('trust');
const appTypeCell = cellOf('appType');
const detailsCell = cellOf('details');
const linkCell = cellOf('link');
const createdCell = cellOf('createdAt');
const activityCell = cellOf('activity');
const actionsCell = cellOf('appActions');
const loginsCell = cellOf('logins');
const lastActivityCell = cellOf('lastActivity');

function Stat({ label, children }) {
  return (
    <div className="min-w-0 rounded-xl bg-(--c-band) px-3 py-2">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.06em] text-(--c-muted)">{label}</p>
      <div className="mt-0.5 truncate text-sm font-semibold tabular-nums">{children}</div>
    </div>
  );
}

/**
 * The trusts as cards, for phones (the table needs more width than a phone has). Each card holds the same
 * content as a table row, by using the table's own cell renderers, so links and buttons behave the same way.
 */
function TrustCards({ trusts, loading, filter, onDetails, searching = false }) {
  const context = { filter, onDetails };

  if (loading && trusts.length === 0) {
    return (
      <div className="space-y-3 lg:hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl bg-(--c-band)" />
        ))}
      </div>
    );
  }

  if (trusts.length === 0) {
    return (
      <p className="rounded-xl border border-gray-200 px-4 py-10 text-center text-(--c-text-3) lg:hidden">
        {searching ? 'No trusts match your search.' : 'No trusts were created in this period.'}
      </p>
    );
  }

  return (
    <ul className="space-y-3 lg:hidden">
      {trusts.map((trust) => (
        <li key={trust.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 text-base">{trustCell(trust, context)}</div>
            <span className="shrink-0 pt-1 text-[0.7rem] text-(--c-muted)">{createdCell(trust, context)}</span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {appTypeCell(trust, context)}
            {trust.website && <span className="min-w-0 text-sm">{linkCell(trust, context)}</span>}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="User activity">{activityCell(trust, context)}</Stat>
            <Stat label="App actions">{actionsCell(trust, context)}</Stat>
            <Stat label="Member logins">{loginsCell(trust, context)}</Stat>
            <Stat label="Last activity">
              <span className="text-xs font-medium">{lastActivityCell(trust, context)}</span>
            </Stat>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-(--c-border) pt-3 text-sm">
            <div className="min-w-0 text-(--c-text-2)">
              {trust.superUserName ? (
                <>
                  <span className="block truncate font-medium">{trust.superUserName}</span>
                  {trust.superUserNumber && (
                    <a href={`tel:${trust.superUserNumber}`} className="text-xs tabular-nums text-(--c-link)">
                      {trust.superUserNumber}
                    </a>
                  )}
                </>
              ) : (
                <span className="text-(--c-faint)">No super user</span>
              )}
            </div>
            <div className="shrink-0">{detailsCell(trust, context)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default TrustCards;

import { useState } from 'react';
import { Link } from 'react-router-dom';

import ScrollTable from '../../../components/ScrollTable';
import { formatTimestamp } from '../../trust-insights/utils/chart';
import { periodQuery } from '../../member-insights/utils/periodQuery';
import { COLORS } from '../../marketing/utils/leadStats';
import AppRoadmapDrawer from './AppRoadmapDrawer';
import SourceSelect from './SourceSelect';

const th = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-(--c-muted)';
const number = (value) => value.toLocaleString('en-IN');

const SOURCE_COLORS = { 'Meta Ads': COLORS.facebook, WhatsApp: '#1fa855', 'Google Ads': COLORS.google, 'Google Click': COLORS.google, Website: COLORS.website, Organic: '#d63384', Unknown: '#64748b' };

/** The detail pages behind the two activity numbers (both open on the Dashboard's period; back returns here). */
const appActionsPath = (app, filter) => `/trust-insights/${app.id}/member-actions${periodQuery(filter)}`;
const userPanelPath = (app, filter) => `/trust-insights/${app.id}${periodQuery(filter)}`;
const appLoginsPath = (app, filter) => `/app-logins/${app.id}${periodQuery(filter)}`;
const fromDashboard = { backLabel: 'Dashboard', section: '/' };

function CameFrom({ from }) {
  if (!from) return <span className="text-xs text-(--c-faint)">Direct / unknown</span>;
  const color = SOURCE_COLORS[from.source] ?? COLORS.other;
  return (
    <div>
      <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold text-white" style={{ background: color }}>
        {from.source.replace(' Ads', '')}
      </span>
      {from.platform !== from.source && <p className="mt-0.5 text-xs text-(--c-muted)">{from.platform}</p>}
    </div>
  );
}

const SCOPE_LABELS = {
  all: 'All apps',
  meta: 'Meta Ads',
  whatsapp: 'WhatsApp',
  google: 'Google Ads',
  googleclick: 'Google Click',
  website: 'Website',
  organic: 'Organic',
  unknown: 'Unknown',
  direct: 'Direct (no ad lead)',
};

/**
 * The busiest apps in the period, ranked by App actions (members) + User Panel (registered users).
 * The dropdown limits them to one ad source, or to apps whose owner came without an ad lead; the ranking is done
 * inside that group. Click an app name to see its journey.
 */
function MostActiveApps({ apps, scopeCounts, scope, onScopeChange, filter, loading, embedded = false }) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = apps?.find((app) => app.id === selectedId) ?? null;
  const peak = Math.max(1, ...(apps ?? []).map((app) => app.score));

  return (
    <section className={embedded ? '' : 'rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]'}>
      <div className={`flex flex-wrap items-center gap-2.5 ${embedded ? 'justify-end' : 'justify-between'}`}>
        {!embedded && (
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-sm font-semibold">Most Active Apps{scope !== 'all' ? ` · ${SCOPE_LABELS[scope]}` : ''}</h3>
            {apps && <span className="rounded-full bg-(--c-accent-soft) px-2.5 py-0.5 text-xs font-semibold text-(--c-link)">{apps.length}</span>}
          </div>
        )}
        <SourceSelect
          label="Show apps from"
          value={scope}
          onChange={onScopeChange}
          options={Object.entries(SCOPE_LABELS)
            // a group with no apps is left out, except the one currently chosen
            .filter(([key]) => key === 'all' || key === scope || (scopeCounts?.[key] ?? 0) > 0)
            .map(([key, label]) => ({ value: key, label: scopeCounts ? `${label} (${scopeCounts[key] ?? 0})` : label }))}
        />
      </div>
      {!embedded && (
        <p className="mt-1 text-xs text-(--c-muted)">
          Ranked by App actions + User Panel activity in this period · click an app name for its journey, or a number for the detail
        </p>
      )}

      {loading && !apps ? (
        <div className="mt-4 h-52 animate-pulse rounded-xl bg-gray-50" />
      ) : !apps || apps.length === 0 ? (
        <p className="mt-4 rounded-xl border border-gray-200 px-4 py-10 text-center text-sm text-(--c-muted)">{scope === 'all' ? 'No app activity in this period' : `No active apps from ${SCOPE_LABELS[scope]} in this period`}</p>
      ) : (
        <ScrollTable className="mt-4">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-(--c-page)">
              <tr>
                <th className={th}>#</th>
                <th className={th}>App</th>
                <th className={th}>Came from</th>
                <th className={th}>Campaign</th>
                <th className={th}>App actions</th>
                <th className={th}>User Panel</th>
                <th className={th} title="Times someone logged in to this app in the selected period">App Logins</th>
                <th className={th}>Last active</th>
                <th className={th}>Activity score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {apps.map((app, i) => (
                <tr key={app.id}>
                  <td className="px-4 py-3">
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${i === 0 ? 'bg-gradient-to-br from-(--c-grad-from) to-(--c-grad-to) text-white' : 'bg-(--c-track) text-(--c-muted)'}`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setSelectedId(app.id)} className="cursor-pointer text-left font-semibold hover:text-(--c-link) hover:underline">
                      {app.name}
                    </button>
                    {app.owner && <p className="text-xs text-(--c-muted)">{app.owner}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <CameFrom from={app.cameFrom} />
                  </td>
                  <td className="max-w-[14rem] px-4 py-3 text-xs text-(--c-text-2)">{app.cameFrom?.campaign ?? <span className="text-(--c-faint)">—</span>}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-(--c-good)">
                    {app.appActions > 0 ? (
                      <Link to={appActionsPath(app, filter)} state={fromDashboard} title="See what members did in this app" className="underline decoration-dotted underline-offset-4 hover:decoration-solid">
                        {number(app.appActions)}
                      </Link>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-(--c-good)">
                    {app.userPanel > 0 ? (
                      <Link to={userPanelPath(app, filter)} state={fromDashboard} title="See what the app's users did" className="underline decoration-dotted underline-offset-4 hover:decoration-solid">
                        {number(app.userPanel)}
                      </Link>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-(--c-good)">
                    {app.logins > 0 ? (
                      <Link to={appLoginsPath(app, filter)} state={fromDashboard} title="See who logged in to this app" className="underline decoration-dotted underline-offset-4 hover:decoration-solid">
                        {number(app.logins)}
                      </Link>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-(--c-text-2)">{app.lastActiveAt ? formatTimestamp(app.lastActiveAt) : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-20 rounded-full bg-(--c-track)">
                        <span className="block h-full rounded-full bg-gradient-to-r from-(--c-grad-from) to-(--c-grad-to)" style={{ width: `${(app.score / peak) * 100}%` }} />
                      </span>
                      <span className="font-bold tabular-nums">{number(app.score)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollTable>
      )}

      {selected && <AppRoadmapDrawer app={selected} filter={filter} onClose={() => setSelectedId(null)} />}
    </section>
  );
}

export default MostActiveApps;

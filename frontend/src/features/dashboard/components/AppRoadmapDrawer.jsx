import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

import { periodQuery } from '../../member-insights/utils/periodQuery';
import { COLORS } from '../../marketing/utils/leadStats';
import { formatTimestamp, MODULE_COLORS } from '../../trust-insights/utils/chart';
import { useAppJourney } from '../hooks/useAppJourney';

const number = (value) => value.toLocaleString('en-IN');
const LOGIN_METHODS = { otp: 'Mobile OTP verified', secret_code: 'Secret code' };
const PLATFORMS = { android: 'Android', ios: 'iOS', web: 'Web' };
const SOURCE_COLORS = { 'Meta Ads': COLORS.facebook, WhatsApp: '#1fa855', 'Google Ads': COLORS.google, 'Google Click': COLORS.google, Website: COLORS.website, Organic: '#d63384', Unknown: '#64748b' };
const STEP_COLORS = ['var(--c-c3)', 'var(--c-c3)', 'var(--c-c1)', 'var(--c-c4)', 'var(--c-c2)'];
const TABS = ['Roadmap', 'Activity', 'Details'];

const platformName = (value) => PLATFORMS[value] ?? value ?? null;
const day = (value) => (value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : null);

/** The detail pages behind the activity numbers (open on the Dashboard's period; back returns here). */
const appActionsPath = (app, filter) => `/trust-insights/${app.id}/member-actions${periodQuery(filter)}`;
const userPanelPath = (app, filter) => `/trust-insights/${app.id}${periodQuery(filter)}`;
const appLoginsPath = (app, filter) => `/app-logins/${app.id}${periodQuery(filter)}`;
const fromDashboard = { backLabel: 'Dashboard', section: '/' };

const tile = 'rounded-xl bg-(--c-band) px-3 py-2.5';

function Tile({ label, value, to, hint }) {
  const content = (
    <>
      <p className="text-[0.7rem] text-(--c-muted)">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${to ? 'text-(--c-good)' : ''}`}>{value}</p>
    </>
  );
  return to ? (
    <Link to={to} state={fromDashboard} title={hint} className={`${tile} transition hover:bg-(--c-accent-soft)`}>
      {content}
    </Link>
  ) : (
    <div className={tile}>{content}</div>
  );
}

function Step({ index, color, title, detail, time, last }) {
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!last && <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5 bg-(--c-border)" aria-hidden="true" />}
      <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: color }}>
        {index}
      </span>
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        {detail && <p className="mt-0.5 break-words text-sm text-(--c-text-3)">{detail}</p>}
        {time && <p className="mt-0.5 text-xs text-(--c-muted)">{time}</p>}
      </div>
    </li>
  );
}

const linkOf = (detail) => detail?.appLink ?? (detail?.appSlug ? `/app/${detail.appSlug}` : null);

function Roadmap({ app, detail }) {
  const { cameFrom, firstLogin } = app;
  const organic = cameFrom?.source === 'Organic';

  const steps = [
    cameFrom && {
      title: organic ? 'Joined on their own' : 'Clicked an ad',
      detail: organic ? 'Organic · no ad' : [cameFrom.source, cameFrom.platform !== cameFrom.source && cameFrom.platform, cameFrom.campaign].filter(Boolean).join(' · '),
      time: formatTimestamp(cameFrom.receivedAt),
    },
    detail?.downloaded && {
      title: 'Downloaded SETU AI',
      detail: [platformName(firstLogin?.platform), day(firstLogin?.at ?? detail.joinedAt)].filter(Boolean).join(' · '),
    },
    firstLogin && {
      title: 'Logged in',
      detail: [LOGIN_METHODS[firstLogin.method] ?? firstLogin.method, platformName(firstLogin.platform)].filter(Boolean).join(' · '),
      time: formatTimestamp(firstLogin.at),
    },
    { title: 'Created own app', detail: [`${app.name} is live`, linkOf(detail)].filter(Boolean).join(' · '), time: formatTimestamp(app.createdAt) },
    {
      title: 'Used app & User Panel',
      detail: `${number(app.appActions)} app actions · ${number(app.userPanel)} panel activities in this period`,
      time: app.lastActiveAt ? `Last active ${formatTimestamp(app.lastActiveAt)}` : null,
    },
  ].filter(Boolean);

  return (
    <>
      <p className="mb-4 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-(--c-muted)">Their journey</p>
      <ol>
        {steps.map((step, i) => (
          <Step key={step.title} index={i + 1} color={STEP_COLORS[i % STEP_COLORS.length]} {...step} last={i === steps.length - 1} />
        ))}
      </ol>
    </>
  );
}

function Activity({ detail, loading }) {
  if (loading && !detail) return <div className="h-52 animate-pulse rounded-xl bg-(--c-band)" />;
  const modules = detail?.modules ?? [];
  const peak = Math.max(1, ...modules.map((m) => m.count));

  return (
    <>
      <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-(--c-muted)">Where they spend time</p>
      {modules.length === 0 ? (
        <p className="rounded-xl bg-(--c-band) px-4 py-6 text-center text-sm text-(--c-muted)">No activity in this period</p>
      ) : (
        <ul className="space-y-2.5">
          {modules.map((m, i) => (
            <li key={m.label} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0 truncate text-(--c-text-2)" title={m.label}>{m.label}</span>
              <span className="h-2.5 flex-1 rounded-full bg-(--c-track)">
                <span className="animate-grow block h-full origin-left rounded-full" style={{ width: `${(m.count / peak) * 100}%`, background: MODULE_COLORS[i % MODULE_COLORS.length] }} />
              </span>
              <span className="w-10 shrink-0 text-right font-bold tabular-nums">{number(m.count)}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mb-3 mt-6 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-(--c-muted)">Recent activity</p>
      <ul className="space-y-2">
        {(detail?.recent ?? []).map((event, i) => (
          <li key={`${event.at}-${i}`} className="flex items-start gap-3 rounded-xl bg-(--c-band) px-3 py-2.5">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: event.panel ? 'var(--c-c2)' : 'var(--c-c1)' }} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{event.title}</p>
              {event.detail && <p className="text-xs text-(--c-muted)">{event.detail}</p>}
            </div>
            <span className="shrink-0 text-xs tabular-nums text-(--c-muted)">{formatTimestamp(event.at).slice(5, 16)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Details({ app, detail, filter }) {
  const { cameFrom, firstLogin } = app;
  const rows = [
    ['Mobile', app.ownerMobile ?? detail?.ownerMobile],
    ['Platform', platformName(firstLogin?.platform)],
    ['Joined', detail?.joinedAt ? formatTimestamp(detail.joinedAt).slice(0, 10) : null],
    ['Original source', cameFrom?.source ?? detail?.ownerSource ?? 'Direct / unknown'],
    ['Came via', cameFrom && cameFrom.platform !== cameFrom.source ? cameFrom.platform : null],
    ['Campaign', cameFrom?.campaign],
    ['App link', linkOf(detail)],
    ['Last active', app.lastActiveAt ? formatTimestamp(app.lastActiveAt) : null],
    ['Status', 'Active app'],
  ];
  const button = 'rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-(--c-accent-soft)';

  return (
    <>
      <dl className="divide-y divide-(--c-border) rounded-2xl bg-(--c-band) px-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 py-3 text-sm">
            <dt className="shrink-0 text-(--c-muted)">{label}</dt>
            <dd className="min-w-0 break-words text-right font-semibold">{value || '—'}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={userPanelPath(app, filter)} state={fromDashboard} className={button}>
          Open Organization Insights →
        </Link>
        <Link to={appActionsPath(app, filter)} state={fromDashboard} className={button}>
          View User Activity →
        </Link>
      </div>
    </>
  );
}

/** One app's roadmap: how the owner arrived, what they did, where they spend time, and the facts. */
function AppRoadmapDrawer({ app, filter, onClose }) {
  const [tab, setTab] = useState('Roadmap');
  const { data: detail, loading } = useAppJourney(app.id, filter);

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);

    // The page behind stays still while the panel is open (its width is kept so the layout does not jump)
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [onClose]);

  const { cameFrom } = app;
  const person = app.owner ?? app.name;
  const sourceColor = SOURCE_COLORS[cameFrom?.source] ?? COLORS.other;

  // Rendered on <body> so it covers the whole screen (navbar and sidebar too), not just the card it was opened from.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end p-2 sm:p-3" role="dialog" aria-modal="true" aria-label={`${person} roadmap`}>
      <button type="button" className="animate-fade absolute inset-0 cursor-default bg-black/25 backdrop-blur-sm" onClick={onClose} aria-label="Close" tabIndex={-1} />

      <aside className="animate-slide relative flex h-full w-full max-w-[28rem] flex-col overflow-y-auto overscroll-contain rounded-3xl border border-white/60 bg-gradient-to-br from-(--c-surface) via-(--c-page) to-(--c-accent-soft) p-5 shadow-[0_24px_70px_rgba(15,60,60,0.28)]">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-(--c-grad-from) to-(--c-grad-to) text-lg font-bold text-white shadow-sm">
            {person.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-(--c-link)">User roadmap</p>
            <h3 className="mt-0.5 break-words text-xl font-bold tracking-tight">{person}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-(--c-band) px-2.5 py-0.5 text-xs font-medium text-(--c-text-2)">{app.name}</span>
              {cameFrom && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold">
                  <span className="h-2 w-2 rounded-full" style={{ background: sourceColor }} aria-hidden="true" />
                  {cameFrom.source}
                </span>
              )}
              <span className="rounded-full bg-(--c-good-bg) px-2.5 py-0.5 text-xs font-semibold text-(--c-good-text)">Active app</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-lg text-(--c-text-2) shadow hover:bg-gray-50" aria-label="Close" autoFocus>
            ×
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-(--c-band) px-3 py-2.5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-(--c-muted)">How they arrived</p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: sourceColor }} aria-hidden="true" />
              {cameFrom?.source ?? 'Direct / unknown'}
            </span>
            <span className="text-(--c-muted)">›</span>
            <span>{person}</span>
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Tile label="App actions" value={number(app.appActions)} to={app.appActions > 0 ? appActionsPath(app, filter) : null} hint="See what members did in this app" />
          <Tile label="User Panel" value={number(app.userPanel)} to={app.userPanel > 0 ? userPanelPath(app, filter) : null} hint="See what the app's users did" />
          <Tile label="App logins" value={number(app.logins)} to={app.logins > 0 ? appLoginsPath(app, filter) : null} hint="See who logged in to this app" />
          <Tile label="Modules used" value={detail ? number(detail.modules.length) : '—'} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-(--c-band) p-1" role="tablist">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              onClick={() => setTab(name)}
              className={`cursor-pointer rounded-lg py-2 text-sm font-semibold transition ${tab === name ? 'bg-white text-(--c-text) shadow-sm' : 'text-(--c-muted) hover:text-(--c-text)'}`}
            >
              {name}
            </button>
          ))}
        </div>

        <div key={tab} className="animate-reveal mt-5">
          {tab === 'Roadmap' && <Roadmap app={app} detail={detail} />}
          {tab === 'Activity' && <Activity detail={detail} loading={loading} />}
          {tab === 'Details' && <Details app={app} detail={detail} filter={filter} />}
        </div>
      </aside>
    </div>,
    document.body
  );
}

export default AppRoadmapDrawer;

import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

import PeriodFilter from '../../../components/PeriodFilter';
import { SOURCES } from '../utils/sources';

const number = (value) => value.toLocaleString('en-IN');

// One row per Platform Overview card, in the order the cards are shown (SETU AI is split into its two numbers).
const ROWS = [
  { key: 'leads', title: 'New Leads', value: (c) => c.leadsInPeriod },
  { key: 'members', title: 'New Members', value: (c) => c.membersInPeriod },
  { key: 'notLogin', title: 'SETU AI · Not login', value: (c) => c.otpNotLogin },
  { key: 'loggedIn', title: 'SETU AI · Logged in', value: (c) => c.otpLoggedIn },
  { key: 'apps', title: 'New Apps', value: (c) => c.trustsInPeriod },
  { key: 'products', title: 'Products in New Apps', value: (c) => c.productsInNewApps },
  { key: 'appMembersIn', title: 'New Apps · Members logged in', value: (c) => c.appMembersLoggedIn },
  { key: 'appMembers', title: 'New Apps · No. of Members', value: (c) => c.appMembers },
  { key: 'activity', title: 'App Activity', value: (c) => c.activity.total },
  { key: 'otherLogin', title: 'Other App Login', value: (c) => c.pwaLogins },
  { key: 'setuActivity', title: 'SETU APP Activity', value: (c) => c.activity.setuAi },
  { key: 'panelActivity', title: 'User Panel Activity', value: (c) => c.activity.userPanel },
  { key: 'otherActivity', title: 'Other App Activity', value: (c) => c.activity.otherApps },
];

// Rows that get a "cost per" under the Meta and Google columns: the platform's ad spend divided by the row's number.
const COST_ROWS = new Set(['leads', 'members', 'apps', 'products', 'appMembersIn', 'appMembers', 'loggedIn']);
const cost = (spend, value) => (spend > 0 && value > 0 ? `₹${Math.round(spend / value).toLocaleString('en-IN')}` : null);

const money = (value) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const SPEND_SOURCES = ['meta', 'google', 'googleclick'];

/** The campaigns that spent money in the period, under their source, with each source's total: shown above the comparison table. */
function CampaignSpend({ adSpend }) {
  const groups = SPEND_SOURCES.map((key) => ({
    source: SOURCES.find((source) => source.key === key),
    total: adSpend?.[key] ?? 0,
    campaigns: (adSpend?.campaigns ?? []).filter((campaign) => campaign.source === key),
  })).filter((group) => group.campaigns.length > 0);

  return (
    <section className="mb-4 rounded-xl border border-gray-200 p-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold">Ad Spend by Campaign</h3>
        <p className="text-sm font-bold tabular-nums">
          {money(groups.reduce((sum, group) => sum + group.total, 0))} <span className="text-xs font-medium text-(--c-text-3)">total spend</span>
        </p>
      </div>
      {groups.length === 0 ? (
        <p className="mt-2 text-sm text-(--c-text-3)">No ad spend in this period.</p>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {groups.map(({ source, total, campaigns }) => (
            <div key={source.key} className="min-w-0 rounded-lg bg-(--c-page) p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-bold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: source.color }} />
                  {source.short}
                </span>
                <span className="text-sm font-bold tabular-nums">{money(total)}</span>
              </div>
              <ul className="mt-2 space-y-1.5">
                {campaigns.map((campaign) => (
                  <li key={campaign.id} className="flex items-start justify-between gap-2 text-xs">
                    <span className="min-w-0 break-words text-(--c-text-2)">
                      {campaign.name}
                      {/paused|disabled|removed/i.test(campaign.status ?? '') && <span className="ml-1.5 rounded-full bg-gray-200 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase">{campaign.status}</span>}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{money(campaign.spend)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const percent = (part, whole) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '–');

/** Every Platform Overview card split by lead source: the numbers, each source's share of the row, and the leading source marked. */
function CompareModal({ sources, adSpend, loading, filter, onFilterChange, periodLabel, onClose }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const rows = useMemo(
    () =>
      (sources ? ROWS : []).map(({ key, title, value }) => {
        const cells = SOURCES.map((source) => ({ source, value: value(sources?.find((s) => s.key === source.key)?.cards ?? EMPTY) }));
        const total = cells.reduce((sum, cell) => sum + cell.value, 0);
        const top = Math.max(...cells.map((cell) => cell.value));
        return { key, title, cells, total, top };
      }),
    [sources]
  );

  // Drawn on document.body: inside the page a transformed parent would make "fixed" relative to it, not the screen.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Source comparison" className="flex max-h-[96vh] w-full max-w-6xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-gray-200 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">Source Comparison</h2>
            <p className="mt-0.5 text-sm text-(--c-text-3)">
              {periodLabel} · the leading source of each row is highlighted.
            </p>
          </div>
          <div className="order-last w-full lg:order-none lg:w-auto">
            <PeriodFilter filter={filter} onChange={onFilterChange} />
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-(--c-text-2) hover:bg-gray-100">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className={`min-h-0 flex-1 overflow-auto px-4 py-3 transition-opacity sm:px-6 ${loading ? 'pointer-events-none opacity-50' : ''}`} aria-busy={loading}>
          {loading && !sources && <p className="py-10 text-center text-sm text-(--c-text-2)">Loading…</p>}
          {sources && <CampaignSpend adSpend={adSpend} />}
          {/* Phones: one card per metric, every source as a bar */}
          <ul className="space-y-3 md:hidden">
            {rows.map((row) => (
              <li key={row.key} className="rounded-xl border border-gray-200 p-3.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-bold">{row.title}</h3>
                  <p className="text-sm font-bold tabular-nums">
                    {number(row.total)} <span className="text-xs font-medium text-(--c-text-3)">total</span>
                  </p>
                </div>
                <ul className="mt-2.5 space-y-2">
                  {row.cells.map(({ source, value }) => {
                    const leading = row.top > 0 && value === row.top;
                    const perUnit = COST_ROWS.has(row.key) ? cost(adSpend?.[source.key], value) : null;
                    return (
                      <li key={source.key}>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: source.color }} />
                            <span className={`truncate ${leading ? 'font-bold' : 'font-medium text-(--c-text-2)'}`}>{source.short}</span>
                          </span>
                          <span className="shrink-0 tabular-nums">
                            <span className={leading ? 'font-bold' : 'font-semibold'}>{number(value)}</span>
                            <span className="ml-1.5 text-(--c-text-3)">{percent(value, row.total)}</span>
                            {perUnit && <span className="ml-1.5 font-semibold text-(--c-link)">{perUnit} each</span>}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full" style={{ width: row.total > 0 ? `${(value / row.total) * 100}%` : 0, background: source.color, opacity: leading ? 1 : 0.55 }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>

          {/* Tablet and desktop: the full comparison table */}
          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 md:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-(--c-page)">
                  <th className="sticky left-0 z-10 bg-(--c-page) px-3 py-2 text-left text-xs font-semibold text-(--c-text-3)">Card</th>
                  {SOURCES.map((source) => (
                    <th key={source.key} className="px-1.5 py-2 text-right text-xs font-semibold text-(--c-text-3)">
                      <span className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: source.color }} />
                        {source.short}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right text-xs font-semibold text-(--c-text-3)">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((row) => (
                  <tr key={row.key}>
                    <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 text-left text-[0.8rem] font-semibold">
                      {row.title}
                    </th>
                    {row.cells.map(({ source, value }) => {
                      const leading = row.top > 0 && value === row.top;
                      const perUnit = COST_ROWS.has(row.key) ? cost(adSpend?.[source.key], value) : null;
                      return (
                        <td key={source.key} className="whitespace-nowrap px-1.5 py-1.5 text-right tabular-nums" style={leading ? { background: `color-mix(in srgb, ${source.color} 14%, white)` } : undefined}>
                          <span className={leading ? 'font-bold' : value === 0 ? 'text-(--c-muted)' : 'font-medium'}>{number(value)}</span>
                          <span className="ml-1 text-[0.65rem] text-(--c-text-3)">{percent(value, row.total)}</span>
                          {perUnit && <span className="block text-[0.65rem] font-semibold text-(--c-link)" title={`Ad spend ÷ ${row.title}`}>{perUnit} each</span>}
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap bg-(--c-accent-soft)/30 px-3 py-1.5 text-right font-bold tabular-nums">{number(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

const EMPTY = { leadsInPeriod: 0, membersInPeriod: 0, otpNotLogin: 0, otpLoggedIn: 0, pwaLogins: 0, trustsInPeriod: 0, productsInNewApps: 0, appMembers: 0, appMembersLoggedIn: 0, activity: { total: 0, setuAi: 0, userPanel: 0, otherApps: 0 } };

export default CompareModal;

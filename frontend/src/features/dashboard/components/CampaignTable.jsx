import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';

import ScrollTable from '../../../components/ScrollTable';
import { formatPercent, percentOf } from '../../../utils/percent';
import { COLORS } from '../../marketing/utils/leadStats';

const SMALL_SAMPLE = 10; // fewer leads than this and a percentage is too shaky to read much into

const th = 'px-3 py-3 text-left align-top text-xs font-bold uppercase tracking-[0.06em] text-(--c-text)';
const sm = 'mt-1 block text-[0.7rem] font-normal normal-case leading-snug tracking-normal text-(--c-muted)';
const number = (value) => value.toLocaleString('en-IN');

const BADGES = {
  Facebook: { text: 'Fb', color: COLORS.facebook },
  Instagram: { text: 'Ig', color: COLORS.instagram },
  Website: { text: 'Web', color: COLORS.website },
  'Google Ads': { text: 'Gs', color: COLORS.google },
  'Google Click': { text: 'Gc', color: COLORS.google },
  WhatsApp: { text: 'Wa', color: '#1fa855' },
  Organic: { text: 'Or', color: '#d63384' },
  Unknown: { text: '?', color: '#64748b' },
};

function Badge({ channel }) {
  const { text, color } = BADGES[channel] ?? { text: 'Ot', color: COLORS.other };
  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[0.7rem] font-bold text-white"
      style={{ background: color }}
      aria-hidden="true"
    >
      {text}
    </span>
  );
}

/** Logo tile for a sub-row: Facebook and Instagram get their logos, an ad set a neutral tag, other platforms the usual letters. */
function RowIcon({ kind, label }) {
  const tile = 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white';
  const svg = { viewBox: '0 0 24 24', className: 'h-4 w-4', 'aria-hidden': true };
  if (kind === 'platform' && label === 'Facebook') {
    return (
      <span className={tile} style={{ background: '#1877f2' }}>
        <svg {...svg} fill="currentColor">
          <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.4 1.5-1.4h1.5V4.5c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.3H8v3h2.6V21h2.9z" />
        </svg>
      </span>
    );
  }
  if (kind === 'platform' && label === 'Instagram') {
    return (
      <span className={tile} style={{ background: 'linear-gradient(45deg, #f9a03f 0%, #e1306c 50%, #833ab4 100%)' }}>
        <svg {...svg} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="4" y="4" width="16" height="16" rx="4.5" />
          <circle cx="12" cy="12" r="3.6" />
          <circle cx="16.9" cy="7.1" r="0.6" fill="currentColor" />
        </svg>
      </span>
    );
  }
  if (kind === 'platform') {
    const { text, color } = BADGES[label] ?? { text: 'Ot', color: COLORS.other };
    return (
      <span className={`${tile} text-[0.62rem] font-bold`} style={{ background: color }}>
        {text}
      </span>
    );
  }
  // ad set: a tag
  return (
    <span className={`${tile} bg-(--c-track) text-(--c-muted)`}>
      <svg {...svg} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 12.5V5a1.5 1.5 0 0 1 1.5-1.5h7.5L20.5 11.5 12 20z" />
        <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

function Chevron({ open }) {
  return (
    <svg viewBox="0 0 20 20" className={`h-4 w-4 transition-transform ${open ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 8 5 5 5-5" />
    </svg>
  );
}

/** The numbers of one row (a campaign, or one of its platforms / ad sets). */
function NumberLink({ to, title, children }) {
  return (
    <Link
      to={to}
      state={{ backLabel: 'Dashboard' }}
      title={title}
      className="rounded-md px-1.5 py-0.5 font-semibold text-(--c-good) underline decoration-dotted underline-offset-4 hover:bg-(--c-good-bg)"
    >
      {children}
    </Link>
  );
}

/** A number that opens the list behind it; a zero has nothing to open. */
function Count({ value, to, title }) {
  return value > 0 ? (
    <NumberLink to={to} title={title}>
      {number(value)}
    </NumberLink>
  ) : (
    <span className="font-semibold">0</span>
  );
}

/** `pathFor(stage)` is the page listing the people behind a number; every number opens exactly the people (or leads) it counts. */
function Figures({ row, pathFor, peoplePath }) {
  const leadsTo = pathFor();
  const notLoggedIn = Math.max(row.leads - row.loggedIn, 0); // leads who never logged in
  const noApp = Math.max(row.loggedIn - row.creators, 0); // logged in but did not create an app
  const leadToApp = percentOf(row.creators, row.leads);
  const shaky = row.leads < SMALL_SAMPLE;
  const slash = <span className="px-1.5 text-(--c-faint)">/</span>;

  return (
    <>
      <td className="px-3 py-3 tabular-nums text-(--c-text-2)">
        <Count value={row.leads} to={leadsTo} title="See all these leads" />
      </td>
      <td className="whitespace-nowrap px-3 py-3 tabular-nums text-(--c-text-2)">
        <Count value={row.loggedIn} to={pathFor('loggedIn')} title="See the leads who logged in" />
        {slash}
        <Count value={notLoggedIn} to={pathFor('notLoggedIn')} title="See the leads who never logged in" />
      </td>
      <td className="whitespace-nowrap px-3 py-3 tabular-nums text-(--c-text-2)">
        <Count value={row.creators} to={peoplePath('app')} title={`See the people who created an app (${number(row.apps)} app${row.apps === 1 ? '' : 's'} in total)`} />
        {slash}
        <Count value={noApp} to={pathFor('noApp')} title="See the people who logged in but have not created an app" />
      </td>
      <td className="px-3 py-3 tabular-nums">
        <Count value={row.activeCreators} to={pathFor('active')} title="See the people whose app is in use" />
        <span className="block px-1.5 text-xs text-(--c-muted)">of {number(row.creators)}</span>
      </td>
      <td className={`px-4 py-3 tabular-nums ${shaky ? 'opacity-60' : ''}`} title={shaky ? 'Few leads: treat this percentage with care' : undefined}>
        {leadToApp === null || row.creators === 0 ? (
          <span className="text-(--c-faint)">—</span>
        ) : (
          <span className="px-1.5 font-semibold">{formatPercent(leadToApp)}%</span>
        )}
      </td>
    </>
  );
}

/** Sub-rows of a campaign; `field` ('platform' | 'adSet') narrows the lead page opened from a row's Leads number. */
function SubRows({ title, rows, leadsPath, peoplePath, field, iconLabel }) {
  if (rows.length === 0) return null;
  return (
    <>
      <tr className="bg-(--c-page)">
        <td colSpan={6} className="border-t border-gray-200 px-4 py-2 pl-14 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-(--c-link)">
          {title}
        </td>
      </tr>
      {rows.map((row) => (
        <tr key={`${title}-${row.label}`} className="bg-(--c-page)">
          <td className="px-4 py-2.5 pl-14">
            <div className="flex items-center gap-2.5">
              <RowIcon kind={field} label={iconLabel ?? row.label} />
              <span className="font-semibold text-(--c-text-2)">{row.label}</span>
            </div>
          </td>
          <Figures row={row} pathFor={(stage) => leadsPath({ [field]: row.label, ...(stage && { stage }) })} peoplePath={(stage) => peoplePath({ [field]: row.label, stage })} />
        </tr>
      ))}
    </>
  );
}

/**
 * Which campaign brings people who build and use apps. One row per campaign (leads with no campaign are grouped by
 * where they came from); a campaign opens to show the same numbers by platform and by ad set.
 */
function CampaignTable({ campaigns, scope, control, filter, sourceKey, embedded = false }) {
  const [open, setOpen] = useState(() => new Set());
  const toggle = (label) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(label)) next.add(label);
      return next;
    });

  // The page listing the leads behind a row: this campaign (optionally one platform / ad set), for the period shown here.
  // `base` is the lead list (/campaign-leads), or the registrations page for the numbers that count people with an app.
  const pathTo = (base, campaign, extra = {}) => {
    const channels = campaigns?.find((item) => item.label === campaign)?.channels; // tells the lead page which platform filters make sense
    const params = new URLSearchParams({ campaign, ...(sourceKey && { source: sourceKey }), ...(channels?.length && { channels: channels.join(',') }), ...extra });
    if (filter?.range) params.set('range', filter.range);
    if (filter?.range === 'custom') {
      if (filter.from) params.set('from', filter.from);
      if (filter.to) params.set('to', filter.to);
    }
    return `${base}?${params}`;
  };
  const leadsPath = (campaign, extra) => pathTo('/campaign-leads', campaign, extra);
  const peoplePath = (campaign, extra) => pathTo('/registrations', campaign, extra);

  return (
    <section className={embedded ? '' : 'rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]'}>
      {!embedded && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-sm font-semibold">Campaign Performance{scope ? ` · ${scope}` : ''}</h3>
              {campaigns && <span className="rounded-full bg-(--c-accent-soft) px-2.5 py-0.5 text-xs font-semibold text-(--c-link)">{campaigns.length}</span>}
            </div>
            {control}
          </div>
          <p className="mt-1 text-xs text-(--c-muted)">
            Which campaign brings people who build and use apps · leads received in this period, followed through · matched by mobile number
          </p>
        </>
      )}

      {!campaigns ? (
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-gray-50" />
      ) : campaigns.length === 0 ? (
        <p className="mt-4 rounded-xl border border-gray-200 px-4 py-10 text-center text-sm text-(--c-muted)">No leads in this period</p>
      ) : (
        <ScrollTable className="mt-4">
          <table className="w-full text-sm">
            <thead className="bg-(--c-page)">
              <tr>
                <th className={th}>Campaign</th>
                <th className={`${th}`}>
                  <span className="block">Total Leads</span>
                  <small className={sm}>Filled the lead form</small>
                </th>
                <th className={`${th}`}>
                  <span className="block">Logged In / Not Logged In</span>
                  <small className={sm}>Logged in to the app / never logged in</small>
                </th>
                <th className={`${th}`}>
                  <span className="block">Created App / No App</span>
                  <small className={sm}>Built an app / not built yet</small>
                </th>
                <th className={`${th}`}>
                  <span className="block">Apps In Use</span>
                  <small className={sm}>App has activity</small>
                </th>
                <th className={`${th}`}>
                  <span className="block">Lead → App</span>
                  <small className={sm}>% of leads who built an app</small>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {campaigns.map((campaign) => {
                const whatsapp = campaign.kind === 'whatsapp';
                const expandable = campaign.platforms.length > 1 || campaign.adSets.length > 0 || whatsapp;
                const isOpen = open.has(campaign.label);

                return (
                  <Fragment key={campaign.label}>
                    <tr>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Badge channel={whatsapp ? 'WhatsApp' : campaign.channels[0]} />
                          <div className="min-w-0">
                            <p className="font-semibold">{campaign.label}</p>
                            <p className="text-xs text-(--c-muted)">{[...(whatsapp ? ['WhatsApp'] : []), ...campaign.channels].join(' · ')}</p>
                          </div>
                          {expandable && (
                            <button
                              type="button"
                              onClick={() => toggle(campaign.label)}
                              aria-expanded={isOpen}
                              title={isOpen ? 'Hide the split' : whatsapp ? 'Split by sub source' : 'Split by platform and ad set'}
                              className="ml-auto inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-200 text-(--c-muted) hover:bg-gray-50"
                            >
                              <Chevron open={isOpen} />
                            </button>
                          )}
                        </div>
                      </td>
                      <Figures row={campaign} pathFor={(stage) => leadsPath(campaign.label, stage ? { stage } : {})} peoplePath={(stage) => peoplePath(campaign.label, { stage })} />
                    </tr>
                    {isOpen && (
                      <>
                        <SubRows title={whatsapp ? 'By sub source' : 'By platform'} rows={campaign.platforms} leadsPath={(extra) => leadsPath(campaign.label, extra)} peoplePath={(extra) => peoplePath(campaign.label, extra)} field="platform" iconLabel={whatsapp ? 'WhatsApp' : undefined} />
                        <SubRows title="By ad set" rows={campaign.adSets} leadsPath={(extra) => leadsPath(campaign.label, extra)} peoplePath={(extra) => peoplePath(campaign.label, extra)} field="adSet" />
                      </>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </ScrollTable>
      )}
    </section>
  );
}

export default CampaignTable;

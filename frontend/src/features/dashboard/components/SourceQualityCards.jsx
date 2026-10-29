import { useEffect, useRef, useState } from 'react';

import { formatPercent, percentOf } from '../../../utils/percent';
import { SOURCES } from '../utils/sources';
import SourceIcon from './SourceIcon';

const EMPTY = { leads: 0, creators: 0, activeCreators: 0, apps: 0, actions: 0, loggedIn: 0, platforms: [], rank: null };
const number = (value) => value.toLocaleString('en-IN');

/** The steps shown on each card, in order, each as a share of all leads. */
const STAGES = [
  { key: 'leads', label: 'Leads', verb: 'leads' },
  { key: 'loggedIn', label: 'Logged in', verb: 'logged in' },
  { key: 'creators', label: 'Built an app', verb: 'built an app' },
  { key: 'activeCreators', label: 'App activity', verb: 'have app activity' },
];

function SourceCard({ meta, source, wide, onSelect }) {
  const s = source ?? EMPTY;
  const empty = s.leads === 0;
  const avgActions = s.apps > 0 ? Math.round(s.actions / s.apps) : null;

  // No leads, but members of this source still logged in / built apps / used apps: show those as bars (counts, scaled to the biggest one).
  const c = s.cards;
  const fallbackStages = c
    ? [
        { label: 'Logged in (SETU AI)', value: c.otpLoggedIn },
        { label: 'Other app login', value: c.pwaLogins },
        { label: 'Built an app', value: c.trustsInPeriod },
        { label: 'App activity', value: c.activity.total },
      ]
    : [];
  const fallbackMax = Math.max(1, ...fallbackStages.map((stage) => stage.value));
  const fallback = empty && Boolean(c); // always bars (zeros included), never a blank card
  const fallbackQuiet = fallbackStages.every((stage) => stage.value === 0);

  // With one source chosen its card is just a summary (not a button); with all five shown, a card picks its source.
  const Card = wide ? 'div' : 'button';
  const behaviour = wide
    ? { className: 'border-(--c-accent)/40' }
    : {
        type: 'button',
        onClick: onSelect,
        title: `Show only ${meta.label}`,
        className: 'cursor-pointer border-gray-200 transition hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(15,148,136,0.18)]',
      };

  return (
    <Card {...behaviour} className={`flex flex-col rounded-2xl border bg-white text-left ${wide ? 'p-4' : 'p-3'} shadow-[0_1px_3px_rgba(20,33,61,0.06)] ${behaviour.className}`}>
      <div className={`flex gap-3 ${wide ? 'items-start' : 'flex-col gap-2'}`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ background: meta.color }} aria-hidden="true">
          <SourceIcon sourceKey={meta.key} letter={meta.letter} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`font-semibold ${wide ? '' : 'truncate text-sm'}`} title={meta.label}>{meta.label}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {s.platforms.map((name) => (
              <span key={name} className="rounded-full bg-(--c-band) px-2 py-0.5 text-[0.65rem] font-medium text-(--c-text-2)">{name}</span>
            ))}
          </div>
        </div>
      </div>

      {fallback ? (
        <div className={`space-y-3 ${wide ? 'mt-4' : 'mt-3'}`}>
          <p className="text-xs text-(--c-muted)">{fallbackQuiet ? 'No leads and no activity in this period' : 'No leads in this period, but these people were active'}</p>
          {fallbackStages.map((stage) => (
            <div key={stage.label}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-(--c-text)">{stage.label}</p>
                <span className="rounded-full px-2 py-0.5 text-[0.7rem] font-bold tabular-nums text-white" style={{ background: meta.color }}>
                  {number(stage.value)}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 rounded-full bg-(--c-track)">
                <div className="animate-grow h-full origin-left rounded-full" style={{ width: `${(stage.value / fallbackMax) * 100}%`, background: meta.color }} />
              </div>
            </div>
          ))}
        </div>
      ) : empty ? (
        <p className={`text-sm text-(--c-muted) ${wide ? 'mt-4' : 'mt-3'}`}>No leads in this period</p>
      ) : (
        <div className={`space-y-3 ${wide ? 'mt-4' : 'mt-3'}`}>
          {STAGES.map((stage) => {
            const share = percentOf(s[stage.key], s.leads) ?? 0;
            return (
              <div key={stage.key}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-(--c-text)">{stage.label}</p>
                  <span className="rounded-full px-2 py-0.5 text-[0.7rem] font-bold tabular-nums text-white" style={{ background: meta.color }}>
                    {formatPercent(share)}%
                  </span>
                </div>
                <p className="text-xs text-(--c-muted)">
                  {stage.key === 'leads' ? `${number(s.leads)} lead${s.leads === 1 ? '' : 's'} received` : wide ? `${number(s[stage.key])} of ${number(s.leads)} leads ${stage.verb}` : `${number(s[stage.key])} of ${number(s.leads)}`}
                </p>
                <div className="mt-1.5 h-2.5 rounded-full bg-(--c-track)">
                  <div className="animate-grow h-full origin-left rounded-full" style={{ width: `${share}%`, background: meta.color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-xs text-(--c-muted)">
        {fallback ? `${number(c.trustsInPeriod)} app${c.trustsInPeriod === 1 ? '' : 's'} created` : empty || s.apps === 0 ? 'No apps created yet' : !wide ? `${number(s.apps)} app${s.apps === 1 ? '' : 's'} built` : `${number(s.creators)} ${s.creators === 1 ? 'person' : 'people'} built ${number(s.apps)} app${s.apps === 1 ? '' : 's'}${avgActions !== null ? ` · ${number(avgActions)} actions per app on average` : ''}`}
      </p>
    </Card>
  );
}

/**
 * One card per lead source, busiest first. Four fill the row on a wide screen (two on a phone); the others sit just off to the
 * right. Round buttons slide the row one screenful at a time, in either direction, and show only when there is more that way.
 * Clicking a card filters the whole dashboard.
 */
function SourceQualityCards({ sources, selected, onSelect, loading, embedded = false }) {
  const track = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: false }); // is the row scrolled all the way to its start / end
  const chosen = SOURCES.find((meta) => meta.key === selected) ?? null; // one source picked: show only its card

  // busiest sources first (ties keep the usual order), so the cards that matter are the ones in view
  const leadsOf = (meta) => sources?.find((s) => s.key === meta.key)?.leads ?? 0;
  const ordered = [...SOURCES].sort((a, b) => leadsOf(b) - leadsOf(a));

  const measure = () => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  };
  // measured again whenever the cards or the width change (a phone turning round shows a different number of cards)
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [sources, chosen]);
  // one screenful at a time: the visible width plus the gap, which lands exactly on a card
  const slide = (direction) => track.current?.scrollBy({ left: direction * (track.current.clientWidth + 12), behavior: 'smooth' });

  const body = loading && !sources ? (
    <div className="h-52 animate-pulse rounded-2xl bg-(--c-band)" />
  ) : (
    <>
      {!chosen && <p className="mb-3 text-xs text-(--c-muted)">Click a source to filter the whole dashboard.</p>}
      {chosen ? (
        <div className="stagger grid gap-3">
          <SourceCard meta={chosen} source={sources?.find((s) => s.key === chosen.key)} wide onSelect={() => onSelect(chosen.key)} />
        </div>
      ) : (
        <div className="relative">
          <div ref={track} onScroll={measure} className="scrollbar-none stagger flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth py-2 -my-2">
            {ordered.map((meta) => (
              <div key={meta.key} className="flex shrink-0 basis-[calc((100%-0.75rem)/2)] snap-start sm:basis-[calc((100%-1.5rem)/3)] md:basis-[calc((100%-2.25rem)/4)] [&>*]:w-full">
                <SourceCard meta={meta} source={sources?.find((s) => s.key === meta.key)} onSelect={() => onSelect(meta.key)} />
              </div>
            ))}
          </div>
          {[
            { direction: -1, side: '-left-3', hidden: edges.start, label: 'Show the previous sources', glyph: '‹' },
            { direction: 1, side: '-right-3', hidden: edges.end, label: 'Show more sources', glyph: '›' },
          ].map(({ direction, side, hidden, label, glyph }) => (
            <button
              key={direction}
              type="button"
              onClick={() => slide(direction)}
              title={label}
              aria-label={label}
              tabIndex={hidden ? -1 : 0}
              className={`absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-xl text-(--c-link) shadow-[0_6px_16px_rgba(20,33,61,0.18)] transition duration-200 hover:scale-110 hover:bg-(--c-accent-soft) ${side} ${hidden ? 'pointer-events-none scale-75 opacity-0' : ''}`}
            >
              <span aria-hidden="true">{glyph}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );

  if (embedded) return body;
  return (
    <section className="rounded-2xl border border-(--c-border) bg-(--c-band) p-4 sm:p-5">
      <h3 className="mb-1 text-sm font-semibold">Lead Source Quality</h3>
      {body}
    </section>
  );
}

export default SourceQualityCards;

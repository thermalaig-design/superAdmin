import { useState } from 'react';
import { Link } from 'react-router-dom';

import SourceIcon from '../../dashboard/components/SourceIcon';
import { COLORS } from '../../marketing/utils/leadStats';
import { useEditPath } from '../hooks/useEditPath';
import { useTargetsView } from '../hooks/useTargetsView';
import { money, STATUS } from '../utils/targetMath';

const SEGMENTS = ['green', 'yellow', 'red'];
const PLATFORM_STYLE = {
  Meta: { key: 'meta', color: COLORS.facebook },
  Google: { key: 'google', color: COLORS.google },
};

/** Logo tile of the platform a campaign runs on. */
export function PlatformTile({ platform, className = 'h-9 w-9' }) {
  const { key, color } = PLATFORM_STYLE[platform];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-xl text-white ${className}`} style={{ background: color }} title={platform}>
      <SourceIcon sourceKey={key} className="h-5 w-5" />
    </span>
  );
}

/**
 * One campaign against its target. The big number is the cost per app now, with an arrow showing how far it is from the
 * target. The bar runs from ₹0 to 3x the target: green up to the target, yellow up to 2x, red beyond; the marker sits at the
 * current cost (pinned to the right edge when it is off the bar).
 */
function PlatformCard({ row, selected, onSelect }) {
  const [, setView] = useTargetsView();
  const editPath = useEditPath();
  const [hover, setHover] = useState(null); // index of the colour under the pointer
  const { target, costPerApp, status } = row;
  const max = target * 3;
  const noApps = costPerApp === null;
  const beyond = !noApps && costPerApp > max;
  const position = noApps ? (row.spend > 0 ? 100 : null) : Math.min(costPerApp / max, 1) * 100;
  const tone = status ? STATUS[status] : null;

  const gap = noApps ? null : Math.round(((costPerApp - target) / target) * 100);
  const bounds = [
    [0, target],
    [target, target * 2],
    [target * 2, max],
  ];
  const caption = hover !== null ? `${money(bounds[hover][0])} – ${money(bounds[hover][1])} · ${STATUS[SEGMENTS[hover]].range}` : null;

  return (
    // The whole card is clickable with the mouse; the name is the keyboard target (Enter / Space).
    <article
      onClick={onSelect}
      className={`group flex cursor-pointer flex-col gap-3 rounded-2xl border bg-white p-3 transition duration-200 hover:-translate-y-0.5 hover:border-(--c-accent) hover:shadow-[0_10px_24px_rgba(20,33,61,0.12)] ${
        selected ? 'border-2 border-(--c-accent) shadow-[0_6px_18px_rgba(20,33,61,0.1)]' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <PlatformTile platform={row.platform} className="h-8 w-8 rounded-lg [&_svg]:h-4 [&_svg]:w-4" />
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
            aria-pressed={selected}
            title="Open this campaign in the scorecard"
            className="cursor-pointer truncate rounded-md text-left text-sm font-bold hover:text-(--c-link) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-accent)"
          >
            {row.name}
          </button>
        </div>
        <Link
          to={editPath(row)}
          onClick={(event) => {
            event.stopPropagation();
            setView({ platform: row.platform });
          }}
          className="shrink-0 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-(--c-link) opacity-70 transition hover:bg-(--c-accent-soft) group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-accent)"
        >
          Edit target
        </Link>
      </div>

      {/* now vs target */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-(--c-muted)">Cost per app</p>
          <p className="text-2xl font-bold leading-tight tabular-nums" style={{ color: tone?.color }}>
            {money(costPerApp)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {tone && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: tone.bg, color: tone.color }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.color }} aria-hidden="true" />
              {tone.label}
            </span>
          )}
          <p className="flex items-center gap-1.5 text-xs text-(--c-text-3)">
            {gap !== null && (
              <b className="tabular-nums" style={{ color: tone?.color }}>
                {gap > 0 ? '▲' : '▼'} {Math.abs(gap)}%
              </b>
            )}
            <span>Target {money(target)}</span>
          </p>
        </div>
      </div>

      {/* the bar with the marker */}
      <div>
        <div className="relative h-6">
          {position !== null && (
            <span
              className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap rounded-md bg-(--c-text) px-1.5 py-0.5 text-[0.7rem] font-bold tabular-nums text-(--c-page) transition-[left] duration-700"
              style={{ left: `${Math.min(Math.max(position, 8), 92)}%` }}
            >
              {noApps ? 'no apps' : money(costPerApp)}
              {beyond ? ' ›' : ''}
            </span>
          )}
        </div>
        <div className="relative" onMouseLeave={() => setHover(null)}>
          <div className="flex h-3 overflow-hidden rounded-full">
            {SEGMENTS.map((key, index) => (
              <span
                key={key}
                onMouseEnter={() => setHover(index)}
                className="h-full flex-1 transition-opacity duration-150"
                style={{ background: STATUS[key].color, opacity: hover === null || hover === index ? 1 : 0.3 }}
              />
            ))}
          </div>
          {position !== null && (
            <span
              className="pointer-events-none absolute -top-1.5 h-6 w-[3px] -translate-x-1/2 rounded-full bg-(--c-text) ring-2 ring-white transition-[left] duration-700"
              style={{ left: `${position}%` }}
            />
          )}
        </div>
        <div className="mt-1.5 flex justify-between text-[0.7rem] tabular-nums text-(--c-muted)">
          <span>₹0</span>
          <span>{money(target)} target</span>
          <span>{money(target * 2)} (2x)</span>
          <span>{money(max)}</span>
        </div>
        <p className="mt-1 h-4 text-[0.7rem] font-semibold" style={{ color: hover !== null ? STATUS[SEGMENTS[hover]].color : undefined }} aria-live="polite">
          {caption}
        </p>
      </div>
    </article>
  );
}

export default PlatformCard;

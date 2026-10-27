import { Fragment } from 'react';
import { Link } from 'react-router-dom';

import TiltCard from './TiltCard';

/** A number that opens the list behind it when it has a link. */
function Figure({ value, caption, to, big, color }) {
  // each clickable number can have its own colour (the number and its underline)
  const tint = to && color ? { color, textDecorationColor: color } : undefined;
  const number = <span style={tint} className={`block font-semibold leading-none tracking-tight tabular-nums ${to && !color ? 'text-blue-600' : to ? '' : 'text-(--c-text)'} ${big ? 'text-[1.75rem]' : 'text-[1.5rem]'}`}>{value}</span>;
  return (
    <div className="min-w-0">
      {to ? (
        <Link to={to} style={tint} title={caption ? `See: ${caption}` : undefined} className="inline-block rounded-md underline decoration-blue-400 decoration-dotted decoration-2 underline-offset-[6px] transition hover:brightness-90 hover:decoration-solid focus-visible:outline-2 focus-visible:outline-(--accent)">
          {number}
        </Link>
      ) : (
        number
      )}
      {caption && <span className="mt-1.5 block text-[0.66rem] font-semibold uppercase leading-3.5 tracking-[0.06em] text-(--c-muted)">{caption}</span>}
    </div>
  );
}

/**
 * The dashboard's headline numbers, one card each.
 * `stats` is [{ accent (colour), label, parts: [{ value, caption, to, color }], hint, to }]: a card with two parts shows them as "a / b".
 * A part with `to` links to the list behind that number; a card with `to` is itself the link.
 */
function StatCards({ stats, loading }) {
  return (
    <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
      {stats.map(({ accent, label, parts, hint, to }) => (
        <TiltCard key={label} accent={accent} to={loading ? undefined : to} label={label}>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-(--c-muted)">
            <span className="h-2 w-2 shrink-0 rounded-full bg-(--accent) shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_25%,transparent)]" aria-hidden="true" />
            {label}
          </p>

          {loading ? (
            <div className="mt-2.5 h-8 w-24 animate-pulse rounded bg-(--c-track)" />
          ) : (
            <div className={`mt-2.5 grid items-start gap-x-3 ${parts.length > 1 ? 'grid-cols-[1fr_auto_1fr]' : ''}`}>
              {parts.map((part, index) => (
                <Fragment key={part.caption ?? index}>
                  {index > 0 && <span className="pt-1 text-xl font-light leading-none text-(--c-faint)">/</span>}
                  <Figure {...part} big={parts.length === 1} />
                </Fragment>
              ))}
            </div>
          )}

          {hint && (
            <p className="mt-2 truncate text-[0.76rem] text-(--c-muted)" title={loading ? undefined : hint}>
              {loading ? ' ' : hint}
            </p>
          )}
        </TiltCard>
      ))}
    </div>
  );
}

export default StatCards;

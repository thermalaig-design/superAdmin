import { useState } from 'react';

const SIZE = 150;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const TOP = 6; // slices drawn on their own; the rest are grouped as "Others"
const PALETTE = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
const OTHERS_COLOR = '#94a3b8';
const number = (value) => value.toLocaleString('en-IN');

/** items [{ label, value }] (any order) -> the top slices with colours, the rest as one "Others" slice that remembers its members. */
function toSlices(items) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const slices = sorted.slice(0, TOP).map((item, i) => ({ ...item, color: PALETTE[i] }));
  const rest = sorted.slice(TOP);
  if (rest.length) slices.push({ label: `Others (${rest.length})`, value: rest.reduce((sum, item) => sum + item.value, 0), color: OTHERS_COLOR, members: rest });
  return slices;
}

const pressed = (action) => (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
};

/**
 * One donut with its legend. The middle shows the total, or the hovered slice. With `onPick`, a slice (or its legend row) can be
 * clicked (`onClear` when the chosen one is clicked again); `picked` is the label of the chosen one. Clicking "Others" (the slice or its
 * row) opens the list of what it holds, each of which can be picked too, and clicking it again closes the list.
 */
function Donut({ title, subtitle, slices, onPick, onClear, picked }) {
  const [active, setActive] = useState(null);
  const [showOthers, setShowOthers] = useState(false);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const hovered = active === null ? null : slices[active];
  const others = slices.find((slice) => slice.members);
  // each arc starts where the previous one ends
  const arcs = slices.map((slice, i) => ({
    ...slice,
    length: (slice.value / total) * CIRCUMFERENCE,
    offset: (slices.slice(0, i).reduce((sum, s) => sum + s.value, 0) / total) * CIRCUMFERENCE,
  }));
  const percent = (value) => `${Math.round((value / total) * 100)}%`;

  // what a click on a slice does: "Others" opens / closes its list (and picks / clears it), the chosen one is cleared, any other is chosen
  const clickable = (slice) => Boolean(onPick || slice.members);
  const choose = (slice) => {
    if (slice.members) {
      setShowOthers(!showOthers);
      if (showOthers) onClear?.();
      else onPick?.(slice);
    } else if (picked === slice.label) onClear?.();
    else onPick?.(slice);
  };
  // a click on one of the things inside "Others": choose it, or go back to all of "Others"
  const chooseMember = (member) => onPick?.(picked === member.label ? others : member);
  const hoverRow = 'cursor-pointer hover:bg-(--c-accent-soft)';

  return (
    <div className="min-w-0">
      <h4 className="truncate text-sm font-semibold">{title}</h4>
      {subtitle && <p className="text-xs text-(--c-muted)">{subtitle}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
        <div className="relative h-[150px] w-[150px] shrink-0">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -rotate-90" role="img" aria-label={`${title}: ${total}`}>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--c-track)" strokeWidth={STROKE} />
            {arcs.map((arc, i) => (
              <circle
                key={arc.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={active === i || picked === arc.label ? STROKE + 4 : STROKE}
                strokeDasharray={`${Math.max(arc.length - (arcs.length > 1 ? 1.5 : 0), 0)} ${CIRCUMFERENCE}`}
                strokeDashoffset={-arc.offset}
                opacity={picked ? (picked === arc.label ? 1 : 0.35) : active === null || active === i ? 1 : 0.35}
                className={`transition-all ${clickable(arc) ? 'cursor-pointer' : ''}`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onClick={clickable(arc) ? () => choose(arc) : undefined}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold leading-none tabular-nums">{number(hovered?.value ?? total)}</span>
            <span className="mt-1 max-w-[84px] truncate text-[0.7rem] text-(--c-muted)">{hovered ? `${percent(hovered.value)} · ${hovered.label}` : 'Total'}</span>
          </div>
        </div>

        <ul className="min-w-[10rem] flex-1 space-y-1 text-sm">
          {slices.map((slice, i) => (
            <li key={slice.label}>
              <div
                role={clickable(slice) ? 'button' : undefined}
                tabIndex={clickable(slice) ? 0 : undefined}
                aria-expanded={slice.members ? showOthers : undefined}
                onClick={clickable(slice) ? () => choose(slice) : undefined}
                onKeyDown={clickable(slice) ? pressed(() => choose(slice)) : undefined}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                className={`flex items-center gap-2 rounded-md px-1.5 py-0.5 transition-opacity ${clickable(slice) ? hoverRow : ''} ${picked === slice.label ? 'bg-(--c-accent-soft) font-semibold' : ''} ${active === null || active === i ? '' : 'opacity-40'}`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: slice.color }} />
                <span className="min-w-0 flex-1 truncate text-(--c-text-2)" title={slice.label}>{slice.label}</span>
                <span className="font-semibold tabular-nums">{number(slice.value)}</span>
                <span className="w-9 text-right text-xs tabular-nums text-(--c-muted)">{percent(slice.value)}</span>
              </div>
              {slice.members && showOthers && (
                <ul className="ml-6 mt-1 space-y-0.5">
                  {slice.members.map((member) => (
                    <li
                      key={member.label}
                      role={onPick ? 'button' : undefined}
                      tabIndex={onPick ? 0 : undefined}
                      onClick={onPick ? () => chooseMember(member) : undefined}
                      onKeyDown={onPick ? pressed(() => chooseMember(member)) : undefined}
                      className={`flex items-center gap-2 rounded-md px-1.5 py-0.5 text-xs ${onPick ? hoverRow : ''} ${picked === member.label ? 'bg-(--c-accent-soft) font-semibold' : ''}`}
                    >
                      <span className="min-w-0 flex-1 truncate text-(--c-text-2)">{member.label}</span>
                      <span className="font-semibold tabular-nums">{number(member.value)}</span>
                      <span className="w-9 text-right tabular-nums text-(--c-muted)">{percent(member.value)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Two donuts for where the activity was: by module, and by page. Click a module (its slice or its row) and the page donut shows only
 * that module's pages; click it again, or "All modules", to go back. "Others" opens the list of the small modules it holds.
 * `pages` is [{ name, module, count }].
 */
function PageDonuts({ pages }) {
  // picked: { label, modules: [module names] } (an "Others" slice picks all the modules it holds)
  const [picked, setPicked] = useState(null);
  const [platform, setPlatform] = useState(null); // 'App' / 'User Panel' when the activity covers both and one is chosen

  // Activity that covers more than one platform (App Activity) gets a platform donut first; the others narrow down from it.
  const platformOf = (page) => (page.platform === 'user_panel' ? 'User Panel' : page.platform === 'app' ? 'App' : 'Other');
  const hasPlatforms = new Set(pages.map(platformOf)).size > 1;
  const inPlatform = platform ? pages.filter((page) => platformOf(page) === platform) : pages;

  // the same module / page name can exist on both platforms: say which one while both are shown
  const mixed = hasPlatforms && !platform;
  const tag = (text, page) => (mixed ? `${text} · ${platformOf(page)}` : text);
  const moduleOf = (page) => tag(page.module || page.name, page);

  const byPlatform = new Map();
  pages.forEach((page) => byPlatform.set(platformOf(page), (byPlatform.get(platformOf(page)) ?? 0) + page.count));
  const platformSlices = toSlices([...byPlatform].map(([label, value]) => ({ label, value })));

  const byModule = new Map();
  inPlatform.forEach((page) => byModule.set(moduleOf(page), (byModule.get(moduleOf(page)) ?? 0) + page.count));
  const moduleSlices = toSlices([...byModule].map(([label, value]) => ({ label, value })));

  const inPicked = picked ? inPlatform.filter((page) => picked.modules.includes(moduleOf(page))) : inPlatform;
  const pageSlices = toSlices(inPicked.map((page) => ({ label: tag(page.name, page), value: page.count })));

  const pick = (slice) => setPicked({ label: slice.label, modules: slice.members ? slice.members.map((member) => member.label) : [slice.label] });
  const pickPlatform = (slice) => {
    setPlatform(slice.label);
    setPicked(null);
  };
  const clearPlatform = () => {
    setPlatform(null);
    setPicked(null);
  };

  if (pages.length === 0) return <p className="text-sm text-(--c-muted)">No page activity in this period.</p>;

  return (
    <div className={`grid gap-6 ${hasPlatforms ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
      {hasPlatforms && <Donut title="By platform" subtitle="Click a platform to see its modules" slices={platformSlices} onPick={pickPlatform} onClear={clearPlatform} picked={platform} />}
      <Donut
        key={platform ?? 'all'}
        title={platform ? `Modules · ${platform}` : 'By module'}
        subtitle="Click a module to see its pages"
        slices={moduleSlices}
        onPick={pick}
        onClear={() => setPicked(null)}
        picked={picked?.label}
      />
      <div className="min-w-0">
        <Donut key={`${platform ?? 'all'}:${picked?.label ?? 'all'}`} title={picked ? `Pages · ${picked.label}` : platform ? `Pages · ${platform}` : 'By page'} subtitle={picked ? undefined : 'All pages'} slices={pageSlices} />
        {(picked || platform) && (
          <button type="button" onClick={() => (picked ? setPicked(null) : clearPlatform())} className="mt-2 cursor-pointer text-sm font-semibold text-(--c-link) hover:underline">
            {picked ? '← All modules' : '← All platforms'}
          </button>
        )}
      </div>
    </div>
  );
}

export default PageDonuts;

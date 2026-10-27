import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

import { AppsIcon, CampaignIcon, ChartIcon, ChevronDownIcon, SourcesIcon } from '../components/sidebar/icons';
import SourceIcon from '../features/dashboard/components/SourceIcon';
import { SOURCES, sourceByKey } from '../features/dashboard/utils/sources';

const REPORT_ITEMS = [
  { id: 'sources', label: 'Lead Sources', icon: SourcesIcon },
  { id: 'campaigns', label: 'Campaigns', icon: CampaignIcon },
  { id: 'apps', label: 'Active Apps', icon: AppsIcon },
  { id: 'growth', label: 'Growth', icon: ChartIcon },
];
const SUB_OPTIONS = [{ key: null, short: 'All sources', color: 'var(--c-accent)' }, ...SOURCES];

const reportHref = (id, key) => `/?${new URLSearchParams({ ...(key && { source: key }), open: id })}`;

const trigger =
  'flex h-10 cursor-pointer items-center gap-2 rounded-full px-3 text-sm font-medium text-(--c-text-2) transition hover:bg-(--c-accent-soft) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-accent)';

/** The source chosen on the dashboard (from the address), so the menu and the filter bar always agree. null = All, undefined = not on the dashboard. */
function useSelectedSource() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  if (pathname !== '/') return undefined;
  return sourceByKey(params.get('source'))?.key ?? null;
}

/** Source links for one report: each opens the dashboard on that source with that card open. */
function SourceLinks({ id, onPick }) {
  const selected = useSelectedSource();
  const isCurrent = (key) => selected === key;

  return SUB_OPTIONS.map(({ key, short, color }) => (
    <Link
      key={key ?? 'all'}
      to={reportHref(id, key)}
      onClick={onPick}
      aria-current={isCurrent(key) ? 'true' : undefined}
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${
        isCurrent(key) ? 'bg-(--c-accent-soft) font-semibold text-(--c-link)' : 'text-(--c-text-3) hover:bg-(--c-accent-soft)'
      }`}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />
      {short}
    </Link>
  ));
}

/** A button that opens a small panel under it; closes on outside click, Escape or picking a link. */
function Dropdown({ label, icon: Icon, align = 'left', children }) {
  const [open, setOpen] = useState(false);
  const selectedKey = useSelectedSource();
  const selected = sourceByKey(selectedKey);
  // icon colour: the selected source's colour, the teal accent for All, normal text colour off the dashboard
  const iconColor = selectedKey === null ? 'var(--c-accent)' : undefined;
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => !ref.current?.contains(event.target) && setOpen(false);
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="true" className={trigger}>
        {/* a source is selected: its logo replaces the report icon */}
        {selected ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-md text-[0.6rem] font-bold text-white" style={{ background: selected.color }}>
            <SourceIcon sourceKey={selected.key} letter={selected.letter} className="h-3.5 w-3.5" />
          </span>
        ) : (
          Icon && (
            <span className="transition-colors duration-200" style={iconColor ? { color: iconColor } : undefined}>
              <Icon />
            </span>
          )
        )}
        <span className="whitespace-nowrap">{label}</span>
        <span className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <ChevronDownIcon />
        </span>
      </button>
      {open && (
        <div className={`animate-pop fixed inset-x-2 top-[4.5rem] z-30 max-h-[70vh] overflow-y-auto rounded-2xl sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:w-56 border border-gray-200 bg-white p-2 shadow-[0_12px_32px_rgba(80,40,60,0.16)] ${align === 'right' ? 'sm:right-0' : 'sm:left-0'}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** Small screens: the four reports as a list; opening one shows its source links (one open at a time). */
function ReportsAccordion({ onPick }) {
  const [openId, setOpenId] = useState(null);

  return REPORT_ITEMS.map(({ id, label, icon: Icon }) => {
    const expanded = openId === id;
    return (
      <div key={id}>
        <button
          type="button"
          onClick={() => setOpenId(expanded ? null : id)}
          aria-expanded={expanded}
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-(--c-text-2) transition hover:bg-(--c-accent-soft)"
        >
          <Icon />
          <span className="flex-1 text-left">{label}</span>
          <span className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
            <ChevronDownIcon />
          </span>
        </button>
        {expanded && (
          <div className="animate-reveal ml-5 mt-0.5 mb-1 border-l border-(--c-border) pl-2">
            <SourceLinks id={id} onPick={onPick} />
          </div>
        )}
      </div>
    );
  });
}

/** Report shortcuts in the top bar: four dropdowns on wide screens, one "Reports" dropdown on smaller ones. */
function ReportsNav() {
  return (
    <>
      <nav className="hidden items-center gap-1 xl:flex" aria-label="Reports">
        {REPORT_ITEMS.map(({ id, label, icon }) => (
          <Dropdown key={id} label={label} icon={icon}>
            {(close) => <SourceLinks id={id} onPick={close} />}
          </Dropdown>
        ))}
      </nav>

      <div className="xl:hidden">
        <Dropdown label="Reports" align="right">
          {(close) => <ReportsAccordion onPick={close} />}
        </Dropdown>
      </div>
    </>
  );
}

export default ReportsNav;

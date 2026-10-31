import { useMemo, useState } from 'react';

import CountUp from '../../../components/CountUp';
import TiltCard from '../../../components/TiltCard';
import { BUCKETS, card, ghostButton, primaryButton } from '../utils/ui';
import Pill from './Pill';
import Conflicts from './Conflicts';

const PAGE = 100;
const cell = 'px-4 py-3';

// What each summary card counts, and which rows it shows when clicked.
const GROUPS = [
  { id: 'new', label: 'New members', hint: 'will be created', accent: 'var(--c-good)', has: (i) => i.bucket === 'new' },
  { id: 'link', label: 'Existing members', hint: 'added or updated in this trust', accent: 'var(--c-c4)', has: (i) => i.bucket === 'link' },
  { id: 'conflict', label: 'Need your decision', hint: 'choose below', accent: 'var(--c-c3)', has: (i) => i.bucket === 'review' || i.bucket === 'ambiguous' },
  { id: 'duplicate', label: 'Repeated in file', hint: 'skipped', accent: 'var(--c-c5)', has: (i) => i.bucket === 'duplicate' },
];

/**
 * Step 2: what the import will do. `items` = every row with its `bucket` (new, link, review, ambiguous, duplicate);
 * `decisions` = the user's answers for the review / ambiguous rows.
 */
function PreviewStep({ trustName, fileName, items, decisions, onDecide, onSameForAll, onBack, onImport, busy, error }) {
  const [filter, setFilter] = useState('all');
  const [limit, setLimit] = useState(PAGE);

  const counts = useMemo(() => Object.fromEntries(GROUPS.map((g) => [g.id, items.filter(g.has).length])), [items]);
  const conflicts = useMemo(() => items.filter(GROUPS[2].has), [items]);
  const open = conflicts.filter((item) => !decisions[item.row.rowNumber]).length;
  const importCount = counts.new + counts.link + (conflicts.length - open);

  const group = GROUPS.find((g) => g.id === filter);
  const shown = group ? items.filter(group.has) : items;

  const pickFilter = (id) => {
    setFilter((current) => (current === id ? 'all' : id));
    setLimit(PAGE);
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-(--c-text-3)">
        <b className="text-(--c-text)">{fileName}</b> → <b className="text-(--c-text)">{trustName}</b>
      </p>

      <div className="mi-stage mi-rise grid grid-cols-2 gap-3 md:grid-cols-4">
        {GROUPS.map((g) => (
          <TiltCard
            key={g.id}
            accent={g.accent}
            label={g.label}
            active={filter === g.id}
            onSelect={counts[g.id] > 0 ? () => pickFilter(g.id) : undefined}
          >
            <p className="text-xs font-medium text-(--c-text-3)">{g.label}</p>
            <p className="text-4xl font-bold tabular-nums" style={{ color: g.accent }}>
              <CountUp value={counts[g.id]} />
            </p>
            <p className="text-xs text-(--c-muted)">{g.hint}</p>
          </TiltCard>
        ))}
      </div>

      {conflicts.length > 0 && <Conflicts items={conflicts} decisions={decisions} onDecide={onDecide} onSameForAll={onSameForAll} />}

      <section className={card} style={{ '--d': '120ms' }}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{group ? group.label : 'All rows'}</h2>
          {group && (
            <button type="button" className="cursor-pointer text-sm text-(--c-link) hover:underline" onClick={() => setFilter('all')}>
              Show all rows
            </button>
          )}
        </div>
        <div className="max-h-[420px] overflow-auto rounded-xl border border-(--c-border)">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="sticky top-0 bg-(--c-band) text-xs text-(--c-muted)">
              <tr>
                <th className={cell}>Row</th>
                <th className={cell}>Name</th>
                <th className={cell}>Mobile</th>
                <th className={cell}>Role</th>
                <th className={cell}>Membership No.</th>
                <th className={cell}>What will happen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--c-border)">
              {shown.slice(0, limit).map(({ row, bucket, inTrust }, index) => {
                const resolved = (bucket === 'review' || bucket === 'ambiguous') && decisions[row.rowNumber];
                const look = BUCKETS[bucket === 'link' && inTrust ? 'linkUpdate' : bucket];
                return (
                  <tr key={row.rowNumber} className="mi-row mi-rowin" style={{ '--d': `${Math.min(index, 12) * 30}ms` }}>
                    <td className={`${cell} tabular-nums text-(--c-muted)`}>{row.rowNumber}</td>
                    <td className={`${cell} font-medium`}>{row.name}</td>
                    <td className={`${cell} tabular-nums`}>{row.phone}</td>
                    <td className={cell}>{row.role}</td>
                    <td className={cell}>{row.membershipNumber}</td>
                    <td className={cell}>
                      <Pill tone={resolved ? 'good' : look.tone}>{resolved ? 'Decided ✓' : look.label}</Pill>
                      <p className="mt-0.5 text-xs text-(--c-muted)">{look.hint}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {shown.length > limit && (
          <div className="mt-3 text-center">
            <button type="button" className={ghostButton} onClick={() => setLimit((n) => n + PAGE)}>
              Show more ({shown.length - limit} left)
            </button>
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-xl border border-(--c-bad-border) bg-(--c-bad-bg) px-4 py-3 text-sm text-(--c-bad-text)" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className={ghostButton} onClick={onBack} disabled={busy}>
          ← Back
        </button>
        <div className="flex flex-col items-end gap-1">
          {open > 0 && <p className="text-sm text-(--c-warn-text)">Decide the {open} highlighted rows to import</p>}
          <button type="button" className={primaryButton} disabled={open > 0 || importCount === 0 || busy} onClick={onImport}>
            {busy ? 'Importing…' : `Import ${importCount} ${importCount === 1 ? 'member' : 'members'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreviewStep;

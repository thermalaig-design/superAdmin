import { useState } from 'react';

import CountUp from '../../../components/CountUp';
import { downloadProblemRows, normalizePhone } from '../utils/rows';
import { card, ghostButton, input } from '../utils/ui';
import Pill from './Pill';

const FIELDS = [
  { key: 'name', label: 'Name', problem: 'Name', props: {} },
  { key: 'rawPhone', label: 'Mobile', problem: 'Mobile', props: { inputMode: 'tel' } },
  { key: 'role', label: 'Role', problem: 'Role', props: {} },
  { key: 'membershipNumber', label: 'Membership No.', problem: 'Membership', props: {} },
];

/** Moves the cursor to the next box (Enter works like Tab, so a whole list can be fixed from the keyboard). */
const goNext = (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  const boxes = [...event.currentTarget.closest('[data-fixlist]').querySelectorAll('input')];
  boxes[boxes.indexOf(event.currentTarget) + 1]?.focus();
};

/** One row in trouble. Every box checks itself as you type: a green tick when it is right, a red mark when it is not. */
function FixCard({ row, index, onEdit, onDelete }) {
  const [touched, setTouched] = useState({});
  const [leaving, setLeaving] = useState(false);
  const fixed = row.problems.length === 0;
  const digits = row.rawPhone.replace(/\D/g, '').length;
  const tidy = normalizePhone(row.rawPhone);

  const remove = () => {
    setLeaving(true);
    setTimeout(() => onDelete(row.rowNumber), 320);
  };

  return (
    <div className="mi-fixrow mi-rowin" data-fixed={fixed} data-leaving={leaving} style={{ '--d': `${Math.min(index, 8) * 60}ms` }}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-(--c-band) px-2 py-0.5 text-xs font-semibold tabular-nums text-(--c-text-3)">Row {row.rowNumber}</span>
        {fixed ? (
          <span key="fixed" className="mi-pop">
            <Pill tone="good">Fixed ✓</Pill>
          </span>
        ) : (
          row.problems.map((problem) => (
            <span key={problem} className="mi-pop">
              <Pill tone="bad">{problem}</Pill>
            </span>
          ))
        )}
        <button
          type="button"
          onClick={remove}
          className="ml-auto h-8 cursor-pointer rounded-lg px-2.5 text-xs font-medium text-(--c-bad-text) transition hover:bg-(--c-bad-bg)"
        >
          Remove row
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FIELDS.map((field) => {
          const bad = row.problems.some((p) => p.startsWith(field.problem));
          return (
            <label key={field.key} className="mi-field block" data-state={bad ? 'error' : 'ok'} data-touched={Boolean(touched[field.key])}>
              <span className="mb-1 flex items-center justify-between text-xs font-medium text-(--c-text-3)">
                {field.label}
                {field.key === 'rawPhone' && digits > 0 && !tidy && (
                  <span className={`tabular-nums ${digits === 10 ? 'text-(--c-good)' : 'text-(--c-warn-text)'}`}>{digits}/10 digits</span>
                )}
              </span>
              <span className="relative block">
                <input
                  className={input}
                  value={row[field.key]}
                  onChange={(event) => {
                    setTouched((t) => ({ ...t, [field.key]: true }));
                    onEdit(row.rowNumber, { [field.key]: event.target.value });
                  }}
                  onKeyDown={goNext}
                  aria-label={`${field.label}, row ${row.rowNumber}`}
                  aria-invalid={bad}
                  {...field.props}
                />
                <span key={bad ? 'bad' : 'good'} className="mi-field-icon" data-kind={bad ? 'error' : 'ok'} aria-hidden="true">
                  {bad ? '!' : '✓'}
                </span>
              </span>
              {field.key === 'rawPhone' && tidy && tidy !== row.rawPhone.trim() && (
                <button
                  type="button"
                  className="mi-pop mt-1.5 cursor-pointer rounded-full bg-(--c-accent-soft) px-2.5 py-0.5 text-xs font-medium text-(--c-link) transition hover:brightness-95"
                  onClick={() => onEdit(row.rowNumber, { rawPhone: tidy })}
                >
                  ✨ Use {tidy}
                </button>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The rows of the file that had a problem, each editable in place. A row stays in the list after it is fixed
 * (marked Fixed) so it does not jump away while it is still being typed.
 * `rows` = every row that was in trouble; `onEdit(rowNumber, patch)`; `onDelete(rowNumber)`; `onDeleteAll()`.
 */
function FixRows({ rows, onEdit, onDelete, onDeleteAll }) {
  const stillBroken = rows.filter((row) => row.problems.length > 0);
  const fixedCount = rows.length - stillBroken.length;
  const allFixed = stillBroken.length === 0;

  return (
    <section className={card} style={{ '--d': '200ms' }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-3 text-base font-semibold">
            <span className="mi-badge" style={{ background: allFixed ? 'linear-gradient(135deg, #34d399, var(--c-good))' : 'linear-gradient(135deg, var(--c-c3), #e0553a)' }}>
              {allFixed ? '✓' : '!'}
            </span>
            Fix the rows below
          </h2>
          <p className="mt-1 text-sm text-(--c-text-3)">Type in the boxes. Each one checks itself as you type. Press Enter to jump to the next box.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={ghostButton} onClick={() => downloadProblemRows(stillBroken)} disabled={!stillBroken.length}>
            Download list
          </button>
          <button
            type="button"
            className={ghostButton}
            disabled={!stillBroken.length}
            onClick={() => window.confirm(`Remove the ${stillBroken.length} rows that still have a problem? They will not be imported.`) && onDeleteAll()}
          >
            Remove rows with problems
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          {allFixed ? (
            <span className="mi-alldone font-semibold text-(--c-good)">🎉 All rows fixed. You can continue below.</span>
          ) : (
            <span className="text-(--c-text-2)">
              <b className="text-(--c-text)">
                <CountUp value={fixedCount} duration={500} />
              </b>{' '}
              of {rows.length} fixed
            </span>
          )}
          <span className="tabular-nums text-(--c-muted)">{rows.length ? Math.round((fixedCount / rows.length) * 100) : 0}%</span>
        </div>
        <div className="mi-progress" role="progressbar" aria-valuemin={0} aria-valuemax={rows.length} aria-valuenow={fixedCount}>
          <span style={{ '--p': rows.length ? fixedCount / rows.length : 0 }} />
        </div>
      </div>

      <div className="mt-4 space-y-3" data-fixlist>
        {rows.map((row, index) => (
          <FixCard key={row.rowNumber} row={row} index={index} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}

export default FixRows;

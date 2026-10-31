import { card, ghostButton } from '../utils/ui';
import Pill from './Pill';

const choice = (active) =>
  `mi-choice cursor-pointer rounded-xl border px-3 py-2 text-left text-sm ${
    active ? 'border-(--c-accent) bg-(--c-accent-soft) font-semibold text-(--c-link)' : 'border-(--c-border-strong) hover:bg-(--c-subtle)'
  }`;

function Review({ item, decision, onDecide }) {
  const { row, existing } = item;
  const options = [
    ['link', 'Same person', `Add ${existing.name || 'them'} to this trust`],
    ['update_name', 'Same person, new spelling', `Add to this trust and save the name as "${row.name}"`],
    ['create', 'A different person', 'Create a new member with this name'],
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm">
        Mobile <b className="tabular-nums">{row.phone}</b> is already saved as <b>{existing.name || '(no name)'}</b>, but your file says <b>{row.name}</b>.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map(([type, title, detail]) => (
          <button key={type} type="button" className={choice(decision?.type === type)} data-on={decision?.type === type} onClick={() => onDecide(row.rowNumber, { type })}>
            <span className="block font-medium">{title}</span>
            <span className="block text-xs text-(--c-text-3)">{detail}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Ambiguous({ item, decision, onDecide }) {
  const { row, matches } = item;
  return (
    <div className="space-y-3">
      <p className="text-sm">
        Mobile <b className="tabular-nums">{row.phone}</b> is saved under {matches.length} different members. Who is <b>{row.name}</b>?
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {matches.map((match) => (
          <button
            key={match.membersId}
            type="button"
            className={choice(decision?.type === 'link' && decision.membersId === match.membersId)}
            data-on={decision?.type === 'link' && decision.membersId === match.membersId}
            onClick={() => onDecide(row.rowNumber, { type: 'link', membersId: match.membersId })}
          >
            <span className="block font-medium">{match.name || '(no name)'}</span>
            <span className="block text-xs text-(--c-text-3)">Add this member to the trust</span>
          </button>
        ))}
        <button type="button" className={choice(decision?.type === 'create')} data-on={decision?.type === 'create'} onClick={() => onDecide(row.rowNumber, { type: 'create' })}>
          <span className="block font-medium">None of these</span>
          <span className="block text-xs text-(--c-text-3)">Create a new member</span>
        </button>
      </div>
    </div>
  );
}

/** The rows that need a person to decide. `items` are the review / ambiguous rows; `decisions` = { rowNumber: decision }. */
function Conflicts({ items, decisions, onDecide, onSameForAll }) {
  const open = items.filter((item) => !decisions[item.row.rowNumber]);
  const hasReview = items.some((item) => item.bucket === 'review');

  return (
    <section className={card} id="conflicts">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            Decide {items.length} {items.length === 1 ? 'row' : 'rows'}
            <Pill tone={open.length ? 'warn' : 'good'}>{open.length ? `${open.length} left` : 'All decided ✓'}</Pill>
          </h2>
          <p className="mt-1 text-sm text-(--c-text-3)">These mobile numbers already exist in the system. Tell us what each one is, so nobody is added twice.</p>
        </div>
        {hasReview && open.some((item) => item.bucket === 'review') && (
          <button type="button" className={ghostButton} onClick={onSameForAll}>
            Mark all name mismatches as the same person
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const decision = decisions[item.row.rowNumber];
          return (
            <div key={item.row.rowNumber} className={`mi-stage mi-rise rounded-xl border p-4 ${decision ? 'border-(--c-good) bg-(--c-good-bg)/30' : 'border-(--c-warn-text)/40 bg-(--c-warn-bg)/30'}`}>
              <p className="mb-2 text-xs text-(--c-muted)">Row {item.row.rowNumber}</p>
              {item.bucket === 'review' ? (
                <Review item={item} decision={decision} onDecide={onDecide} />
              ) : (
                <Ambiguous item={item} decision={decision} onDecide={onDecide} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default Conflicts;

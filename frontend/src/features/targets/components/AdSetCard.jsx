import { ALERT_OPTIONS } from '../hooks/useTargets';
import { money } from '../utils/targetMath';
import { PlatformTile } from './PlatformCard';
import TargetField from './TargetField';

const dash = '—';
const orDash = (value, format = (n) => n.toLocaleString('en-IN')) => (value === null || value === undefined ? dash : format(value));

/** One small read-only figure of the previous data. */
function Figure({ label, value, loading }) {
  return (
    <div className="rounded-xl bg-(--c-page) px-3 py-2.5">
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-(--c-muted)">{label}</p>
      {loading ? <div className="mt-1.5 h-5 w-14 animate-pulse rounded bg-(--c-track)" /> : <p className="mt-1 text-base font-bold tabular-nums text-(--c-text)">{value}</p>}
    </div>
  );
}

/**
 * The editable card of one ad set: its name and leads on top, the form (target, daily budget, alerts; the red line and the cost per
 * registration are worked out and read only), and the previous data for the chosen window. A dot and a coloured edge show that it was
 * changed and not saved yet; "Revert" puts the saved values back for this ad set only.
 */
function AdSetCard({ campaign, adSet, values, errors, edited, history, historyLoading, windowLabel, onChange, onRevert }) {
  const key = `${campaign.id}:${adSet.id}`;
  const hasTarget = Boolean(adSet.saved);
  const target = Number(values.target);
  const validTarget = values.target !== '' && target > 0;

  return (
    <section
      className={`group relative overflow-hidden rounded-2xl border bg-white p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_-14px_color-mix(in_srgb,var(--c-accent)_45%,transparent)] ${
        edited ? 'border-(--c-accent) shadow-[0_0_0_3px_color-mix(in_srgb,var(--c-accent)_18%,transparent)]' : 'border-gray-200 shadow-[0_1px_3px_rgba(20,33,61,0.06)]'
      }`}
    >
      <span className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-(--c-grad-from) via-(--c-grad-via) to-(--c-grad-to) transition-opacity ${edited ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`} aria-hidden="true" />

      <div className="flex items-start gap-3">
        <PlatformTile platform={campaign.platform} className="h-9 w-9 rounded-xl [&_svg]:h-5 [&_svg]:w-5" />
        <div className="min-w-0 flex-1">
          <p className="text-[0.66rem] font-bold uppercase tracking-[0.12em] text-(--c-muted)">{adSet.name === null ? 'Whole campaign' : 'Ad set'}</p>
          <h3 className="truncate text-base font-bold" title={adSet.name ?? campaign.name}>{adSet.name ?? campaign.name}</h3>
        </div>
        {edited ? (
          <button type="button" onClick={onRevert} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-(--c-warn-bg) px-2.5 py-1 text-[0.68rem] font-bold text-(--c-warn-text) hover:brightness-95">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />
            Edited · Revert
          </button>
        ) : (
          <span className={`rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${hasTarget ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-(--c-muted)'}`}>
            {hasTarget ? `Saved · ${money(adSet.saved.target)}` : 'Not set yet'}
          </span>
        )}
      </div>

      {adSet.name === null && <p className="mt-2 text-xs text-(--c-muted)">The leads carry no ad set, so this target covers the whole campaign.</p>}

      {/* the form: what can be changed, and what is worked out from it */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TargetField id={`target-${key}`} label="★ Target cost per app" prefix="₹" value={values.target} onChange={(value) => onChange('target', value)} error={errors.target} />
        <TargetField id={`red-${key}`} label="Red line (2× target)" value={validTarget ? money(target * 2) : dash} auto="auto" />
        <TargetField id={`budget-${key}`} label="Daily budget" prefix="₹" type="number" min="0" value={values.dailyBudget} onChange={(value) => onChange('dailyBudget', value)} error={errors.dailyBudget} />
        <TargetField
          id={`cpr-${key}`}
          label="Cost per registration"
          value={historyLoading ? '…' : orDash(history?.costPerRegistration, money)}
          auto="reference"
        />
        <TargetField id={`alerts-${key}`} label="Send alerts to" value={values.alerts} onChange={(value) => onChange('alerts', value)} options={ALERT_OPTIONS} />
      </div>

      {/* previous data for the window chosen above the cards */}
      <div className="mt-5 border-t border-dashed border-(--c-border) pt-4">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-(--c-muted)">Previous data · {windowLabel}</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Figure label="Previous target" value={adSet.saved?.previousTarget == null ? dash : money(adSet.saved.previousTarget)} />
          <Figure label="Spend" value={orDash(history?.spend, money)} loading={historyLoading} />
          <Figure label="Logins" value={orDash(history?.logins)} loading={historyLoading} />
          <Figure label="Cost per app" value={orDash(history?.costPerApp, money)} loading={historyLoading} />
        </div>
      </div>
    </section>
  );
}

export default AdSetCard;

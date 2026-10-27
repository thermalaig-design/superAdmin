import CountUp from '../../../components/CountUp';
import TiltCard from '../../../components/TiltCard';

/** One read-only number, shown as a card that leans toward the pointer and counts up when it appears. */
function KpiCard({ accent, label, value, format, hint }) {
  return (
    <TiltCard accent={accent} label={label}>
      <p className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-(--c-muted)">
        <span className="h-2 w-2 shrink-0 rounded-full bg-(--accent) shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_25%,transparent)]" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-2 text-[1.6rem] font-semibold leading-none tracking-tight tabular-nums text-(--c-text)">
        <CountUp value={value} format={format} />
      </p>
      <p className="mt-2 truncate text-[0.74rem] text-(--c-muted)" title={hint}>{hint}</p>
    </TiltCard>
  );
}

export default KpiCard;

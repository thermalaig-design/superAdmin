const STEPS = [
  ['upload', 'Upload file'],
  ['preview', 'Preview & decide'],
  ['done', 'Done'],
];

/** The three stages (drawn on the dark banner): the finished ones tick, the lines fill, the current one pulses. */
function Stepper({ step }) {
  const current = STEPS.findIndex(([id]) => id === step);
  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label="Progress">
      {STEPS.map(([id, label], index) => {
        const done = index < current || step === 'done';
        const active = index === current && step !== 'done';
        return (
          <li key={id} className="flex min-w-0 items-center gap-2 sm:gap-3" aria-current={active ? 'step' : undefined}>
            <span className="mi-step-dot" data-state={done ? 'done' : active ? 'active' : 'todo'}>
              {done ? '✓' : index + 1}
            </span>
            <span className={`truncate text-sm ${active ? 'font-semibold' : 'text-white/80'} ${active ? '' : 'max-sm:hidden'}`}>{label}</span>
            {index < STEPS.length - 1 && (
              <span className="mi-line" aria-hidden="true">
                <span style={{ '--fill': done ? 1 : 0 }} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default Stepper;

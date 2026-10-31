import { TONES } from '../utils/ui';

/** A small coloured label. `tone` = good | info | warn | bad | neutral. */
function Pill({ tone, children }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>
  );
}

export default Pill;

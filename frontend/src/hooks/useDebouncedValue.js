import { useEffect, useState } from 'react';

/** Returns `value` after it has stopped changing for `delay` ms (e.g. to avoid a request per keystroke). */
export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

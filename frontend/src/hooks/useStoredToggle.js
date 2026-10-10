import { useCallback, useEffect, useState } from 'react';

/**
 * An on/off state that is remembered in this browser (localStorage), so a section the user collapsed
 * stays collapsed next time. Storage can be unavailable (private windows etc.), in which case it just works unsaved.
 */
export function useStoredToggle(storageKey, initial = false) {
  const [on, setOn] = useState(() => {
    try {
      const saved = storageKey ? localStorage.getItem(storageKey) : null;
      return saved === null ? initial : saved === '1';
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, on ? '1' : '0');
    } catch {
      // not saved; the toggle still works for this visit
    }
  }, [storageKey, on]);

  const toggle = useCallback(() => setOn((value) => !value), []);
  return [on, toggle];
}

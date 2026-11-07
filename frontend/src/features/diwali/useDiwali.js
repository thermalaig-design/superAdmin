import { useSyncExternalStore } from 'react';

// Festival mode on/off, remembered in this browser. Every component that reads it updates together.
const KEY = 'diwali-on';
const listeners = new Set();

const read = () => {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
};

let current = read();

export function setDiwali(on) {
  current = on;
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // not saved; still works for this visit
  }
  listeners.forEach((fn) => fn());
}

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function useDiwali() {
  const on = useSyncExternalStore(subscribe, () => current, () => true);
  return [on, () => setDiwali(!current)];
}

/** Asks the fireworks layer for a rocket (the navbar button uses this). */
export const launchRocket = () => window.dispatchEvent(new Event('diwali:launch'));

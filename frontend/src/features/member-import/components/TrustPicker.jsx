import { useEffect, useMemo, useRef, useState } from 'react';

import { input } from '../utils/ui';

/** A trust chooser you can type into: filters the list as you type. `trusts` = [{ id, name }]. */
function TrustPicker({ trusts, value, onChange, loading }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const box = useRef(null);
  const selected = trusts.find((t) => t.id === value);

  useEffect(() => {
    const close = (event) => !box.current?.contains(event.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const matches = useMemo(() => {
    const query = text.trim().toLowerCase();
    return (query ? trusts.filter((t) => t.name.toLowerCase().includes(query)) : trusts).slice(0, 60);
  }, [trusts, text]);

  const pick = (trust) => {
    onChange(trust.id);
    setText('');
    setOpen(false);
  };

  return (
    <div ref={box} className="relative">
      <input
        className={input}
        value={open ? text : selected?.name ?? ''}
        placeholder={loading ? 'Loading trusts…' : 'Search and choose a trust'}
        disabled={loading}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
        }}
        aria-label="Trust"
        role="combobox"
        aria-expanded={open}
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-(--c-border) bg-(--c-surface) py-1 shadow-lg" role="listbox">
          {matches.length === 0 && <li className="px-3 py-2 text-sm text-(--c-muted)">No trust found</li>}
          {matches.map((trust) => (
            <li key={trust.id} role="option" aria-selected={trust.id === value}>
              <button
                type="button"
                onClick={() => pick(trust)}
                className={`block w-full cursor-pointer truncate px-3 py-2 text-left text-sm hover:bg-(--c-accent-soft) ${
                  trust.id === value ? 'font-semibold text-(--c-link)' : ''
                }`}
              >
                {trust.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TrustPicker;

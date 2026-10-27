/**
 * A labelled box. `auto` makes it read only (greyed, with a small tag saying where the value comes from);
 * `readOnly` shows a value that cannot be changed here (greyed, no tag).
 * `error` turns the border red and shows a short message under it.
 */
function TargetField({ id, label, value, onChange, prefix, suffix, error, auto, readOnly = false, inputRef, type = 'text', min, max, options, hint }) {
  const box = `flex h-11 items-center gap-1 rounded-xl border bg-white px-3 text-sm transition focus-within:ring-2 ${
    error
      ? 'border-red-600 focus-within:ring-red-600/20'
      : auto || readOnly
        ? 'border-gray-200 bg-gray-50 text-(--c-muted)'
        : 'border-gray-300 focus-within:border-(--c-accent) focus-within:ring-(--c-accent)/20'
  }`;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center justify-between gap-2 text-xs font-semibold text-(--c-text-3)">
        <span>{label}</span>
        {auto && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-(--c-muted)">{auto}</span>}
      </label>
      {options ? (
        <select
          id={id}
          value={value}
          disabled={readOnly}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 cursor-pointer rounded-xl border border-gray-300 bg-white px-3 disabled:cursor-default disabled:border-gray-200 disabled:bg-gray-50 disabled:text-(--c-muted) text-sm outline-none focus:border-(--c-accent) focus:ring-2 focus:ring-(--c-accent)/20"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <div className={box}>
          {prefix && <span className="text-(--c-muted)">{prefix}</span>}
          <input
            id={id}
            ref={inputRef}
            type={type}
            min={min}
            max={max}
            inputMode="decimal"
            value={value}
            readOnly={Boolean(auto) || readOnly}
            tabIndex={auto || readOnly ? -1 : undefined}
            onChange={(event) => onChange?.(event.target.value)}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className="min-w-0 flex-1 bg-transparent font-semibold tabular-nums outline-none"
          />
          {suffix && <span className="text-(--c-muted)">{suffix}</span>}
        </div>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-(--c-bad-text)">
          {error}
        </p>
      )}
      {!error && hint}
    </div>
  );
}

export default TargetField;

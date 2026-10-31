import { useRef, useState } from 'react';

import CountUp from '../../../components/CountUp';
import TiltCard from '../../../components/TiltCard';
import { downloadTemplate, REQUIRED_COLUMNS } from '../utils/rows';
import { card, ghostButton, primaryButton } from '../utils/ui';
import FileStack from './FileStack';
import FixRows from './FixRows';
import TrustPicker from './TrustPicker';

// A summary tile that leans toward the pointer in 3D (the app's own TiltCard) with a number that counts up.
const Tile = ({ label, value, accent }) => (
  <TiltCard accent={accent} label={label}>
    <p className="text-xs text-(--c-muted)">{label}</p>
    <p className="text-3xl font-bold tabular-nums">
      <CountUp value={value} />
    </p>
  </TiltCard>
);

const Heading = ({ number, title, children }) => (
  <div className="flex items-start gap-3">
    <span className="mi-badge">{number}</span>
    <div>
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </div>
  </div>
);

/**
 * Step 1: pick the trust, add the file, fix any bad rows. `rows` are all rows of the file (checked);
 * `fixRows` are the ones that were in trouble (kept on screen until the user continues).
 */
function UploadStep({
  trusts, trustsLoading, trustId, onTrust,
  file, reading, fileError, onFile, onClearFile,
  rows, fixRows, removed, onEditRow, onDeleteRow, onDeleteBroken,
  onContinue, busy,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const ready = rows.filter((row) => row.problems.length === 0).length;
  const broken = rows.length - ready;
  const hint = !trustId
    ? 'Choose a trust first'
    : !file
      ? 'Add your member file'
      : broken > 0
        ? `Fix or remove the ${broken} rows with problems`
        : ready === 0
          ? 'The file has no rows to import'
          : '';

  const choose = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  };

  return (
    <div className="space-y-5">
      <section className={`${card} relative z-10`} style={{ '--d': '60ms' }}>
        <Heading number="1" title="Choose the trust">
          <p className="mt-0.5 text-sm text-(--c-text-3)">The members in your file will be added to this trust.</p>
        </Heading>
        <div className="mt-4 max-w-md">
          <TrustPicker trusts={trusts} value={trustId} onChange={onTrust} loading={trustsLoading} />
        </div>
      </section>

      <section className={card} style={{ '--d': '160ms' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <Heading number="2" title="Upload your member file">
            <p className="mt-0.5 text-sm text-(--c-text-3)">Excel (.xlsx) or CSV, up to 5 MB.</p>
          </Heading>
          <button type="button" className={ghostButton} onClick={downloadTemplate}>
            ⬇ Download sample file
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-(--c-text-3)">Your file must have these columns:</span>
          {REQUIRED_COLUMNS.map((column) => (
            <span key={column} className="rounded-full bg-(--c-accent-soft) px-2.5 py-0.5 text-xs font-medium text-(--c-link)">
              {column}
            </span>
          ))}
        </div>

        <input ref={inputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={(event) => onFile(event.target.files?.[0])} />
        <div
          role="button"
          tabIndex={0}
          onClick={choose}
          onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && choose()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            onFile(event.dataTransfer.files?.[0]);
          }}
          data-drag={dragging}
          className={`mi-drop mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center ${
            dragging || file ? 'border-(--c-accent) bg-(--c-accent-soft)' : 'border-(--c-border-strong) bg-(--c-subtle) hover:border-(--c-accent)'
          }`}
        >
          <FileStack size={dragging ? 150 : 120} active={dragging} />
          {reading ? (
            <div className="mt-2 flex flex-col items-center gap-3">
              <p className="font-semibold">Reading your file…</p>
              <div className="mi-bar" />
            </div>
          ) : file ? (
            <div className="mi-pop mt-2">
              <p className="break-all font-semibold">
                <span className="mr-1.5 text-(--c-good)">✓</span>
                {file.name}
              </p>
              <p className="mt-1 text-sm text-(--c-muted)">{(file.size / 1024).toFixed(0)} KB · click or drop another file to replace it</p>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-lg font-semibold">{dragging ? 'Release to upload' : 'Drop your file here, or click to browse'}</p>
              <p className="mt-1 text-sm text-(--c-muted)">.xlsx or .csv</p>
            </div>
          )}
        </div>
        {file && !reading && (
          <button type="button" className="mt-2 cursor-pointer text-sm text-(--c-muted) hover:underline" onClick={onClearFile}>
            Remove file
          </button>
        )}
        {fileError && (
          <p className="mi-pop mt-3 rounded-xl border border-(--c-bad-border) bg-(--c-bad-bg) px-4 py-3 text-sm text-(--c-bad-text)" role="alert">
            {fileError}
          </p>
        )}

        {file && !reading && rows.length > 0 && (
          <div className="mi-stage mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Rows in file" value={rows.length + removed} accent="var(--c-c4)" />
            <Tile label="Ready" value={ready} accent="var(--c-good)" />
            <Tile label="Need fixing" value={broken} accent="var(--c-c3)" />
            <Tile label="Removed" value={removed} accent="var(--c-c5)" />
          </div>
        )}
      </section>

      {fixRows.length > 0 && <FixRows rows={fixRows} onEdit={onEditRow} onDelete={onDeleteRow} onDeleteAll={onDeleteBroken} />}

      <div className="flex flex-col items-end gap-2">
        {hint && <p className="text-sm text-(--c-muted)">{hint}</p>}
        <button type="button" className={primaryButton} disabled={Boolean(hint) || busy || reading} onClick={onContinue}>
          {busy ? 'Checking members…' : 'Check members & continue →'}
        </button>
      </div>
    </div>
  );
}

export default UploadStep;

import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import BackLink from '../../../components/BackLink';
import DoneStep from '../components/DoneStep';
import PreviewStep from '../components/PreviewStep';
import Stepper from '../components/Stepper';
import FileStack from '../components/FileStack';
import UploadStep from '../components/UploadStep';
import { useImportTrusts } from '../hooks/useImportTrusts';
import { analyzeMembers, importMembers } from '../services/memberImportService';
import { checked, forServer, MAX_FILE_BYTES, nameKey, readMemberFile } from '../utils/rows';

/** Bulk import of members into a trust: upload the file, check what will happen, decide conflicts, import. */
function MemberImportPage() {
  const queryClient = useQueryClient();
  const { data: trusts, loading: trustsLoading, error: trustsError } = useImportTrusts();

  const [step, setStep] = useState('upload');
  const [trustId, setTrustId] = useState('');
  const [file, setFile] = useState(null);
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [rows, setRows] = useState([]); // every row of the file that was not removed, each already checked
  const [fixIds, setFixIds] = useState([]); // rows that were in trouble: they stay in the fix list until the user moves on
  const [removed, setRemoved] = useState(0);

  const [items, setItems] = useState([]); // rows + what the import will do with them
  const [decisions, setDecisions] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const trustName = trusts?.find((t) => t.id === trustId)?.name ?? '';
  const fixRows = useMemo(() => rows.filter((row) => fixIds.includes(row.rowNumber)), [rows, fixIds]);

  const resetFile = () => {
    setFile(null);
    setRows([]);
    setFixIds([]);
    setRemoved(0);
    setFileError('');
  };

  const chooseFile = async (chosen) => {
    if (!chosen) return;
    if (!/\.(csv|xlsx)$/i.test(chosen.name)) return setFileError('Only .csv or .xlsx files can be imported.');
    if (chosen.size > MAX_FILE_BYTES) return setFileError('This file is bigger than 5 MB. Split it into smaller files.');

    resetFile();
    setReading(true);
    try {
      const parsed = await readMemberFile(chosen);
      if (parsed.length === 0) return setFileError('No rows were found in this file. Check that the first row has the column names.');
      setFile(chosen);
      setRows(parsed);
      setFixIds(parsed.filter((row) => row.problems.length > 0).map((row) => row.rowNumber));
    } catch {
      setFileError('This file could not be read. Make sure it is a valid Excel or CSV file.');
    } finally {
      setReading(false);
    }
  };

  const editRow = (rowNumber, patch) =>
    setRows((current) => current.map((row) => (row.rowNumber === rowNumber ? checked({ ...row, ...patch }) : row)));
  const deleteRows = (numbers) => {
    setRows((current) => current.filter((row) => !numbers.includes(row.rowNumber)));
    setFixIds((current) => current.filter((n) => !numbers.includes(n)));
    setRemoved((count) => count + numbers.length);
  };

  const checkMembers = async () => {
    setBusy(true);
    setError('');
    try {
      // The same name + mobile twice in the file is one person: the first one is kept.
      const seen = new Set();
      const unique = [];
      const repeats = [];
      rows.forEach((row) => {
        const key = nameKey(row);
        if (seen.has(key)) repeats.push(row);
        else {
          seen.add(key);
          unique.push(row);
        }
      });

      const verdicts = await analyzeMembers(trustId, unique.map(forServer));
      const byRow = new Map(verdicts.map((v) => [v.rowNumber, v]));
      const all = [
        ...unique.map((row) => ({ row, ...byRow.get(row.rowNumber) })),
        ...repeats.map((row) => ({ row, bucket: 'duplicate' })),
      ].sort((a, b) => a.row.rowNumber - b.row.rowNumber);

      setItems(all);
      setDecisions({});
      setStep('preview');
    } catch (err) {
      setFileError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const decide = (rowNumber, decision) => setDecisions((current) => ({ ...current, [rowNumber]: decision }));
  const sameForAll = () =>
    setDecisions((current) => {
      const next = { ...current };
      items.filter((i) => i.bucket === 'review' && !next[i.row.rowNumber]).forEach((i) => (next[i.row.rowNumber] = { type: 'link' }));
      return next;
    });

  const runImport = async () => {
    setBusy(true);
    setError('');
    try {
      const sendable = items.filter((i) => i.bucket !== 'duplicate').map((i) => forServer(i.row));
      setResult(await importMembers(trustId, sendable, decisions));
      setStep('done');
      queryClient.invalidateQueries(); // member and trust numbers elsewhere in the app are now out of date
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const startOver = () => {
    resetFile();
    setItems([]);
    setDecisions({});
    setResult(null);
    setError('');
    setStep('upload');
  };

  return (
    <div
      className="relative mx-auto max-w-5xl"
      onPointerMove={(event) => {
        const cardEl = event.target.closest?.('.mi-card');
        if (!cardEl) return;
        const box = cardEl.getBoundingClientRect();
        cardEl.style.setProperty('--mx', `${event.clientX - box.left}px`);
        cardEl.style.setProperty('--my', `${event.clientY - box.top}px`);
      }}
    >
      <div className="mi-ambient" aria-hidden="true">
        <span style={{ width: 360, height: 360, left: '-8%', top: '18%', background: 'var(--c-grad-from)' }} />
        <span style={{ width: 320, height: 320, right: '-6%', top: '46%', background: 'var(--c-c2)', animationDelay: '-6s' }} />
        <span style={{ width: 260, height: 260, left: '30%', bottom: '-4%', background: 'var(--c-c3)', animationDelay: '-11s', opacity: 0.25 }} />
      </div>
      <BackLink to="/organization-insights" label="Back to Organization Insights" />
      <header className="mi-hero mi-rise mt-3 mb-6 px-6 py-7 sm:px-9 sm:py-9">
        <span className="mi-orb" style={{ width: 130, height: 130, right: '7%', top: -34 }} aria-hidden="true" />
        <span className="mi-orb" style={{ width: 72, height: 72, right: '30%', bottom: -22, animationDelay: '1.2s' }} aria-hidden="true" />
        <span className="mi-orb" style={{ width: 38, height: 38, left: '52%', top: 16, animationDelay: '2.4s' }} aria-hidden="true" />
        <div className="relative flex items-center justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Import members</h1>
            <p className="mt-2 max-w-md text-white/85">Add many members to a trust at once from an Excel or CSV file.</p>
            <div className="mt-6">
              <Stepper step={step} />
            </div>
          </div>
          <div className="hidden shrink-0 md:block">
            <FileStack size={150} />
          </div>
        </div>
      </header>

      {trustsError && (
        <p className="mb-4 rounded-xl border border-(--c-bad-border) bg-(--c-bad-bg) px-4 py-3 text-sm text-(--c-bad-text)" role="alert">
          {trustsError}
        </p>
      )}

      <div className="mi-stage">
      {step === 'upload' && (
        <UploadStep
          trusts={trusts ?? []}
          trustsLoading={trustsLoading}
          trustId={trustId}
          onTrust={setTrustId}
          file={file}
          reading={reading}
          fileError={fileError}
          onFile={chooseFile}
          onClearFile={resetFile}
          rows={rows}
          fixRows={fixRows}
          removed={removed}
          onEditRow={editRow}
          onDeleteRow={(n) => deleteRows([n])}
          onDeleteBroken={() => deleteRows(rows.filter((r) => r.problems.length > 0).map((r) => r.rowNumber))}
          onContinue={checkMembers}
          busy={busy}
        />
      )}

      {step === 'preview' && (
        <PreviewStep
          trustName={trustName}
          fileName={file?.name}
          items={items}
          decisions={decisions}
          onDecide={decide}
          onSameForAll={sameForAll}
          onBack={() => setStep('upload')}
          onImport={runImport}
          busy={busy}
          error={error}
        />
      )}

      {step === 'done' && result && (
        <DoneStep result={result} trustName={trustName} onRetry={runImport} onAnother={startOver} busy={busy} error={error} />
      )}
      </div>
    </div>
  );
}

export default MemberImportPage;

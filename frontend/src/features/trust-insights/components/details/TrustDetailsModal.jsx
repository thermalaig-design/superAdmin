import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useApiQuery } from '../../../../hooks/useApiQuery';
import { deleteTrustDetails, fetchTrustDetails, saveTrustDetails } from '../../services/trustInsightsService';
import { DETAIL_FORMS } from '../../utils/detailForms';

const input = 'h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none focus:border-(--c-link)';
const button = 'h-10 cursor-pointer rounded-xl px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50';

const filled = (value) => value !== null && value !== undefined && value !== '';

/**
 * Popup to view, add, edit and delete one trust's bank or company details.
 * `kind` = 'bank' | 'company'; `trust` = { id, name }; `onClose` closes it.
 */
function TrustDetailsModal({ kind, trust, onClose }) {
  const form = DETAIL_FORMS[kind];
  const queryClient = useQueryClient();
  const key = ['trust-details', kind, trust.id];
  const { data, loading, error } = useApiQuery(key, () => fetchTrustDetails(kind, trust.id), { staleTime: 0 });

  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hasValues = form.fields.some((f) => filled(data?.[f.key]));

  const startEdit = () => {
    setValues(Object.fromEntries(form.fields.map((f) => [f.key, data?.[f.key] ?? ''])));
    setMessage('');
    setEditing(true);
  };

  const run = async (work, after) => {
    setBusy(true);
    setMessage('');
    try {
      const next = await work();
      queryClient.setQueryData(key, next ?? null);
      after?.();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  const save = (event) => {
    event.preventDefault();
    run(() => saveTrustDetails(kind, trust.id, values), () => setEditing(false));
  };
  const remove = () => {
    if (window.confirm(form.deleteText)) run(() => deleteTrustDetails(kind, trust.id));
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label={form.title} className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{form.title}</h2>
            <p className="truncate text-sm text-(--c-text-3)">{trust.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer text-2xl leading-none text-(--c-muted) hover:text-(--c-text-2)">
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {(error || message) && (
            <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {message || error}
            </p>
          )}

          {loading && <div className="h-40 animate-pulse rounded-xl bg-gray-100" />}

          {!loading && editing && (
            <form id="trust-details-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              {form.fields.map((f) => (
                <label key={f.key} className={`block text-sm ${f.wide ? 'sm:col-span-2' : ''}`}>
                  <span className="mb-1 block font-medium text-(--c-text-2)">
                    {f.label}
                    {f.required && <span className="text-red-600"> *</span>}
                  </span>
                  <input
                    className={input}
                    required={f.required}
                    type={f.type ?? 'text'}
                    value={values[f.key]}
                    onChange={(event) => setValues((current) => ({ ...current, [f.key]: event.target.value }))}
                  />
                </label>
              ))}
            </form>
          )}

          {!loading && !editing && hasValues && (
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {form.fields.map((f) => (
                <div key={f.key} className={f.wide ? 'sm:col-span-2' : ''}>
                  <dt className="text-xs text-(--c-muted)">{f.label}</dt>
                  <dd className="mt-0.5 break-words text-sm font-medium">
                    {!filled(data?.[f.key]) ? (
                      <span className="text-(--c-faint)">—</span>
                    ) : f.image ? (
                      <a href={data[f.key]} target="_blank" rel="noopener noreferrer">
                        <img src={data[f.key]} alt="QR" className="mt-1 h-32 w-32 rounded-lg border border-gray-200 object-contain" />
                      </a>
                    ) : (
                      data[f.key]
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {!loading && !editing && !hasValues && <p className="py-8 text-center text-(--c-text-3)">{form.emptyText}</p>}
        </div>

        {!loading && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 px-5 py-3">
            {editing ? (
              <>
                <button key="cancel" type="button" onClick={() => setEditing(false)} disabled={busy} className={`${button} border border-gray-300 text-(--c-text-2) hover:bg-gray-50`}>
                  Cancel
                </button>
                <button key="save" type="submit" form="trust-details-form" disabled={busy} className={`${button} bg-(--c-link) text-white hover:opacity-90`}>
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </>
            ) : (
              <>
                {hasValues && (
                  <button key="delete" type="button" onClick={remove} disabled={busy} className={`${button} border border-red-200 text-red-600 hover:bg-red-50`}>
                    Delete
                  </button>
                )}
                <button key="edit" type="button" onClick={startEdit} disabled={busy} className={`${button} bg-(--c-link) text-white hover:opacity-90`}>
                  {hasValues ? 'Edit' : 'Add details'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default TrustDetailsModal;

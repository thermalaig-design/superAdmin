import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import ScrollTable from '../../../components/ScrollTable';
import { HeadCell } from '../../../components/SortableTh';
import { useApiQuery } from '../../../hooks/useApiQuery';
import { createAppTemplate, deleteAppTemplate, fetchAppTemplates, fetchTrustOptions, updateAppTemplate } from '../services/appTemplatesService';

const FIELD = 'mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--c-accent)';
const EMPTY = { name: '', trustId: '', purpose: '' };
const ICON = { className: 'h-4.5 w-4.5', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24', 'aria-hidden': true };
const ICON_BUTTON = 'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition disabled:cursor-wait disabled:opacity-50';

/** App templates: a button opens the form (name, trust, purpose); saved templates are listed below, each with edit and delete. */
function AppTemplatesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null: the form adds a new template
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [listError, setListError] = useState('');

  const { data: trusts, error: trustError } = useApiQuery(['app-template-trusts'], fetchTrustOptions, { staleTime: 5 * 60 * 1000, enabled: open });
  const { data: templates, loading, error } = useApiQuery(['app-templates'], fetchAppTemplates);

  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({ name: item.name ?? '', trustId: item.trust_id ?? '', purpose: item.purpose ?? '' });
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY);
    setFormError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editingId) await updateAppTemplate(editingId, form);
      else await createAppTemplate(form);
      await queryClient.invalidateQueries({ queryKey: ['app-templates'] });
      close();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    setDeletingId(item.id);
    setListError('');
    try {
      await deleteAppTemplate(item.id);
      await queryClient.invalidateQueries({ queryKey: ['app-templates'] });
    } catch (err) {
      setListError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-gradient-to-r from-(--c-grad-from) via-(--c-grad-via) to-(--c-grad-to) px-6 py-6 text-white md:px-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">App Template</h1>
          <p className="mt-1 text-sm text-white/85">Create a template by choosing its name, trust and purpose.</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="cursor-pointer rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-(--c-link) shadow transition hover:bg-white/90"
        >
          + Add Template
        </button>
      </header>

      {(error || listError) && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error || listError}
        </p>
      )}

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]">
        <h2 className="text-lg font-bold">Saved templates</h2>
        <ScrollTable className="mt-4">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr>
                <HeadCell>Display Name</HeadCell>
                <HeadCell>Trust Name</HeadCell>
                <HeadCell>Purpose</HeadCell>
                <HeadCell>Actions</HeadCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-(--c-text-2)">Loading…</td>
                </tr>
              )}
              {!loading && !templates?.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-(--c-text-2)">No templates yet.</td>
                </tr>
              )}
              {templates?.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-semibold">{item.name}</td>
                  <td className="px-4 py-3">{item.trust_name}</td>
                  <td className="px-4 py-3">{item.purpose}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => openEdit(item)} title="Edit" aria-label={`Edit ${item.name}`} className={`${ICON_BUTTON} text-(--c-link) hover:bg-(--c-accent-soft)`}>
                        <svg {...ICON}>
                          <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
                          <path d="m13.5 6.5 4 4" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        disabled={deletingId === item.id}
                        title="Delete"
                        aria-label={`Delete ${item.name}`}
                        className={`${ICON_BUTTON} text-red-600 hover:bg-red-50`}
                      >
                        <svg {...ICON}>
                          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollTable>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-label={editingId ? 'Edit template' : 'Add template'}>
            <h2 className="text-lg font-bold">{editingId ? 'Edit Template' : 'Add Template'}</h2>

            <label className="mt-4 block text-sm font-semibold">
              Display Name <span className="text-red-600">*</span>
              <input className={FIELD} value={form.name} onChange={set('name')} required autoFocus />
            </label>

            <label className="mt-4 block text-sm font-semibold">
              Trust Name <span className="text-red-600">*</span>
              <select className={FIELD} value={form.trustId} onChange={set('trustId')} required disabled={!trusts}>
                <option value="">{trusts ? 'Select a trust name' : 'Loading…'}</option>
                {trusts?.map((trust) => (
                  <option key={trust.id} value={trust.id}>
                    {trust.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-sm font-semibold">
              Purpose
              <textarea className={FIELD} rows={3} value={form.purpose} onChange={set('purpose')} />
            </label>

            {(formError || trustError) && (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {formError || trustError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={close} className="cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold text-(--c-text-2) hover:bg-gray-100">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="cursor-pointer rounded-full bg-(--c-accent) px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
              >
                {saving ? 'Saving…' : editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default AppTemplatesPage;

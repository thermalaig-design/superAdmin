import { apiGet, apiPost } from '../../../lib/apiClient';

/** GET /member-import/trusts -> [{ id, name }] */
export const fetchImportTrusts = () => apiGet('/member-import/trusts');

/**
 * POST /member-import/analyze
 * What an import of these rows would do. Returns, per row:
 * { rowNumber, bucket: 'new' | 'link' | 'review' | 'ambiguous', inTrust?: boolean (link: already in this trust), existing?: { membersId, name }, matches?: [{ membersId, name }] }
 */
export const analyzeMembers = (trustId, rows) => apiPost('/member-import/analyze', { trustId, rows });

/**
 * POST /member-import/import
 * decisions = { [rowNumber]: { type: 'link' | 'update_name' | 'create', membersId? } } for 'review' and 'ambiguous' rows.
 * Returns { created, added, updated, failedLinks: [{ rowNumber, name, mobile, reason }] }.
 * Safe to send again after a failure: people created the first time are matched, not created twice.
 */
export const importMembers = (trustId, rows, decisions) => apiPost('/member-import/import', { trustId, rows, decisions });

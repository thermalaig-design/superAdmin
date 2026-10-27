import { apiDelete, apiGet, apiPost, apiPut } from '../../../lib/apiClient';

/** GET /app-templates/trusts -> [{ id, name }] for the Trust dropdown. */
export const fetchTrustOptions = () => apiGet('/app-templates/trusts');

/** GET /app-templates -> [{ id, name, trust_id, trust_name, purpose }] */
export const fetchAppTemplates = () => apiGet('/app-templates');

/** POST /app-templates { name, trustId, purpose } -> the saved row */
export const createAppTemplate = (template) => apiPost('/app-templates', template);

/** PUT /app-templates/:id { name, trustId, purpose } -> the updated row */
export const updateAppTemplate = (id, template) => apiPut(`/app-templates/${id}`, template);

/** DELETE /app-templates/:id */
export const deleteAppTemplate = (id) => apiDelete(`/app-templates/${id}`);

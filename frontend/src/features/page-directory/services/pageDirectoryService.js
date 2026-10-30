import { apiGet, apiPatch } from '../../../lib/apiClient';

/** GET /page-routes -> [{ id, route, platform, module, name, help_link }] */
export const fetchPageRoutes = () => apiGet('/page-routes');

/** PATCH /page-routes/:id { module?, name?, helpLink? } -> the updated row. An empty helpLink removes the link. */
export const updatePageRoute = (id, changes) => apiPatch(`/page-routes/${id}`, changes);

import { useApiQuery } from '../../../hooks/useApiQuery';
import { fetchAppProducts } from '../services/dashboardService';

/** The products of one app, asked for only once its Products number is opened; each app is cached. */
export function useAppProducts(trustId) {
  return useApiQuery(['dashboard-app-products', trustId ?? ''], () => fetchAppProducts({ trustId }), { enabled: Boolean(trustId) });
}

import { useApiQuery } from '../../../hooks/useApiQuery';
import { fetchCardDetails } from '../services/dashboardService';

/** The rows behind the picked Platform Overview card for the picked source. Only asked for once a card is picked; each choice is cached. */
export function useCardDetails({ range, from, to }, card, source) {
  return useApiQuery(['dashboard-card-details', card, source ?? '', range, from ?? '', to ?? ''], () => fetchCardDetails({ range, from, to, card, source: source ?? '' }), {
    enabled: Boolean(card),
  });
}

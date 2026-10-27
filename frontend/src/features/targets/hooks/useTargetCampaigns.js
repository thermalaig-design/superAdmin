import { useApiQuery } from '../../../hooks/useApiQuery';
import { fetchTargetCampaigns, fetchTargetHistory } from '../services/targetsService';

/** The running campaigns, their ad sets (from the leads) and the targets saved for them. Shared by the Set Targets page and the top bar menu. */
export function useTargetCampaigns() {
  return useApiQuery(['target-campaigns'], fetchTargetCampaigns, { staleTime: 30 * 1000 });
}

/** What every ad set cost and brought in over 'today' | '14d' | '30d'. The last window stays on screen while the next one loads. */
export function useTargetHistory(window) {
  return useApiQuery(['target-history', window], () => fetchTargetHistory(window), { keepPrevious: true, staleTime: 5 * 60 * 1000 });
}

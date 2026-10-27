import { useTargetCampaigns } from './useTargetCampaigns';
import { CAMPAIGNS } from '../utils/sampleData';

/**
 * Where "Edit target" on a scorecard row goes: the form of one running campaign on Set Targets.
 * The scorecard still shows sample campaigns, so a row stands for the real campaign of the same platform in the same place
 * (the 1st Google row is the Google campaign that spent most, the 2nd Google row the next one, ...). With no match it opens
 * Set Targets on that platform.
 */
export function useEditPath() {
  const { data: running } = useTargetCampaigns();
  return (row) => {
    const index = CAMPAIGNS.filter((campaign) => campaign.platform === row.platform).findIndex((campaign) => campaign.id === row.id);
    const real = (running ?? []).filter((campaign) => campaign.platform === row.platform)[index];
    return real ? `/targets/set-target/${real.id}` : '/targets/set-target';
  };
}

import { useApiQuery } from '../../../hooks/useApiQuery';
import { fetchRegistrationCampaigns, fetchRegistrations, fetchRegistrationSummary, fetchRegistrationTimeline } from '../services/registrationsService';

/** One page of the people who registered in the period. The previous page stays on screen while the next one loads. */
export function useRegistrations({ range, from, to }, { search, page, pageSize }, target = {}) {
  const { campaign, source, platform, adSet, stage } = target;
  return useApiQuery(['registrations', range, from ?? '', to ?? '', search, page, pageSize, campaign ?? '', source ?? '', platform ?? '', adSet ?? '', stage ?? ''], () => fetchRegistrations({ range, from, to, search, page, pageSize, campaign, source, platform, adSet, stage }), {
    keepPrevious: true,
  });
}

/** The cards above the list: registrations, leads, logged in, apps created. */
export function useRegistrationSummary({ range, from, to }, { enabled = true } = {}) {
  return useApiQuery(['registration-summary', range, from ?? '', to ?? ''], () => fetchRegistrationSummary({ range, from, to }), { keepPrevious: true, enabled });
}

/** Everything one registered member did. */
export function useRegistrationTimeline(memberId) {
  return useApiQuery(['registration-timeline', memberId], () => fetchRegistrationTimeline(memberId));
}

/** The campaigns that brought leads in the period (from one source, or all), for the Campaign filter. */
export function useRegistrationCampaigns({ range, from, to }, source) {
  return useApiQuery(['registration-campaigns', range, from ?? '', to ?? '', source ?? ''], () => fetchRegistrationCampaigns({ range, from, to, source }), { staleTime: 60 * 1000 });
}

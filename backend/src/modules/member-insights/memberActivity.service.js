import { buildFilterOptions, buildReport, fetchPeriodActivity, parseTarget } from '../trust-insights/trustActivity.service.js';
import { getMemberTrusts } from './memberInsights.service.js';

export const ALL_TRUSTS = 'all';

/**
 * One member's page activity, for one of their trusts or for all of them (`trust` = trust id | 'all').
 * Returns null when there is no such member, and { invalidTrust: true } when the member is not in that trust.
 */
export async function getMemberActivity(memberId, range, { trust = ALL_TRUSTS, target }) {
    const registrations = await getMemberTrusts(memberId);
    if (!registrations) return null;

    const trusts = registrations.trusts
        .filter((t) => t.trustId)
        .map((t) => ({ id: t.trustId, name: t.name, isActive: t.isActive }));
    if (trust !== ALL_TRUSTS && !trusts.some((t) => t.id === trust)) return { invalidTrust: true };

    const match = trust === ALL_TRUSTS ? { members_id: memberId } : { members_id: memberId, trust_id: trust };
    const periodRows = await fetchPeriodActivity(match, range.start, range.end);

    const { module, pageId } = parseTarget(target);
    const rows = periodRows.filter(
        (row) => (!module || row.page?.module === module) && (!pageId || row.page_id === pageId)
    );

    const trustNames = new Map(trusts.map((t) => [t.id, t.name]));
    const report = buildReport(rows, range);

    return {
        member: registrations.member,
        trusts,
        period: { from: range.firstDay, to: range.lastDay },
        filters: buildFilterOptions(periodRows),
        ...report,
        recent: report.recent.map((row) => ({ ...row, trustName: trustNames.get(row.trustId) ?? 'Unknown trust' })),
    };
}

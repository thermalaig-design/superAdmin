import { money } from '../utils/targetMath';
import KpiCard from './KpiCard';
import { PlatformTile } from './PlatformCard';

const STATUS_STYLE = {
  ENABLED: 'bg-green-50 text-green-700',
  ACTIVE: 'bg-green-50 text-green-700',
  PAUSED: 'bg-amber-50 text-amber-700',
};

/**
 * One running campaign, read only: who it is (platform, name, status) and five number cards. Spend and leads are for the chosen window;
 * the target, red line and budget are the totals of its ad sets below, so they move as the boxes there are typed in.
 */
function CampaignTargetCard({ campaign, totals, stats, windowLabel, highlighted }) {
  const count = campaign.adSets.length;
  const adSets = `Total of ${count} ${count === 1 ? 'ad set' : 'ad sets'}`;

  return (
    <section
      id={`campaign-${campaign.id}`}
      className={`scroll-mt-24 rounded-3xl border bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)] sm:p-6 ${
        highlighted ? 'border-2 border-(--c-accent) shadow-[0_8px_24px_color-mix(in_srgb,var(--c-accent)_25%,transparent)]' : 'border-gray-200'
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <PlatformTile platform={campaign.platform} className="h-11 w-11 rounded-2xl shadow-[0_6px_16px_rgba(20,33,61,0.2)]" />
        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-(--c-muted)">{campaign.platform} campaign</p>
          <h2 className="truncate text-lg font-bold" title={campaign.name}>{campaign.name}</h2>
        </div>
        {campaign.status && <span className={`rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wide ${STATUS_STYLE[campaign.status] ?? 'bg-gray-100 text-(--c-muted)'}`}>{campaign.status}</span>}
      </div>

      <div className="stagger mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard accent="var(--c-c2)" label="Spend" value={stats.spend} format={money} hint={windowLabel} />
        <KpiCard accent="var(--c-c3)" label="Leads" value={stats.leads} hint={windowLabel} />
        <KpiCard accent="var(--c-c1)" label="Target / app" value={totals.target || null} format={money} hint={adSets} />
        <KpiCard accent="var(--c-bad-text)" label="Red line (2×)" value={totals.target ? totals.target * 2 : null} format={money} hint="Double the target" />
        <KpiCard accent="var(--c-c4)" label="Daily budget" value={totals.dailyBudget} format={money} hint={adSets} />
      </div>
    </section>
  );
}

export default CampaignTargetCard;

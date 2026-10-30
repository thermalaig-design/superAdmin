import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { CampaignIcon, InsightsIcon, MembersIcon, TargetIcon } from '../../../components/sidebar/icons';
import { useTargetCampaigns } from '../hooks/useTargetCampaigns';
import { useTargetsView } from '../hooks/useTargetsView';
import { STATUS } from '../utils/targetMath';
import NavDropdown from './NavDropdown';
import { PlatformTile } from './PlatformCard';

const item = (active) =>
  `flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${active ? 'bg-(--c-accent-soft) font-semibold text-(--c-link)' : 'text-(--c-text-3) hover:bg-(--c-accent-soft)'}`;

const linkTrigger =
  'flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-(--c-text-2) transition hover:bg-(--c-accent-soft) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-accent)';

const heading = 'px-3 pb-1 pt-2 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-(--c-muted)';

/** Platform filter + colour filter: both open the page at the "Platform vs Target" section. */
function PlatformLinks({ onPick }) {
  const [view, setView] = useTargetsView();
  const pick = (patch) => {
    setView(patch);
    onPick();
  };
  return (
    <>
      <p className={heading}>Platform</p>
      {[null, 'Meta', 'Google'].map((platform) => (
        <Link key={platform ?? 'all'} to="/targets#platform-vs-target" onClick={() => pick({ platform })} className={item(view.platform === platform)}>
          {platform ? <PlatformTile platform={platform} className="h-5 w-5 rounded-md [&_svg]:h-3.5 [&_svg]:w-3.5" /> : <span className="h-5 w-5" />}
          {platform ?? 'All platforms'}
        </Link>
      ))}
      <p className={heading}>Colour</p>
      {[null, ...Object.keys(STATUS)].map((status) => (
        <Link key={status ?? 'all'} to="/targets#platform-vs-target" onClick={() => pick({ status })} className={item(view.status === status)}>
          <span className="ml-1 mr-0.5 h-2.5 w-2.5 rounded-full" style={{ background: status ? STATUS[status].color : 'var(--c-accent)' }} aria-hidden="true" />
          {status ? STATUS[status].short : 'All colours'}
        </Link>
      ))}
    </>
  );
}

/** Every campaign, each opening its own place: a scorecard row, or its target form. */
function CampaignLinks({ base, allLabel, allTo, onPick }) {
  const [view, setView] = useTargetsView();
  const { campaignId } = useParams();
  const { pathname } = useLocation();
  const inSettings = pathname.startsWith('/targets/set-target');
  const onThisSection = base === '/targets' ? !inSettings : inSettings;
  const { data: running } = useTargetCampaigns(); // real campaigns, for the Set Targets menu
  const list = running ?? [];
  return (
    <>
      <p className={heading}>Platform</p>
      {[null, 'Meta', 'Google'].map((platform) => (
        <Link
          key={platform ?? 'all'}
          to={allTo}
          onClick={() => {
            setView({ platform });
            onPick();
          }}
          className={item(view.platform === platform)}
        >
          {platform ? <PlatformTile platform={platform} className="h-5 w-5 rounded-md [&_svg]:h-3.5 [&_svg]:w-3.5" /> : <span className="h-5 w-5" />}
          {platform ?? 'All platforms'}
        </Link>
      ))}
      <p className={heading}>Campaign</p>
      <Link
        to={allTo}
        onClick={() => {
          setView({ platform: null });
          onPick();
        }}
        className={item(onThisSection && !campaignId)}
      >
        <span className="h-5 w-5" />
        {allLabel}
      </Link>
      {list.map((campaign) => (
        <Link
          key={campaign.id}
          to={`${base}/${campaign.id}`}
          onClick={() => {
            setView({ platform: campaign.platform });
            onPick();
          }}
          className={item(onThisSection && campaignId === campaign.id)}>
          <PlatformTile platform={campaign.platform} className="h-5 w-5 rounded-md [&_svg]:h-3.5 [&_svg]:w-3.5" />
          <span className="truncate">{campaign.name}</span>
        </Link>
      ))}
    </>
  );
}

/** A menu icon that turns into the chosen platform's logo (Meta / Google) once one is picked, so every menu shows what is filtered. */
const withPlatformLogo = (Icon) =>
  function MenuIcon() {
    const [view] = useTargetsView();
    return view.platform ? <PlatformTile platform={view.platform} className="h-6 w-6 rounded-md [&_svg]:h-4 [&_svg]:w-4" /> : <Icon />;
  };

const PlatformIcon = withPlatformLogo(InsightsIcon);
const ScorecardIcon = withPlatformLogo(CampaignIcon);
const SetTargetsIcon = withPlatformLogo(TargetIcon);
const UserActionsIcon = withPlatformLogo(MembersIcon);

const SECTIONS = [
  { id: 'platform', label: 'Platform vs Target', icon: PlatformIcon, render: (close) => <PlatformLinks onPick={close} /> },
  { id: 'scorecard', label: 'Scorecard', icon: ScorecardIcon, render: (close) => <CampaignLinks base="/targets" allLabel="All campaigns" allTo="/targets#scorecard" onPick={close} /> },
  { id: 'set', label: 'Set Targets', icon: SetTargetsIcon, render: (close) => <CampaignLinks base="/targets/set-target" allLabel="All targets" allTo="/targets/set-target" onPick={close} /> },
];

/** Carry the page's date selection through to User Actions, including a custom range. */
function UserActionsLink({ onPick }) {
  const [view] = useTargetsView();
  const params = new URLSearchParams({ range: view.period });
  if (view.period === 'custom') {
    params.set('from', view.from);
    params.set('to', view.to);
  }
  return (
    <Link to={`/registrations?${params}`} state={{ backLabel: 'Targets' }} onClick={onPick} className={`${linkTrigger}`}>
      <UserActionsIcon />
      <span className="whitespace-nowrap">User Actions</span>
    </Link>
  );
}

/** The top bar of the Targets pages: three dropdowns on wide screens, one "Targets menu" with all of them on smaller ones. */
function TargetsNav({ variant }) {
  const { campaignId } = useParams();
  const { pathname } = useLocation();
  const [, setView] = useTargetsView();
  const { data: running } = useTargetCampaigns();
  const inSettings = pathname.startsWith('/targets/set-target');
  useEffect(() => {
    const platform = (running ?? []).find(({ id }) => id === campaignId)?.platform;
    if (platform) setView({ platform });
  }, [campaignId, inSettings, running, setView]);

  if (variant === 'wide') {
    return (
      <nav className="flex items-center gap-2" aria-label="Targets">
        {SECTIONS.map(({ id, label, icon, render }) => (
          <NavDropdown key={id} label={label} icon={icon}>
            {render}
          </NavDropdown>
        ))}
        <UserActionsLink />
      </nav>
    );
  }
  return (
    <NavDropdown label="Menu" align="right">
      {(close) =>
        SECTIONS.map(({ id, label, render }) => (
          <div key={id} className="border-b border-gray-200 pb-1 last:border-0">
            <p className="px-3 pb-0.5 pt-2 text-xs font-bold text-(--c-text-2)">{label}</p>
            {render(close)}
          </div>
        )).concat(
          <div key="user-actions" className="pb-1 pt-1">
            <UserActionsLink onPick={close} />
          </div>
        )
      }
    </NavDropdown>
  );
}

export default TargetsNav;

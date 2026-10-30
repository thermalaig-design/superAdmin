const platformOf = (value) => {
    const source = String(value ?? '').toLowerCase();
    if (/google/.test(source)) return 'Google';
    if (/meta|facebook|instagram|^(fb|ig)$/.test(source)) return 'Meta';
    return null;
};
const keyOf = (value) => String(value ?? '').trim();
const nameOf = (value) => keyOf(value).toLowerCase().replace(/\s+/g, ' ');
const phoneOf = (value) => String(value ?? '').replace(/\D/g, '').slice(-10);
const amount = (value) => Number(value) || 0;
const rounded = (value) => Math.round(value * 100) / 100;

/** First lead before app creation wins. Count Trust ids, never login/install events. */
export function buildTargetOverview({ rows, previousRows, apps, members, leads, period }) {
    const campaigns = new Map();
    const names = new Map();
    const campaignFor = (id, name, platform) => {
        const key = keyOf(id);
        if (!key || !platform) return null;
        if (!campaigns.has(key)) campaigns.set(key, { id: key, name: name || key, platform, spend: 0, registrations: 0, knownApps: 0, adSets: new Map() });
        return campaigns.get(key);
    };
    const rememberName = (name, platform, id) => {
        if (!nameOf(name)) return;
        const key = `${platform}:${nameOf(name)}`;
        const ids = names.get(key) ?? new Set();
        ids.add(keyOf(id));
        names.set(key, ids);
    };

    // Input is newest first. Keep the latest name, but accept older exact name aliases too.
    rows.forEach((row) => {
        const platform = platformOf(row.platform);
        const campaign = campaignFor(row.campaign_id, row.campaign_name, platform);
        if (!campaign) return;
        rememberName(row.campaign_name, platform, row.campaign_id);
        campaign.spend += amount(row.cost_inr);
        campaign.registrations += amount(row.clicks);
        (Array.isArray(row.raw?.adsets) ? row.raw.adsets : []).forEach((adSet) => {
            const id = keyOf(adSet.adset_id);
            if (!id) return;
            const entry = campaign.adSets.get(id) ?? { id, name: adSet.adset_name || id, spend: 0, registrations: 0, knownApps: 0 };
            entry.spend += amount(adSet.spend);
            entry.registrations += amount(adSet.clicks);
            campaign.adSets.set(id, entry);
        });
    });

    const firstLead = new Map();
    leads.forEach((lead) => {
        const phone = phoneOf(lead.mobile);
        if (phone.length !== 10 || !Number.isFinite(Date.parse(lead.lead_received_at))) return;
        if (!firstLead.has(phone) || Date.parse(lead.lead_received_at) < Date.parse(firstLead.get(phone).lead_received_at)) firstLead.set(phone, lead);
        const platform = platformOf(lead.source) ?? platformOf(lead.platform);
        if (platform && lead.campaign_id) rememberName(lead.campaign_name, platform, lead.campaign_id);
    });
    const memberById = new Map(members.map((member) => [keyOf(member.members_id), member]));
    const byPlatform = { Meta: 0, Google: 0 };
    const unassignedCampaign = { Meta: 0, Google: 0 };
    let otherSources = 0;
    const seen = new Set();

    apps.forEach((app) => {
        if (seen.has(app.id) || !(Date.parse(app.created_at) >= Date.parse(period.from) && Date.parse(app.created_at) < Date.parse(period.to))) return;
        seen.add(app.id);
        const owner = app.superuser;
        const member = memberById.get(keyOf(owner?.members_id));
        const phone = phoneOf(owner?.mobile || member?.Mobile);
        const candidate = phone.length === 10 ? firstLead.get(phone) : null;
        const lead = candidate && Date.parse(candidate.lead_received_at) <= Date.parse(app.created_at) ? candidate : null;
        const origin = lead ?? (member && Date.parse(member.created_at) <= Date.parse(app.created_at) ? member : null);
        const platform = platformOf(origin?.source) ?? platformOf(origin?.platform);
        if (!platform) { otherSources += 1; return; }
        byPlatform[platform] += 1;

        let id = keyOf(origin.campaign_id);
        if (!id) {
            const matches = names.get(`${platform}:${nameOf(origin.campaign_name)}`);
            if (matches?.size === 1) id = [...matches][0];
            // Some tracking links store the campaign id in the campaign_name field.
            else if (campaigns.get(keyOf(origin.campaign_name))?.platform === platform) id = keyOf(origin.campaign_name);
        }
        if (!id || (campaigns.has(id) && campaigns.get(id).platform !== platform)) { unassignedCampaign[platform] += 1; return; }
        const campaign = campaignFor(id, origin.campaign_name, platform);
        campaign.knownApps += 1;
        const adSetId = keyOf(origin.adset_id);
        const adSet = campaign.adSets.get(adSetId) ?? {
            id: adSetId, name: origin.adset_name || (adSetId ? adSetId : 'Ad set not tracked'),
            // Only a campaign with no ad-set breakdown can use its campaign-level spend.
            spend: !adSetId && campaign.adSets.size === 0 ? campaign.spend : null,
            registrations: !adSetId && campaign.adSets.size === 0 ? campaign.registrations : null,
            knownApps: 0,
        };
        adSet.knownApps += 1;
        campaign.adSets.set(adSetId, adSet);
    });

    const result = [...campaigns.values()].map((campaign) => {
        const incomplete = unassignedCampaign[campaign.platform] > 0;
        const missingAdSet = (campaign.adSets.get('')?.knownApps ?? 0) > 0 && campaign.adSets.size > 1;
        return {
            ...campaign,
            spend: rounded(campaign.spend),
            apps: incomplete ? null : campaign.knownApps,
            appsIncomplete: incomplete,
            unassignedPlatformApps: unassignedCampaign[campaign.platform],
            adSets: [...campaign.adSets.values()].map((adSet) => ({
                ...adSet, spend: adSet.spend === null ? null : rounded(adSet.spend),
                apps: incomplete || missingAdSet ? null : adSet.knownApps,
            })).sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0)),
        };
    }).sort((a, b) => b.spend - a.spend);
    const clicks = result.reduce((sum, campaign) => sum + campaign.registrations, 0);
    const previous = previousRows.filter((row) => platformOf(row.platform)).reduce((sum, row) => sum + amount(row.clicks), 0);
    return {
        period,
        registrationsChange: previous > 0 ? Math.round(((clicks - previous) / previous) * 100) : null,
        apps: { total: byPlatform.Meta + byPlatform.Google, byPlatform, unassignedCampaign, otherSources },
        campaigns: result,
    };
}

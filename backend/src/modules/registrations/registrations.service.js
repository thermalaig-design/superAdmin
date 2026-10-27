import { supabase } from '../../config/supabase.js';
import { getActionStats, getAppStats } from '../member-insights/memberInsights.service.js';
import { getCampaignLeads, summariseFunnel, traceLeadPeople } from '../marketing/leadStats.service.js';

const ACTIVITY_LIMIT = 5000; // rows read per source, so the per-page counts cover everything the person did
const TIMELINE_EVENTS = 300; // newest steps listed in the timeline
const TOP_PAGES = 12; // busiest pages listed per app
const ID_CHUNK = 100;
const CAMPAIGN_PEOPLE_MAX = 20000; // leads read for one campaign number
const PARALLEL = 6;

const unwrap = ({ data, count, error }) => {
    if (error) throw error;
    return { data, count };
};

const clean = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const sanitize = (text) => text.replace(/[%_\\"(),*:]/g, ' ').replace(/\s+/g, ' ').trim();
const chunk = (items, size) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

/** Plain-words title for an action recorded in page_activity.metadata.action. */
const ACTION_TITLES = {
    app_clicked: 'Opened an app',
    create_new_app_clicked: 'Tapped "Create new app"',
    app_creation_started: 'Started creating an app',
    app_launched: 'Launched their app',
    launch_failed: 'App launch failed',
    logout_clicked: 'Logged out',
    social_icon_clicked: 'Tapped a social icon',
};
const OPEN_ACTIONS = new Set(['app_clicked', 'app_launched']);

/** Runs `task` over `items` a few at a time. */
async function inBatches(items, task) {
    const results = [];
    for (let i = 0; i < items.length; i += PARALLEL) {
        results.push(...(await Promise.all(items.slice(i, i + PARALLEL).map(task))));
    }
    return results;
}

/**
 * Page actions taken in an app's User Panel by each of these members (page_activity rows that carry user_reg_id = users_reg.id,
 * not members_id). Returns a Map of member id -> count.
 */
async function getPanelActionCounts(memberIds) {
    const counts = new Map(memberIds.map((id) => [id, 0]));
    if (!memberIds.length) return counts;

    const regs = [];
    for (const ids of chunk(memberIds, ID_CHUNK)) {
        regs.push(...unwrap(await supabase.from('users_reg').select('id, members_id').in('members_id', ids)).data);
    }
    await inBatches(regs, async (reg) => {
        const { count } = unwrap(await supabase.from('page_activity').select('id', { count: 'exact', head: true }).eq('user_reg_id', reg.id));
        counts.set(reg.members_id, (counts.get(reg.members_id) ?? 0) + (count ?? 0));
    });
    return counts;
}

/** Every lead received in the period (paged: Supabase returns 1000 rows at most). */
async function leadsInPeriod({ start, end }) {
    const leads = [];
    for (let from = 0; ; from += 1000) {
        const { data } = unwrap(
            await supabase.from('leads').select('id, mobile, lead_received_at').gte('lead_received_at', start).lt('lead_received_at', end).order('lead_received_at').range(from, from + 999)
        );
        leads.push(...data);
        if (data.length < 1000) return leads;
    }
}

/**
 * The cards above the registrations list, for the period: the leads that came in, and how many of those people logged
 * in and created an app (the same lead -> login -> app funnel as the dashboard; a person with several leads counts once).
 */
export async function getRegistrationSummary(range) {
    const leads = await leadsInPeriod(range);
    const funnel = summariseFunnel(await traceLeadPeople(leads), leads.length);

    return {
        period: { from: range.start, to: range.end },
        leads: funnel.leads,
        loggedIn: funnel.loggedIn,
        creators: funnel.creators,
        apps: funnel.apps,
    };
}

/** The list rows for these members: whether they logged in, how many apps they built and how much they did. */
async function describeMembers(members) {
    const ids = members.map((m) => m.members_id);

    const logins = new Map(); // member id -> { count, firstAt }
    if (ids.length) {
        unwrap(
            await supabase.from('member_session').select('members_id, action_at').in('members_id', ids).eq('action_type', 'login').order('action_at', { ascending: true }).limit(5000)
        ).data.forEach((row) => {
            const entry = logins.get(row.members_id) ?? { count: 0, firstAt: row.action_at };
            entry.count += 1;
            logins.set(row.members_id, entry);
        });
    }
    const [apps, actions, panel] = await Promise.all([getAppStats(ids), getActionStats(ids), getPanelActionCounts(ids)]);

    return members.map((m) => ({
        id: m.members_id,
        name: clean(m.Name),
        mobile: m.Mobile != null ? String(m.Mobile) : null,
        source: clean(m.source),
        registeredAt: m.created_at,
        loggedIn: logins.has(m.members_id),
        loginCount: logins.get(m.members_id)?.count ?? 0,
        firstLoginAt: logins.get(m.members_id)?.firstAt ?? null,
        appCount: apps.get(m.members_id)?.count ?? 0,
        appNames: apps.get(m.members_id)?.names ?? [],
        actionCount: (actions.get(m.members_id)?.count ?? 0) + (panel.get(m.members_id) ?? 0),
    }));
}

/**
 * One page of the people who registered in the period (Members.created_at), newest first, each with how far they got:
 * logged in -> created an app -> actions taken. Searchable by name or mobile number.
 */
export async function getRegistrations({ start, end }, { search, page, pageSize }) {
    let query = supabase
        .from('Members')
        .select('members_id, Name, Mobile, source, created_at', { count: 'exact' })
        .gte('created_at', start)
        .lt('created_at', end);

    const term = search ? sanitize(search) : '';
    if (term) {
        const digits = term.replace(/\D/g, '');
        query = query.or(digits.length >= 6 ? `Name.ilike.*${term}*,Mobile.eq.${digits.slice(-10)}` : `Name.ilike.*${term}*`);
    }

    const { data: members, count } = unwrap(await query.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1));
    return {
        period: { from: start, to: end },
        total: count ?? 0,
        page,
        pageSize,
        registrations: await describeMembers(members),
    };
}

/**
 * The people behind one number of the dashboard's campaign table (e.g. the people who created an app from a campaign),
 * as registration rows, newest lead first. `filters` is { campaign, source, platform, adSet, stage }.
 */
export async function getCampaignRegistrations(range, filters, { search, page, pageSize }) {
    const leads = await getCampaignLeads(range, { ...filters, search, page: 1, pageSize: CAMPAIGN_PEOPLE_MAX, sort: 'desc' });
    const memberIds = [...new Set(leads.leads.map((lead) => lead.memberId).filter(Boolean))];
    const pageIds = memberIds.slice((page - 1) * pageSize, page * pageSize);

    let members = [];
    if (pageIds.length) {
        members = unwrap(await supabase.from('Members').select('members_id, Name, Mobile, source, created_at').in('members_id', pageIds)).data;
        members.sort((a, b) => pageIds.indexOf(a.members_id) - pageIds.indexOf(b.members_id));
    }

    return { period: { from: range.start, to: range.end }, total: memberIds.length, page, pageSize, registrations: await describeMembers(members) };
}

/**
 * Everything one member did, newest first: registered, logged in / out (member_session), created an app, and every
 * page / app they opened in the App (manager) and in the User Panel (page_activity), each with the app it happened in.
 * Also the person's details, how many times they went to each app and page, and what they did last (where they may be stuck).
 * Returns null if there is no such member.
 */
export async function getRegistrationTimeline(memberId) {
    const { data: member } = unwrap(
        await supabase
            .from('Members')
            .select('members_id, Name, Mobile, Email, "Company Name", "Address Home", source, sub_source, campaign_name, app_download, created_at')
            .eq('members_id', memberId)
            .maybeSingle()
    );
    if (!member) return null;

    const [sessions, owners, regs] = await Promise.all([
        supabase.from('member_session').select('id, trust_id, action_type, action_at, app_platform, login_method, metadata').eq('members_id', memberId).order('action_at', { ascending: false }).limit(ACTIVITY_LIMIT),
        supabase.from('superuser').select('id').eq('members_id', memberId),
        supabase.from('users_reg').select('id').eq('members_id', memberId),
    ]);
    const sessionRows = unwrap(sessions).data;
    const ownerIds = unwrap(owners).data.map((o) => o.id);
    const regIds = unwrap(regs).data.map((r) => r.id);

    // App (manager) activity carries members_id; User Panel activity carries the member's users_reg id (user_reg_id)
    const [appActivity, panelActivity, ownedApps] = await Promise.all([
        supabase.from('page_activity').select('id, trust_id, page_id, metadata, created_at, user_reg_id').eq('members_id', memberId).order('created_at', { ascending: false }).limit(ACTIVITY_LIMIT),
        regIds.length
            ? supabase.from('page_activity').select('id, trust_id, page_id, metadata, created_at, user_reg_id').in('user_reg_id', regIds).order('created_at', { ascending: false }).limit(ACTIVITY_LIMIT)
            : { data: [], error: null },
        ownerIds.length ? supabase.from('Trust').select('id, name, created_at').in('superuser_id', ownerIds) : { data: [], error: null },
    ]);
    const seen = new Set();
    const activityRows = [...unwrap(appActivity).data, ...unwrap(panelActivity).data].filter((row) => !seen.has(row.id) && seen.add(row.id));
    const apps = unwrap(ownedApps).data;

    const trustNames = new Map(apps.map((t) => [t.id, t.name]));
    const unknownTrusts = [...new Set([...sessionRows, ...activityRows].map((r) => r.trust_id).filter((id) => id && !trustNames.has(id)))];
    for (const ids of chunk(unknownTrusts, ID_CHUNK)) {
        unwrap(await supabase.from('Trust').select('id, name').in('id', ids)).data.forEach((t) => trustNames.set(t.id, t.name));
    }

    const pageIds = [...new Set(activityRows.map((r) => r.page_id).filter(Boolean))];
    const pages = new Map();
    for (const ids of chunk(pageIds, ID_CHUNK)) {
        unwrap(await supabase.from('page_routes').select('id, name, module, platform').in('id', ids)).data.forEach((p) => pages.set(p.id, p));
    }

    // each page action as an event
    const actionEvents = activityRows.map((row) => {
        const action = row.metadata?.action;
        const page = pages.get(row.page_id);
        const panel = row.user_reg_id || page?.platform === 'user_panel' ? 'user_panel' : 'app';
        const pageName = page?.name?.trim() || page?.module?.trim() || row.metadata?.route || null;
        return {
            id: `a-${row.id}`,
            kind: action ?? 'page',
            title: ACTION_TITLES[action] ?? `Opened ${pageName ?? 'a page'}`,
            detail: page?.module?.trim() && page.module.trim() !== pageName ? page.module.trim() : null,
            appId: row.trust_id ?? null,
            appName: trustNames.get(row.trust_id) ?? row.metadata?.trust_name ?? null,
            panel,
            pageName,
            at: row.created_at,
        };
    });

    const sessionEvents = sessionRows.map((row) => ({
        id: `s-${row.id}`,
        kind: row.action_type === 'login' ? 'login' : row.action_type === 'logout' ? 'logout' : 'session',
        title: row.action_type === 'login' ? 'Logged in' : row.action_type === 'logout' ? 'Logged out' : String(row.action_type ?? 'Session').replace(/_/g, ' '),
        detail: [row.app_platform, row.login_method].filter(Boolean).join(' · ') || null,
        appId: row.trust_id ?? null,
        appName: trustNames.get(row.trust_id) ?? null,
        panel: null,
        pageName: null,
        at: row.action_at,
    }));

    const createdEvents = apps.map((app) => ({ id: `t-${app.id}`, kind: 'app_created', title: 'Created an app', detail: null, appId: app.id, appName: app.name, panel: 'app', pageName: null, at: app.created_at }));

    const registered = { id: 'registered', kind: 'registered', title: 'Registered', detail: member.source ? `Came from ${member.source}` : null, appId: null, appName: null, panel: null, pageName: null, at: member.created_at };

    const all = [registered, ...sessionEvents, ...createdEvents, ...actionEvents].filter((e) => e.at).sort((a, b) => new Date(b.at) - new Date(a.at));

    // how many times they went to each app, and to each page inside it
    const byApp = new Map();
    const appEntry = (id, name) => {
        if (!byApp.has(id)) byApp.set(id, { id, name: name ?? 'Unknown app', opens: 0, logins: 0, actions: 0, lastAt: null, pages: new Map() });
        return byApp.get(id);
    };
    const touch = (entry, at) => {
        if (!entry.lastAt || at > entry.lastAt) entry.lastAt = at;
    };
    sessionEvents.forEach((event) => {
        if (event.kind !== 'login' || !event.appId) return;
        const entry = appEntry(event.appId, event.appName);
        entry.logins += 1;
        touch(entry, event.at);
    });
    actionEvents.forEach((event) => {
        if (!event.appId) return;
        const entry = appEntry(event.appId, event.appName);
        entry.actions += 1;
        if (OPEN_ACTIONS.has(event.kind)) entry.opens += 1;
        touch(entry, event.at);
        if (!event.pageName || event.kind !== 'page') return;
        const key = `${event.panel}:${event.pageName}`;
        const page = entry.pages.get(key) ?? { name: event.pageName, panel: event.panel, count: 0, lastAt: null };
        page.count += 1;
        if (!page.lastAt || event.at > page.lastAt) page.lastAt = event.at;
        entry.pages.set(key, page);
    });
    apps.forEach((app) => appEntry(app.id, app.name));

    const appVisits = [...byApp.values()]
        .map((entry) => ({
            id: entry.id,
            name: entry.name,
            owned: apps.some((app) => app.id === entry.id),
            opens: entry.opens,
            logins: entry.logins,
            actions: entry.actions,
            lastAt: entry.lastAt,
            pages: [...entry.pages.values()].sort((a, b) => b.count - a.count).slice(0, TOP_PAGES),
        }))
        .sort((a, b) => b.actions + b.logins - (a.actions + a.logins));
    const idleApps = appVisits.filter((v) => v.actions + v.logins === 0).map((v) => v.name); // created but never used: listed by name only

    // where they were last seen: the newest real step (registering is only the fallback)
    const lastStep = all.find((event) => event.kind !== 'registered') ?? registered;

    // the newest step in each panel, so the App and the User Panel are both shown
    const lastIn = (panel) => {
        const event = all.find((e) => e.panel === panel);
        return event ? { title: event.title, kind: event.kind, appName: event.appName, panel, pageName: event.pageName, at: event.at } : null;
    };

    const lastLogin = sessionRows.find((row) => row.action_type === 'login');
    const meta = lastLogin?.metadata ?? {};
    const loggedIn = Boolean(lastLogin);
    const stage = !loggedIn ? 'registered' : apps.length === 0 ? 'loggedIn' : activityRows.length > 0 ? 'active' : 'appCreated';

    return {
        member: {
            id: member.members_id,
            name: clean(member.Name),
            mobile: member.Mobile != null ? String(member.Mobile) : null,
            email: clean(member.Email),
            company: clean(member['Company Name']),
            address: clean(member['Address Home']),
            source: clean(member.source),
            subSource: clean(member.sub_source),
            campaign: clean(member.campaign_name),
            appDownloaded: member.app_download === true,
            registeredAt: member.created_at,
            city: meta.city ?? null,
            state: meta.state ?? null,
            country: meta.country_name ?? meta.country ?? null,
            device: [meta.device_brand ?? meta.device_manufacturer, meta.device_model].filter(Boolean).join(' ') || null,
            platform: lastLogin?.app_platform ?? null,
            loginMethod: lastLogin?.login_method ?? meta.login_method ?? null,
            lastLoginAt: lastLogin?.action_at ?? null,
        },
        stage,
        summary: {
            logins: sessionRows.filter((r) => r.action_type === 'login').length,
            apps: apps.length,
            actions: activityRows.length,
            appActions: actionEvents.filter((e) => e.panel === 'app').length,
            panelActions: actionEvents.filter((e) => e.panel === 'user_panel').length,
        },
        lastActivity: {
            title: lastStep.title,
            kind: lastStep.kind,
            appName: lastStep.appName,
            panel: lastStep.panel,
            pageName: lastStep.pageName,
            at: lastStep.at,
        },
        lastByPanel: { app: lastIn('app'), user_panel: lastIn('user_panel') },
        appVisits: appVisits.filter((v) => v.actions + v.logins > 0),
        idleApps,
        // every app this person created, newest first, with how much it has been used
        ownedApps: apps
            .map((app) => {
                const entry = byApp.get(app.id);
                return { id: app.id, name: app.name?.trim() || 'Untitled app', createdAt: app.created_at, opens: entry?.opens ?? 0, actions: entry?.actions ?? 0, lastAt: entry?.lastAt ?? null };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        truncated: all.length > TIMELINE_EVENTS,
        events: all.slice(0, TIMELINE_EVENTS),
    };
}

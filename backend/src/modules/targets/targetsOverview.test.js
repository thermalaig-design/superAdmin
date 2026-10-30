import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTargetOverview } from './targetsOverview.logic.js';
import { buildRows, spendMoney } from '../../../../frontend/src/features/targets/utils/targetMath.js';

const period = { from: '2026-10-23T18:30:00.000Z', to: '2026-10-30T18:30:00.000Z' };
const expense = (id, platform, spend, name = id) => ({ campaign_id: id, campaign_name: name, platform, cost_inr: spend, clicks: 10 });
const app = (id, memberId, mobile, at = '2026-10-27T10:00:00Z') => ({ id, created_at: at, superuser: { members_id: memberId, mobile } });
const member = (id, source, campaign_name = null) => ({ members_id: id, source, campaign_name, created_at: '2026-10-20T10:00:00Z' });
const lead = (mobile, campaign_id, source = 'META', at = '2026-10-19T10:00:00Z') => ({ mobile, campaign_id, source, lead_received_at: at });
const overview = (input) => buildTargetOverview({ rows: [], previousRows: [], apps: [], members: [], leads: [], period, ...input });

test('INR spend, platform split and clicks add up without using raw conversions', () => {
    const result = overview({ rows: [expense('m', 'meta', '100.25'), expense('m', 'meta', 49.5), expense('g', 'google', '200.05'), expense('x', 'other', 999)], previousRows: [{ platform: 'meta', clicks: 15 }] });
    const { totals } = buildRows(result, [], 60);
    assert.equal(result.registrationsChange, 100);
    assert.deepEqual(totals.spendByPlatform, { Meta: 149.75, Google: 200.05 });
    assert.equal(totals.spend, 349.8);
    assert.equal(spendMoney(totals.spend), '₹349.80');
});

test('normalised phone, first lead and unique Trust id prevent double counting', () => {
    const created = app('a', 'member', '+91 98765 43210');
    const result = overview({ rows: [expense('first', 'meta', 120), expense('second', 'google', 50)], apps: [created, created], leads: [lead('9876543210', 'second', 'Google', '2026-10-25T10:00:00Z'), lead('919876543210', 'first')] });
    assert.equal(result.apps.total, 1);
    assert.equal(result.campaigns.find((row) => row.id === 'first').apps, 1);
    assert.equal(result.campaigns.find((row) => row.id === 'second').apps, 0);
});

test('app dates use [from,to), and future ad leads never claim an organic app', () => {
    const result = overview({ apps: [app('before', 'o', '9876543210', '2026-10-23T18:29:59Z'), app('start', 'o', '9876543210', period.from), app('end', 'o', '9876543210', period.to)], members: [member('o', 'Organic')], leads: [lead('9876543210', 'm', 'META', '2026-10-25T00:00:00Z')] });
    assert.equal(result.apps.total, 0);
    assert.equal(result.apps.otherSources, 1);
});

test('Google source without campaign is counted overall, never assigned arbitrarily or treated as zero', () => {
    const result = overview({ rows: [expense('g1', 'google', 100), expense('g2', 'google', 200)], apps: [app('a', 'g', null)], members: [member('g', 'Google click')] });
    assert.equal(result.apps.total, 1);
    assert.equal(result.apps.unassignedCampaign.Google, 1);
    const { rows, totals } = buildRows(result, [], 60);
    assert.equal(totals.costPerApp, 300);
    rows.forEach((row) => {
        assert.equal(row.apps, null);
        assert.equal(row.costPerApp, null);
        assert.equal(row.status, null);
    });
});

test('exact unique campaign name can match a member; ambiguous names stay unassigned', () => {
    const input = { apps: [app('a', 'g', null)], members: [member('g', 'Google click', '  Google  Campaign ')], rows: [expense('g1', 'google', 100, 'Google Campaign')] };
    assert.equal(overview(input).campaigns[0].apps, 1);
    input.rows.push(expense('g2', 'google', 100, 'Google Campaign'));
    assert.equal(overview(input).apps.unassignedCampaign.Google, 1);
});

test('first organic lead prevents a later paid lead claiming the same app', () => {
    const result = overview({ apps: [app('a', 'm', '9876543210')], members: [member('m', 'Meta')], leads: [lead('9876543210', 'm', 'META'), lead('9876543210', null, 'Website', '2026-10-18T10:00:00Z')] });
    assert.equal(result.apps.total, 0);
    assert.equal(result.apps.otherSources, 1);
});

test('older campaign with an app is retained even without spend in this period', () => {
    const result = overview({ apps: [app('a', 'm', '9876543210')], leads: [lead('9876543210', 'old')] });
    assert.equal(result.campaigns[0].id, 'old');
    assert.equal(result.campaigns[0].spend, 0);
    assert.equal(result.campaigns[0].apps, 1);
});

test('missing ad-set tracking does not invent spend allocations or zero-cost apps', () => {
    const row = { ...expense('m', 'meta', 120), raw: { adsets: [{ adset_id: 's', adset_name: 'Set', spend: 120, clicks: 10 }] } };
    const result = overview({ rows: [row], apps: [app('a', 'm', '9876543210')], leads: [lead('9876543210', 'm')] });
    const described = buildRows(result, [], 60).rows[0];
    assert.equal(described.costPerApp, 120);
    assert.equal(described.status, 'yellow');
    assert.equal(described.adSets.find((set) => set.id === '').spend, null);
    described.adSets.forEach((set) => assert.equal(set.costPerApp, null));
});

test('real ad-set apps and saved targets drive boundary colours and zero-app status', () => {
    const row = { ...expense('m', 'meta', 120), raw: { adsets: [{ adset_id: 's', spend: 120, clicks: 10 }] } };
    const result = overview({ rows: [row, expense('g', 'google', 10)], apps: [app('a', 'm', '9876543210')], leads: [{ ...lead('9876543210', 'm'), adset_id: 's' }] });
    const { rows } = buildRows(result, [{ id: 'm', adSets: [{ id: 's', saved: { target: 120 } }] }], 60);
    assert.equal(rows[0].target, 120);
    assert.equal(rows[0].status, 'green');
    assert.equal(rows[0].adSets[0].costPerApp, 120);
    assert.equal(rows[1].apps, 0);
    assert.equal(rows[1].costPerApp, null);
    assert.equal(rows[1].status, 'red');
});

import { refresh } from '../../utils/cache.js';
import { resolveRange } from '../../utils/dateRange.js';
import { getDashboard } from './dashboard.service.js';

const WARM_RANGES = ['7d', '24h', '30d'];
const REFRESH_MS = 4 * 60 * 1000; // a little under the cache's fresh time, so the usual ranges are always ready

/** Reloads the common date ranges into the cache, one after another. Cache keys match dashboard.controller.js. */
async function warmRanges() {
    for (const range of WARM_RANGES) {
        const resolved = resolveRange({ range });
        try {
            await refresh(`dashboard:${JSON.stringify(resolved)}`, () => getDashboard(resolved));
        } catch (error) {
            console.error(`warm-up of dashboard ${range} failed:`, error.message);
        }
    }
}

/** Fills the cache at start-up and keeps it fresh, so opening the dashboard never waits for a cold load. */
export function warmDashboardCache() {
    warmRanges();
    setInterval(warmRanges, REFRESH_MS).unref();
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Day boundaries follow the business timezone (default IST, UTC+5:30), not the server's.
const getOffsetMs = () => Number(process.env.APP_TZ_OFFSET_MINUTES ?? 330) * 60 * 1000;

const MAX_RANGE_DAYS = 366;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** UTC ms of local midnight for the day containing `timestamp`. */
export const startOfLocalDay = (timestamp = Date.now()) =>
    Math.floor((timestamp + getOffsetMs()) / DAY_MS) * DAY_MS - getOffsetMs();

/**
 * UTC ms of the start of the "last 24 hours" window: the start of the local hour 23 hours ago, so the window is
 * 24 whole local hours ending with the current (still running) hour, and each hour of the day appears once.
 */
export const startOfLast24Hours = (timestamp = Date.now()) =>
    Math.floor((timestamp + getOffsetMs()) / HOUR_MS) * HOUR_MS - getOffsetMs() - 23 * HOUR_MS;

/** UTC ms of local midnight for a YYYY-MM-DD string, or null if invalid. */
function parseLocalDate(value) {
    if (!DATE_PATTERN.test(value)) return null;
    const utc = Date.parse(`${value}T00:00:00Z`);
    return Number.isNaN(utc) ? null : utc - getOffsetMs();
}

/**
 * Resolves a range selection to [start, end) instants plus the first/last day shown.
 * Returns { error } for invalid input.
 */
export function resolveRange({ range = '7d', from, to }) {
    // The "today" figures follow the last 24 hours (see startOfLast24Hours), not the calendar day.
    const todayStart = startOfLast24Hours();
    const dayStart = startOfLocalDay();
    let firstDay;
    let lastDay = dayStart;

    switch (range) {
        case '24h':
        case 'today': // old links
            // One window of 24 hourly buckets: firstDay = lastDay = the window start, so the day-based end (lastDay + 1 day) is start + 24h.
            firstDay = todayStart;
            lastDay = todayStart;
            break;
        case '7d':
            firstDay = dayStart - 6 * DAY_MS;
            break;
        case '30d':
            firstDay = dayStart - 29 * DAY_MS;
            break;
        case 'custom': {
            firstDay = parseLocalDate(from ?? '');
            lastDay = parseLocalDate(to ?? '');
            if (firstDay === null || lastDay === null) {
                return { error: 'Custom range needs valid from and to dates (YYYY-MM-DD)' };
            }
            if (firstDay > lastDay) return { error: 'From date must not be after to date' };
            if ((lastDay - firstDay) / DAY_MS >= MAX_RANGE_DAYS) {
                return { error: `Custom range cannot exceed ${MAX_RANGE_DAYS} days` };
            }
            break;
        }
        default:
            return { error: 'range must be one of 24h, 7d, 30d, custom' };
    }

    return {
        start: new Date(firstDay).toISOString(),
        end: new Date(lastDay + DAY_MS).toISOString(),
        firstDay: new Date(firstDay).toISOString(),
        lastDay: new Date(lastDay).toISOString(),
        todayStart: new Date(todayStart).toISOString(),
    };
}

const pad = (n) => String(n).padStart(2, '0');

/** Local (business timezone) calendar day of an instant, as YYYY-MM-DD. */
export function localDayKey(value) {
    const d = new Date(new Date(value).getTime() + getOffsetMs());
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Local (business timezone) hour of an instant, 0-23. */
export const localHour = (value) => new Date(new Date(value).getTime() + getOffsetMs()).getUTCHours();

/**
 * Start (UTC ms) of the calendar periods used for "total actions", in the business timezone.
 * The week starts on Monday; month and year start on the 1st / 1 Jan.
 */
export function getCalendarPeriodStarts(now = Date.now()) {
    const offset = getOffsetMs();
    const local = new Date(now + offset);
    const year = local.getUTCFullYear();
    const month = local.getUTCMonth();
    const day = local.getUTCDate();
    const daysSinceMonday = (local.getUTCDay() + 6) % 7;

    const toInstant = (y, m, d) => Date.UTC(y, m, d) - offset;
    const last24 = startOfLast24Hours(now);

    return {
        today: last24, // the last 24 hours
        yesterday: last24 - DAY_MS, // the 24 hours before that
        week: toInstant(year, month, day - daysSinceMonday),
        month: toInstant(year, month, 1),
        year: toInstant(year, 0, 1),
    };
}

/** Every local day key from firstDay to lastDay (both are instants of local midnight). */
export function listDayKeys(firstDay, lastDay) {
    const keys = [];
    const end = new Date(lastDay).getTime();
    for (let t = new Date(firstDay).getTime(); t <= end && keys.length < MAX_RANGE_DAYS; t += DAY_MS) {
        keys.push(localDayKey(t));
    }
    return keys;
}

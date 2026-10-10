import { BUSINESS_TZ } from '../../../utils/businessDate';

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const MAX_DAILY_POINTS = 62; // beyond about two months a daily line is too crowded, so points become weeks

const format = (options) => new Intl.DateTimeFormat('en-GB', { timeZone: BUSINESS_TZ, ...options });
const fmt = {
  hourAxis: format({ hour: 'numeric', hour12: true }),
  hourTip: format({ day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
  dayAxis: format({ day: '2-digit', month: 'short' }),
  dayTip: format({ day: '2-digit', month: 'short', year: 'numeric' }),
};

/** One hour for a single day, one day up to about two months, one week beyond that. */
export const pickGranularity = (days) => (days === 1 ? 'hour' : days <= MAX_DAILY_POINTS ? 'day' : 'week');

export const BUCKET_MS = { hour: HOUR_MS, day: DAY_MS, week: WEEK_MS };

/** Axis label and tooltip heading for a bucket that starts at `from` and whose last day starts at `lastDay`. */
export function describeBucket(granularity, from, lastDay) {
  if (granularity === 'hour') return { label: fmt.hourAxis.format(from), title: fmt.hourTip.format(from) };
  if (granularity === 'day') return { label: fmt.dayAxis.format(from), title: fmt.dayTip.format(from) };
  return { label: fmt.dayAxis.format(from), title: `${fmt.dayAxis.format(from)} – ${fmt.dayTip.format(lastDay)}` };
}

const summarise = (granularity, buckets) => ({
  granularity,
  buckets,
  total: buckets.reduce((sum, b) => sum + b.count, 0),
  max: Math.max(0, ...buckets.map((b) => b.count)),
});

/**
 * Counts trusts per hour / day / week across the selected period, ready for the graph.
 *
 * `period.from` and `period.to` are the first and last day (instants of local midnight). Buckets that haven't
 * started yet are dropped, so "Today" ends at the current hour instead of trailing off into the future.
 */
export function buildCreationSeries(trusts, period, now) {
  if (!period) return summarise('day', []);

  const start = new Date(period.from).getTime();
  const end = new Date(period.to).getTime() + DAY_MS; // exclusive
  const granularity = pickGranularity(Math.round((end - start) / DAY_MS));
  const size = BUCKET_MS[granularity];

  const buckets = [];
  for (let from = start; from < end && from <= now; from += size) {
    const lastDay = Math.min(from + size, end) - DAY_MS;
    buckets.push({ from, count: 0, ...describeBucket(granularity, from, lastDay) });
  }

  trusts.forEach((trust) => {
    const index = Math.floor((new Date(trust.createdAt).getTime() - start) / size);
    if (buckets[index]) buckets[index].count += 1;
  });

  return summarise(granularity, buckets);
}

/**
 * Activity per hour / day / week for the selected period.
 *
 * The server sends `byHour` (24 counts) and `trend` (one count per day, first day to last day). A single day
 * is drawn hourly from `byHour`; longer periods are drawn from `trend`, summed into weeks when there are many days.
 */
export function buildActivitySeries({ trend, byHour }, period, now) {
  if (!period) return summarise('day', []);

  const start = new Date(period.from).getTime();
  const days = Math.round((new Date(period.to).getTime() - start) / DAY_MS) + 1;
  const granularity = pickGranularity(days);

  let buckets;
  if (granularity === 'hour') {
    buckets = byHour.map(({ hour, count }) => {
      const from = start + hour * HOUR_MS;
      return { from, count, ...describeBucket('hour', from, from) };
    });
  } else {
    const perBucket = granularity === 'day' ? 1 : 7;
    buckets = [];
    for (let i = 0; i < trend.length; i += perBucket) {
      const slice = trend.slice(i, i + perBucket);
      const from = start + i * DAY_MS;
      const lastDay = from + (slice.length - 1) * DAY_MS;
      buckets.push({ from, count: slice.reduce((sum, d) => sum + d.count, 0), ...describeBucket(granularity, from, lastDay) });
    }
  }

  return summarise(granularity, buckets.filter((b) => b.from <= now));
}

/**
 * Graph points from counts the server has already grouped: `counts[i]` belongs to the bucket that starts at
 * `period.from + i × size` (size = 1 hour, 1 day or 7 days, as named by `granularity`).
 */
export function buildCountSeries({ counts, granularity }, period, now) {
  if (!period) return summarise('day', []);

  const start = new Date(period.from).getTime();
  const end = new Date(period.to).getTime() + DAY_MS; // exclusive
  const size = BUCKET_MS[granularity];

  const buckets = counts.map((count, i) => {
    const from = start + i * size;
    const lastDay = Math.min(from + size, end) - DAY_MS;
    return { from, count, ...describeBucket(granularity, from, lastDay) };
  });

  return summarise(granularity, buckets.filter((b) => b.from <= now));
}

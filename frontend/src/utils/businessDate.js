// Days start at midnight in this timezone, matching the backend (APP_TZ_OFFSET_MINUTES, default IST = +05:30).
export const BUSINESS_TZ = 'Asia/Kolkata';

/** Custom ranges open at this date (the platform's start), then run to today. */
export const CUSTOM_RANGE_START = '2026-04-01';

/** Today's date in the business timezone, as YYYY-MM-DD. */
export function todayInBusinessTz(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TZ }).format(now);
}

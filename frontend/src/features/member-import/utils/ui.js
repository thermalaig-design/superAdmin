/** Shared class names for the import screens (all colours come from the app's theme variables). */
export const card = 'mi-card mi-rise rounded-2xl border border-(--c-border) bg-(--c-surface) p-5 shadow-[0_1px_3px_rgba(20,33,61,0.06)]';
export const input =
  'h-10 w-full rounded-xl border border-(--c-border-strong) bg-(--c-surface) px-3 text-sm outline-none focus:border-(--c-accent)';
export const primaryButton =
  'mi-btn inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-r from-(--c-grad-from) via-(--c-grad-via) to-(--c-grad-to) px-5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(15,120,110,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none';
export const ghostButton =
  'mi-ghost inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-(--c-border-strong) px-4 text-sm font-medium text-(--c-text-2) transition hover:bg-(--c-subtle) disabled:cursor-not-allowed disabled:opacity-45';

/** Status looks, used for the little pills and cards. */
export const TONES = {
  good: 'bg-(--c-good-bg) text-(--c-good-text)',
  info: 'bg-(--c-accent-soft) text-(--c-link)',
  warn: 'bg-(--c-warn-bg) text-(--c-warn-text)',
  bad: 'bg-(--c-bad-bg) text-(--c-bad-text)',
  neutral: 'bg-(--c-band) text-(--c-text-3)',
};

/** How each kind of row is described to the user. */
export const BUCKETS = {
  new: { label: 'New member', tone: 'good', hint: 'Will be created and added to this trust' },
  link: { label: 'Already member', tone: 'info', hint: 'No new member is created. Added to this trust' },
  linkUpdate: { label: 'Already member', tone: 'info', hint: 'Already in this trust. Role and membership number are updated' },
  review: { label: 'Needs your decision', tone: 'warn', hint: 'This mobile exists under a different name' },
  ambiguous: { label: 'Needs your decision', tone: 'warn', hint: 'This mobile exists under several people' },
  duplicate: { label: 'Repeated in file', tone: 'neutral', hint: 'Same name and mobile appear earlier in the file. Skipped' },
};

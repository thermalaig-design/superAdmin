-- Targets set on the SuperAdmin "Set Targets" page: one row per ad set.
-- adset_id is '' for a campaign that has no ad sets (the target is then for the whole campaign).
-- Run this once in the Supabase SQL editor. The backend (service role) reads and writes it.
create table if not exists public.adset_targets (
  campaign_id text not null,
  adset_id text not null default '',
  platform text,
  target_cost_per_app numeric not null check (target_cost_per_app > 0),
  daily_budget_inr numeric not null default 0 check (daily_budget_inr >= 0),
  min_apps integer not null default 15 check (min_apps >= 1), -- no longer shown on the page; kept with its default
  previous_target numeric, -- the target this ad set had before the last change
  alerts text not null default 'both' check (alerts in ('both', 'whatsapp', 'email', 'none')),
  updated_at timestamptz not null default now(),
  primary key (campaign_id, adset_id)
);

-- for a table created by an earlier version of this file
alter table public.adset_targets add column if not exists previous_target numeric;

alter table public.adset_targets enable row level security;

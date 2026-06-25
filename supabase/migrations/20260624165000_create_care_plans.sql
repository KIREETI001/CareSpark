create extension if not exists "pgcrypto";

create table if not exists public.care_plans (
  id uuid primary key default gen_random_uuid(),
  share_code text not null unique,
  caregiver_name text not null default '',
  recipient_name text not null default '',
  relationship text not null default '',
  stage text not null check (stage in ('preparing', 'active', 'escalating', 'crisis')),
  condition text not null check (condition in ('aging', 'dementia', 'stroke', 'disability', 'mental-health', 'palliative')),
  hours_per_week integer not null default 0 check (hours_per_week >= 0 and hours_per_week <= 168),
  sleep_quality integer not null default 5 check (sleep_quality >= 1 and sleep_quality <= 10),
  emotional_load integer not null default 5 check (emotional_load >= 1 and emotional_load <= 10),
  family_support integer not null default 5 check (family_support >= 1 and family_support <= 10),
  financial_stress integer not null default 5 check (financial_stress >= 1 and financial_stress <= 10),
  work_strain integer not null default 5 check (work_strain >= 1 and work_strain <= 10),
  has_helper boolean not null default false,
  has_acp boolean not null default false,
  has_healthier_sg boolean not null default false,
  has_care_plan boolean not null default false,
  risk_score integer not null default 0 check (risk_score >= 0 and risk_score <= 100),
  risk_band text not null default '',
  schemes jsonb not null default '[]'::jsonb,
  roadmap jsonb not null default '[]'::jsonb,
  tasks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists care_plans_share_code_idx on public.care_plans (share_code);
create index if not exists care_plans_updated_at_idx on public.care_plans (updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists care_plans_set_updated_at on public.care_plans;
create trigger care_plans_set_updated_at
before update on public.care_plans
for each row
execute function public.set_updated_at();

alter table public.care_plans enable row level security;

drop policy if exists "anon can create care plans" on public.care_plans;
create policy "anon can create care plans"
on public.care_plans
for insert
to anon
with check (true);

drop policy if exists "anon can read care plans by share code" on public.care_plans;
create policy "anon can read care plans by share code"
on public.care_plans
for select
to anon
using (true);

drop policy if exists "anon can update care plans" on public.care_plans;
create policy "anon can update care plans"
on public.care_plans
for update
to anon
using (true)
with check (true);

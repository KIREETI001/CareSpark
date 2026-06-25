create table if not exists public.market_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null default '',
  segment text not null default 'caregiver',
  source text not null default 'app',
  share_code text,
  message text not null default '',
  consent boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email, source)
);

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  share_code text,
  persona text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  share_code text,
  task_title text not null default '',
  recipient text not null default '',
  channel text not null default 'sms',
  message text not null default '',
  scheduled_for timestamptz,
  status text not null default 'stored',
  provider_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists market_leads_created_at_idx on public.market_leads (created_at desc);
create index if not exists product_events_created_at_idx on public.product_events (created_at desc);
create index if not exists product_events_event_name_idx on public.product_events (event_name);
create index if not exists reminders_share_code_idx on public.reminders (share_code);

drop trigger if exists market_leads_set_updated_at on public.market_leads;
create trigger market_leads_set_updated_at
before update on public.market_leads
for each row
execute function public.set_updated_at();

drop trigger if exists reminders_set_updated_at on public.reminders;
create trigger reminders_set_updated_at
before update on public.reminders
for each row
execute function public.set_updated_at();

alter table public.market_leads enable row level security;
alter table public.product_events enable row level security;
alter table public.reminders enable row level security;

drop policy if exists "anon can create market leads" on public.market_leads;
create policy "anon can create market leads"
on public.market_leads
for insert
to anon
with check (true);

drop policy if exists "anon can update market leads" on public.market_leads;
create policy "anon can update market leads"
on public.market_leads
for update
to anon
using (true)
with check (true);

drop policy if exists "anon can create product events" on public.product_events;
create policy "anon can create product events"
on public.product_events
for insert
to anon
with check (true);

drop policy if exists "anon can create reminders" on public.reminders;
create policy "anon can create reminders"
on public.reminders
for insert
to anon
with check (true);

drop policy if exists "anon can read reminders by share code" on public.reminders;
create policy "anon can read reminders by share code"
on public.reminders
for select
to anon
using (true);

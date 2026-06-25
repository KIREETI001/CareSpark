create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  role text not null default 'caregiver',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.care_circles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Family care circle',
  care_recipient_name text not null default '',
  stage text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.care_circle_members (
  id uuid primary key default gen_random_uuid(),
  care_circle_id uuid not null references public.care_circles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null default '',
  member_role text not null default 'family',
  invite_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (care_circle_id, email)
);

create table if not exists public.subscription_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  care_circle_id uuid references public.care_circles(id) on delete set null,
  plan_key text not null default 'free_check',
  status text not null default 'trialing',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.care_plans
  add column if not exists owner_id uuid references auth.users(id) on delete cascade,
  add column if not exists care_circle_id uuid references public.care_circles(id) on delete set null,
  add column if not exists privacy_consent boolean not null default false,
  add column if not exists retention_review_at timestamptz default (now() + interval '12 months');

create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists care_circles_owner_id_idx on public.care_circles (owner_id);
create index if not exists care_circle_members_user_id_idx on public.care_circle_members (user_id);
create index if not exists care_circle_members_email_idx on public.care_circle_members (lower(email));
create index if not exists subscription_entitlements_user_id_idx on public.subscription_entitlements (user_id);
create index if not exists care_plans_owner_id_idx on public.care_plans (owner_id);
create index if not exists care_plans_care_circle_id_idx on public.care_plans (care_circle_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists care_circles_set_updated_at on public.care_circles;
create trigger care_circles_set_updated_at
before update on public.care_circles
for each row
execute function public.set_updated_at();

drop trigger if exists care_circle_members_set_updated_at on public.care_circle_members;
create trigger care_circle_members_set_updated_at
before update on public.care_circle_members
for each row
execute function public.set_updated_at();

drop trigger if exists subscription_entitlements_set_updated_at on public.subscription_entitlements;
create trigger subscription_entitlements_set_updated_at
before update on public.subscription_entitlements
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.care_circles enable row level security;
alter table public.care_circle_members enable row level security;
alter table public.subscription_entitlements enable row level security;

drop policy if exists "profiles own read" on public.profiles;
create policy "profiles own read"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "care circles owner read" on public.care_circles;
create policy "care circles owner read"
on public.care_circles
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "care circles owner insert" on public.care_circles;
create policy "care circles owner insert"
on public.care_circles
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "care circles owner update" on public.care_circles;
create policy "care circles owner update"
on public.care_circles
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "care circle members visible to circle participants" on public.care_circle_members;
create policy "care circle members visible to circle participants"
on public.care_circle_members
for select
to authenticated
using (
  user_id = auth.uid()
  or lower(email) = lower(auth.jwt() ->> 'email')
  or exists (
    select 1 from public.care_circles c
    where c.id = care_circle_members.care_circle_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "care circle members owner insert" on public.care_circle_members;
create policy "care circle members owner insert"
on public.care_circle_members
for insert
to authenticated
with check (
  exists (
    select 1 from public.care_circles c
    where c.id = care_circle_members.care_circle_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "care circle members owner update" on public.care_circle_members;
create policy "care circle members owner update"
on public.care_circle_members
for update
to authenticated
using (
  exists (
    select 1 from public.care_circles c
    where c.id = care_circle_members.care_circle_id
      and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.care_circles c
    where c.id = care_circle_members.care_circle_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "subscriptions own read" on public.subscription_entitlements;
create policy "subscriptions own read"
on public.subscription_entitlements
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.care_circles c
    where c.id = subscription_entitlements.care_circle_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "anon can create care plans" on public.care_plans;
drop policy if exists "anon can read care plans by share code" on public.care_plans;
drop policy if exists "anon can update care plans" on public.care_plans;

drop policy if exists "care plans owned or circle member read" on public.care_plans;
create policy "care plans owned or circle member read"
on public.care_plans
for select
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.care_circle_members m
    where m.care_circle_id = care_plans.care_circle_id
      and (m.user_id = auth.uid() or lower(m.email) = lower(auth.jwt() ->> 'email'))
  )
);

drop policy if exists "care plans owner insert" on public.care_plans;
create policy "care plans owner insert"
on public.care_plans
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "care plans owner update" on public.care_plans;
create policy "care plans owner update"
on public.care_plans
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

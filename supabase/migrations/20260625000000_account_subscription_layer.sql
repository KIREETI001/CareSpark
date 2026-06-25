create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  avatar_url text,
  phone text,
  country text not null default 'SG',
  locale text not null default 'en-SG',
  timezone text not null default 'Asia/Singapore',
  stripe_customer_id text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists profiles_stripe_customer_id_idx on public.profiles (stripe_customer_id);

create table if not exists public.care_circles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Care circle',
  care_recipient_name text not null default '',
  care_recipient_relationship text not null default '',
  stage text not null default 'active' check (stage in ('preparing', 'active', 'escalating', 'crisis', 'archived')),
  share_code text not null default encode(gen_random_bytes(8), 'hex') unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists care_circles_owner_id_idx on public.care_circles (owner_id);
create index if not exists care_circles_share_code_idx on public.care_circles (share_code);
create index if not exists care_circles_updated_at_idx on public.care_circles (updated_at desc);

create table if not exists public.care_circle_members (
  id uuid primary key default gen_random_uuid(),
  care_circle_id uuid not null references public.care_circles (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  email text,
  display_name text not null default '',
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  status text not null default 'invited' check (status in ('invited', 'active', 'removed')),
  invited_by uuid references auth.users (id) on delete set null,
  joined_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or nullif(trim(coalesce(email, '')), '') is not null)
);

create index if not exists care_circle_members_circle_id_idx on public.care_circle_members (care_circle_id);
create index if not exists care_circle_members_user_id_idx on public.care_circle_members (user_id);
create index if not exists care_circle_members_status_idx on public.care_circle_members (status);

create unique index if not exists care_circle_members_active_user_unique_idx
on public.care_circle_members (care_circle_id, user_id)
where user_id is not null and status <> 'removed';

create unique index if not exists care_circle_members_active_email_unique_idx
on public.care_circle_members (care_circle_id, lower(email))
where email is not null and status <> 'removed';

create table if not exists public.subscription_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  care_circle_id uuid references public.care_circles (id) on delete cascade,
  source text not null default 'stripe' check (source in ('stripe', 'manual', 'placeholder')),
  plan_key text not null default 'placeholder',
  status text not null default 'placeholder' check (
    status in (
      'placeholder',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'incomplete',
      'incomplete_expired',
      'paused'
    )
  ),
  seats integer not null default 1 check (seats > 0),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  features jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or care_circle_id is not null)
);

create unique index if not exists subscription_entitlements_stripe_subscription_id_idx
on public.subscription_entitlements (stripe_subscription_id)
where stripe_subscription_id is not null;

create index if not exists subscription_entitlements_user_id_idx on public.subscription_entitlements (user_id);
create index if not exists subscription_entitlements_care_circle_id_idx on public.subscription_entitlements (care_circle_id);
create index if not exists subscription_entitlements_customer_id_idx on public.subscription_entitlements (stripe_customer_id);
create index if not exists subscription_entitlements_status_idx on public.subscription_entitlements (status);

create table if not exists public.support_directory (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null,
  name text not null,
  summary text not null default '',
  description text not null default '',
  website_url text,
  phone text,
  email text,
  region text not null default 'SG',
  tags text[] not null default '{}'::text[],
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_directory_category_idx on public.support_directory (category);
create index if not exists support_directory_active_idx on public.support_directory (is_active);
create index if not exists support_directory_tags_idx on public.support_directory using gin (tags);

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

drop trigger if exists support_directory_set_updated_at on public.support_directory;
create trigger support_directory_set_updated_at
before update on public.support_directory
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profiles on auth.users;
create trigger on_auth_user_created_profiles
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

create or replace function public.is_care_circle_member(p_care_circle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) <> '00000000-0000-0000-0000-000000000000'::uuid
    and (
      exists (
        select 1
        from public.care_circles circle
        where circle.id = p_care_circle_id
          and circle.owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.care_circle_members member
        where member.care_circle_id = p_care_circle_id
          and member.user_id = auth.uid()
          and member.status = 'active'
      )
    );
$$;

create or replace function public.can_manage_care_circle(p_care_circle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) <> '00000000-0000-0000-0000-000000000000'::uuid
    and (
      exists (
        select 1
        from public.care_circles circle
        where circle.id = p_care_circle_id
          and circle.owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.care_circle_members member
        where member.care_circle_id = p_care_circle_id
          and member.user_id = auth.uid()
          and member.status = 'active'
          and member.role in ('owner', 'admin')
      )
    );
$$;

create or replace function public.ensure_care_circle_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.care_circle_members (care_circle_id, user_id, role, status, joined_at)
  select new.id, new.owner_id, 'owner', 'active', now()
  where not exists (
    select 1
    from public.care_circle_members member
    where member.care_circle_id = new.id
      and member.user_id = new.owner_id
      and member.status <> 'removed'
  );

  return new;
end;
$$;

drop trigger if exists care_circles_add_owner_member on public.care_circles;
create trigger care_circles_add_owner_member
after insert on public.care_circles
for each row
execute function public.ensure_care_circle_owner_member();

alter table public.profiles enable row level security;
alter table public.care_circles enable row level security;
alter table public.care_circle_members enable row level security;
alter table public.subscription_entitlements enable row level security;
alter table public.support_directory enable row level security;

drop policy if exists "profiles are readable by owner" on public.profiles;
create policy "profiles are readable by owner"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles can be created by owner" on public.profiles;
create policy "profiles can be created by owner"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles can be updated by owner" on public.profiles;
create policy "profiles can be updated by owner"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "care circles are readable by members" on public.care_circles;
create policy "care circles are readable by members"
on public.care_circles
for select
to authenticated
using (owner_id = auth.uid() or public.is_care_circle_member(id));

drop policy if exists "care circles can be created by owners" on public.care_circles;
create policy "care circles can be created by owners"
on public.care_circles
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "care circles can be updated by owners" on public.care_circles;
create policy "care circles can be updated by owners"
on public.care_circles
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "care circles can be deleted by owners" on public.care_circles;
create policy "care circles can be deleted by owners"
on public.care_circles
for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "care circle members are readable by circle members" on public.care_circle_members;
create policy "care circle members are readable by circle members"
on public.care_circle_members
for select
to authenticated
using (user_id = auth.uid() or public.is_care_circle_member(care_circle_id));

drop policy if exists "care circle members can be invited by managers" on public.care_circle_members;
create policy "care circle members can be invited by managers"
on public.care_circle_members
for insert
to authenticated
with check (public.can_manage_care_circle(care_circle_id));

drop policy if exists "care circle members can be updated by managers" on public.care_circle_members;
create policy "care circle members can be updated by managers"
on public.care_circle_members
for update
to authenticated
using (public.can_manage_care_circle(care_circle_id))
with check (public.can_manage_care_circle(care_circle_id));

drop policy if exists "care circle members can be removed by managers" on public.care_circle_members;
create policy "care circle members can be removed by managers"
on public.care_circle_members
for delete
to authenticated
using (public.can_manage_care_circle(care_circle_id));

drop policy if exists "subscription entitlements are readable by owners and circle members" on public.subscription_entitlements;
create policy "subscription entitlements are readable by owners and circle members"
on public.subscription_entitlements
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    care_circle_id is not null
    and public.is_care_circle_member(care_circle_id)
  )
);

drop policy if exists "active support directory entries are public" on public.support_directory;
create policy "active support directory entries are public"
on public.support_directory
for select
to anon, authenticated
using (is_active);

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.care_circles to authenticated;
grant select, insert, update, delete on public.care_circle_members to authenticated;
grant select on public.subscription_entitlements to authenticated;
grant select on public.support_directory to anon, authenticated;
grant all on public.subscription_entitlements to service_role;
grant all on public.support_directory to service_role;

grant execute on function public.is_care_circle_member(uuid) to authenticated;
grant execute on function public.can_manage_care_circle(uuid) to authenticated;

insert into public.support_directory (slug, category, name, summary, description, website_url, phone, tags, metadata)
values
  (
    'aic-care-services',
    'service-navigation',
    'AIC care services',
    'Navigation for home care, centre care, respite, and caregiver support in Singapore.',
    'Use this as the starting point for matching a care circle to home care, day care, respite, and caregiver support services.',
    'https://www.aic.sg/Care-Services',
    '1800-650-6060',
    array['aic', 'respite', 'home-care', 'caregiver-support'],
    '{"country":"SG"}'::jsonb
  ),
  (
    'home-caregiving-grant',
    'financial-support',
    'Home Caregiving Grant',
    'Monthly cash support that may help with caregiving costs for eligible households.',
    'Track eligibility and next steps when daily care, helper support, transport, or respite costs become regular.',
    'https://www.aic.sg/Financial-Assistance/Home-Caregiving-Grant',
    '1800-650-6060',
    array['grant', 'financial-support', 'home-care'],
    '{"country":"SG"}'::jsonb
  ),
  (
    'caregivers-training-grant',
    'training',
    'Caregivers Training Grant',
    'Training subsidy for approved caregiver courses.',
    'Use this for care circles that need safer routines for transfers, dementia care, medication support, or helper training.',
    'https://www.aic.sg/Financial-Assistance/Caregivers-Training-Grant',
    '1800-650-6060',
    array['grant', 'training', 'skills'],
    '{"country":"SG"}'::jsonb
  ),
  (
    'mindline-1771',
    'crisis-support',
    'mindline 1771',
    'Singapore mental health support line for emotional distress and caregiver strain.',
    'Route urgent emotional distress, self-harm risk, or crisis escalation to appropriate emergency and mental health support.',
    'https://www.mindline.sg',
    '1771',
    array['mental-health', 'crisis', 'caregiver-support'],
    '{"country":"SG"}'::jsonb
  )
on conflict (slug) do update set
  category = excluded.category,
  name = excluded.name,
  summary = excluded.summary,
  description = excluded.description,
  website_url = excluded.website_url,
  phone = excluded.phone,
  tags = excluded.tags,
  metadata = excluded.metadata,
  is_active = true,
  updated_at = now();

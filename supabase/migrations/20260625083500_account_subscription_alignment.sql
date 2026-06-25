create extension if not exists "pgcrypto";

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists phone text,
  add column if not exists country text not null default 'SG',
  add column if not exists locale text not null default 'en-SG',
  add column if not exists timezone text not null default 'Asia/Singapore',
  add column if not exists stripe_customer_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists profiles_stripe_customer_id_idx
on public.profiles (stripe_customer_id)
where stripe_customer_id is not null;

alter table public.care_circles
  add column if not exists care_recipient_relationship text not null default '',
  add column if not exists share_code text not null default encode(gen_random_bytes(8), 'hex'),
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists care_circles_share_code_idx on public.care_circles (share_code);

alter table public.care_circle_members
  add column if not exists display_name text not null default '',
  add column if not exists role text not null default 'member',
  add column if not exists status text not null default 'invited',
  add column if not exists invited_by uuid references auth.users(id) on delete set null,
  add column if not exists joined_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.care_circle_members
set role = coalesce(nullif(member_role, ''), role),
    status = coalesce(nullif(invite_status, ''), status)
where member_role is not null or invite_status is not null;

alter table public.subscription_entitlements
  add column if not exists source text not null default 'stripe',
  add column if not exists seats integer not null default 1,
  add column if not exists stripe_price_id text,
  add column if not exists current_period_start timestamptz,
  add column if not exists trial_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists features jsonb not null default '{}'::jsonb;

create unique index if not exists subscription_entitlements_stripe_subscription_id_idx
on public.subscription_entitlements (stripe_subscription_id)
where stripe_subscription_id is not null;

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

drop trigger if exists support_directory_set_updated_at on public.support_directory;
create trigger support_directory_set_updated_at
before update on public.support_directory
for each row
execute function public.set_updated_at();

alter table public.support_directory enable row level security;

drop policy if exists "active support directory entries are public" on public.support_directory;
create policy "active support directory entries are public"
on public.support_directory
for select
to anon, authenticated
using (is_active);

grant select on public.support_directory to anon, authenticated;
grant all on public.subscription_entitlements to service_role;
grant all on public.support_directory to service_role;

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

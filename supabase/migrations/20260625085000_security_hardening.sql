create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "anon can create market leads" on public.market_leads;
drop policy if exists "anon can update market leads" on public.market_leads;
drop policy if exists "public can create market leads" on public.market_leads;
drop policy if exists "public can update market leads" on public.market_leads;
drop policy if exists "anon can create product events" on public.product_events;
drop policy if exists "public can create product events" on public.product_events;
drop policy if exists "anon can create reminders" on public.reminders;
drop policy if exists "anon can read reminders by share code" on public.reminders;

revoke execute on function public.capture_product_event(text, text, text, jsonb) from anon, authenticated;
revoke execute on function public.capture_market_lead(text, text, text, text, text, text, boolean, jsonb) from anon, authenticated;
revoke execute on function public.handle_new_user_profile() from anon, authenticated;

grant execute on function public.capture_product_event(text, text, text, jsonb) to service_role;
grant execute on function public.capture_market_lead(text, text, text, text, text, text, boolean, jsonb) to service_role;
grant execute on function public.handle_new_user_profile() to service_role;

create index if not exists care_circle_members_invited_by_idx on public.care_circle_members (invited_by);
create index if not exists subscription_entitlements_care_circle_id_idx on public.subscription_entitlements (care_circle_id);

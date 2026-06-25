create or replace function public.capture_product_event(
  p_event_name text,
  p_share_code text default null,
  p_persona text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.product_events
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted public.product_events;
begin
  insert into public.product_events (event_name, share_code, persona, metadata)
  values (p_event_name, p_share_code, p_persona, coalesce(p_metadata, '{}'::jsonb))
  returning * into inserted;

  return inserted;
end;
$$;

create or replace function public.capture_market_lead(
  p_email text,
  p_name text default '',
  p_segment text default 'caregiver',
  p_source text default 'app',
  p_share_code text default null,
  p_message text default '',
  p_consent boolean default false,
  p_metadata jsonb default '{}'::jsonb
)
returns public.market_leads
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted public.market_leads;
begin
  insert into public.market_leads (email, name, segment, source, share_code, message, consent, metadata)
  values (
    lower(trim(p_email)),
    coalesce(p_name, ''),
    coalesce(p_segment, 'caregiver'),
    coalesce(p_source, 'app'),
    p_share_code,
    coalesce(p_message, ''),
    coalesce(p_consent, false),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (email, source)
  do update set
    name = excluded.name,
    segment = excluded.segment,
    share_code = excluded.share_code,
    message = excluded.message,
    consent = excluded.consent,
    metadata = excluded.metadata
  returning * into inserted;

  return inserted;
end;
$$;

grant execute on function public.capture_product_event(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.capture_market_lead(text, text, text, text, text, text, boolean, jsonb) to anon, authenticated;

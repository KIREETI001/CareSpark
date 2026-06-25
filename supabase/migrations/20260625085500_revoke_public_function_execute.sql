revoke execute on function public.capture_product_event(text, text, text, jsonb) from public;
revoke execute on function public.capture_market_lead(text, text, text, text, text, text, boolean, jsonb) from public;
revoke execute on function public.handle_new_user_profile() from public;

grant execute on function public.capture_product_event(text, text, text, jsonb) to service_role;
grant execute on function public.capture_market_lead(text, text, text, text, text, text, boolean, jsonb) to service_role;
grant execute on function public.handle_new_user_profile() to service_role;

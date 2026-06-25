import { createClient } from "@supabase/supabase-js";

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  };
}

export function getBearerToken(request) {
  const header = request.headers.authorization || request.headers.Authorization;
  const value = Array.isArray(header) ? header[0] : header;
  const match = typeof value === "string" ? value.match(/^Bearer\s+(.+)$/i) : null;
  return match?.[1] || "";
}

export async function getAuthenticatedProfile(request) {
  const token = getBearerToken(request);
  if (!token) return { user: null, profile: null, reason: "missing_authorization" };

  const { url, key } = getSupabaseConfig();
  if (!url || !key) return { user: null, profile: null, reason: "missing_supabase_config" };

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return { user: null, profile: null, reason: "invalid_authorization" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name,stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { user, profile: null, reason: "profile_lookup_failed" };
  }

  return { user, profile, reason: null };
}

export function allowStripeCustomerIdFromBody() {
  return process.env.STRIPE_ALLOW_CUSTOMER_ID_FROM_BODY === "true";
}

function hasStripePrice() {
  return Object.keys(process.env).some((key) => key === "STRIPE_PRICE_ID" || key.startsWith("STRIPE_PRICE_ID_"));
}

export default function handler(_request, response) {
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.status(200).json({
    ok: true,
    service: "CareSpark API",
    supabaseConfigured: Boolean(
      (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
        (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
    ),
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY && hasStripePrice()),
    serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}

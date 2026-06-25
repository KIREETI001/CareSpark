const DEFAULT_SUCCESS_PATH = "/?checkout=success&session_id={CHECKOUT_SESSION_ID}";
const DEFAULT_CANCEL_PATH = "/?checkout=cancelled";
const DEFAULT_PORTAL_RETURN_PATH = "/?billing=portal";

export function getBaseUrl(request) {
  const configured = process.env.APP_BASE_URL || process.env.VITE_APP_URL;
  if (configured) {
    try {
      return new URL(configured).origin.replace(/\/+$/, "");
    } catch {
      // Fall through to request headers when local env is malformed.
    }
  }

  const hostHeader = request.headers["x-forwarded-host"] || request.headers.host || "127.0.0.1:5173";
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  const forwardedProto = request.headers["x-forwarded-proto"];
  const proto =
    (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) ||
    (host.startsWith("127.0.0.1") || host.startsWith("localhost") ? "http" : "https");

  return `${proto}://${host}`.replace(/\/+$/, "");
}

function allowedOrigins(baseUrl) {
  const origins = new Set([new URL(baseUrl).origin]);
  const configured = process.env.APP_ALLOWED_REDIRECT_ORIGINS || "";

  for (const origin of configured.split(",")) {
    const trimmed = origin.trim();
    if (trimmed) origins.add(new URL(trimmed).origin);
  }

  return origins;
}

export function resolveAppUrl(candidate, baseUrl, fallbackPath) {
  const fallback = new URL(fallbackPath, baseUrl);
  if (!candidate) return fallback.href;

  try {
    const url = new URL(String(candidate), baseUrl);
    if (!allowedOrigins(baseUrl).has(url.origin)) return fallback.href;
    return url.href;
  } catch {
    return fallback.href;
  }
}

export function resolveCheckoutUrls(body, baseUrl) {
  return {
    successUrl: resolveAppUrl(body.successUrl || body.successPath, baseUrl, DEFAULT_SUCCESS_PATH),
    cancelUrl: resolveAppUrl(body.cancelUrl || body.cancelPath, baseUrl, DEFAULT_CANCEL_PATH),
  };
}

export function resolvePortalReturnUrl(body, baseUrl) {
  return resolveAppUrl(body.returnUrl || body.returnPath, baseUrl, DEFAULT_PORTAL_RETURN_PATH);
}

export function resolvePrice(body) {
  const planKey = String(body.planKey || body.plan || "default")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const normalizedPlanKey = planKey || "default";
  const specificEnvName = `STRIPE_PRICE_ID_${normalizedPlanKey.toUpperCase()}`;
  const priceId = process.env[specificEnvName] || process.env.STRIPE_PRICE_ID || "";
  const modeEnvName = `STRIPE_PRICE_MODE_${normalizedPlanKey.toUpperCase()}`;
  const configuredMode = String(process.env[modeEnvName] || "").toLowerCase();
  const mode = configuredMode === "payment" || normalizedPlanKey === "guided_setup" ? "payment" : "subscription";

  return { planKey: normalizedPlanKey, priceId, specificEnvName, mode };
}

export function missingCheckoutConfig({ priceId, specificEnvName }) {
  const missing = [];
  if (!process.env.STRIPE_SECRET_KEY) missing.push("STRIPE_SECRET_KEY");
  if (!priceId) missing.push(`${specificEnvName} or STRIPE_PRICE_ID`);
  return missing;
}

export function missingPortalConfig() {
  return process.env.STRIPE_SECRET_KEY ? [] : ["STRIPE_SECRET_KEY"];
}

export function buildPlaceholderSession({ type, url, missingConfig, planKey }) {
  return {
    configured: false,
    provider: "stripe",
    mode: "placeholder",
    missingConfig,
    [type]: {
      id: `placeholder_${type}_session`,
      object: type === "portal" ? "billing_portal.session" : `${type}.session`,
      url,
      planKey,
      status: "not_created",
    },
  };
}

export async function stripeRequest(path, body) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined && value !== null && value !== "") {
      form.append(key, String(value));
    }
  }

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${process.env.STRIPE_SECRET_KEY}:`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    const message = payload.error?.message || payload.raw || "Stripe request failed";
    const error = new Error(message);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

import { allowStripeCustomerIdFromBody, getAuthenticatedProfile } from "./_auth.js";
import { parseBody, send } from "./_supabase.js";
import {
  buildPlaceholderSession,
  getBaseUrl,
  missingPortalConfig,
  resolvePortalReturnUrl,
  stripeRequest,
} from "./_stripe.js";

export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      response.setHeader("allow", "POST");
      return send(response, 405, { error: "Method not allowed" });
    }

    const body = await parseBody(request);
    const baseUrl = getBaseUrl(request);
    const returnUrl = resolvePortalReturnUrl(body, baseUrl);
    const missingConfig = missingPortalConfig();

    if (missingConfig.length > 0) {
      return send(
        response,
        200,
        buildPlaceholderSession({
          type: "portal",
          url: returnUrl,
          missingConfig,
        }),
      );
    }

    const authContext = await getAuthenticatedProfile(request);
    const customerId = String(
      authContext.profile?.stripe_customer_id ||
        (allowStripeCustomerIdFromBody() ? body.customerId || body.stripeCustomerId : ""),
    ).trim();

    if (!customerId) {
      return send(response, 401, {
        error: "A signed-in profile with stripe_customer_id is required when Stripe is configured",
        provider: "stripe",
        reason: authContext.reason,
      });
    }

    const session = await stripeRequest("billing_portal/sessions", {
      customer: customerId,
      return_url: returnUrl,
      configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID || undefined,
    });

    return send(response, 200, {
      configured: true,
      provider: "stripe",
      mode: "live",
      portal: {
        id: session.id,
        object: session.object,
        url: session.url,
      },
    });
  } catch (error) {
    return send(response, error.statusCode || 500, {
      error: error instanceof Error ? error.message : "Unexpected server error",
      provider: "stripe",
      details: error.payload?.error || undefined,
    });
  }
}

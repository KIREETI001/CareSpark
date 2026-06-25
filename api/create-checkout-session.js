import { allowStripeCustomerIdFromBody, getAuthenticatedProfile } from "./_auth.js";
import { parseBody, send } from "./_supabase.js";
import {
  buildPlaceholderSession,
  getBaseUrl,
  missingCheckoutConfig,
  resolveCheckoutUrls,
  resolvePrice,
  stripeRequest,
} from "./_stripe.js";

function compactMetadata(metadata) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      response.setHeader("allow", "POST");
      return send(response, 405, { error: "Method not allowed" });
    }

    const body = await parseBody(request);
    const baseUrl = getBaseUrl(request);
    const { successUrl, cancelUrl } = resolveCheckoutUrls(body, baseUrl);
    const price = resolvePrice(body);
    const missingConfig = missingCheckoutConfig(price);

    if (missingConfig.length > 0) {
      const placeholderUrl = successUrl.replace("{CHECKOUT_SESSION_ID}", "placeholder_checkout_session");
      return send(
        response,
        200,
        buildPlaceholderSession({
          type: "checkout",
          url: placeholderUrl,
          missingConfig,
          planKey: price.planKey,
        }),
      );
    }

    const authContext = await getAuthenticatedProfile(request);
    const userId = authContext.user?.id || body.userId;
    const customerId =
      authContext.profile?.stripe_customer_id ||
      (allowStripeCustomerIdFromBody() ? body.customerId || body.stripeCustomerId : "");
    const metadata = compactMetadata({
      app: "carespark",
      plan_key: price.planKey,
      care_circle_id: body.careCircleId,
      user_id: userId,
    });

    const params = {
      mode: price.mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      "line_items[0][price]": price.priceId,
      "line_items[0][quantity]": "1",
      allow_promotion_codes: "true",
      client_reference_id: body.careCircleId || userId || undefined,
      customer: customerId || undefined,
      customer_email: customerId ? undefined : body.customerEmail || body.email || undefined,
      "metadata[app]": metadata.app,
      "metadata[plan_key]": metadata.plan_key,
      "metadata[care_circle_id]": metadata.care_circle_id,
      "metadata[user_id]": metadata.user_id,
    };

    if (price.mode === "subscription") {
      params["subscription_data[metadata][app]"] = metadata.app;
      params["subscription_data[metadata][plan_key]"] = metadata.plan_key;
      params["subscription_data[metadata][care_circle_id]"] = metadata.care_circle_id;
      params["subscription_data[metadata][user_id]"] = metadata.user_id;
    }

    const session = await stripeRequest("checkout/sessions", params);
    return send(response, 200, {
      configured: true,
      provider: "stripe",
      mode: "live",
      checkout: {
        id: session.id,
        object: session.object,
        url: session.url,
        planKey: price.planKey,
        status: session.status,
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

import { getSupabaseAdmin, parseBody, send } from "./_supabase.js";

export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      response.setHeader("allow", "POST");
      return send(response, 405, { error: "Method not allowed" });
    }

    const body = await parseBody(request);
    if (!body.email) return send(response, 400, { error: "email is required" });

    const { data, error } = await getSupabaseAdmin()
      .rpc("capture_market_lead", {
        p_email: String(body.email).trim().toLowerCase(),
        p_name: body.name || "",
        p_segment: body.segment || "caregiver",
        p_source: body.source || "app",
        p_share_code: body.shareCode || null,
        p_message: body.message || "",
        p_consent: Boolean(body.consent),
        p_metadata: body.metadata || {},
      })
      .single();

    if (error) return send(response, 500, { error: error.message });
    return send(response, 200, { lead: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    const status = message.includes("SUPABASE_SERVICE_ROLE_KEY") ? 503 : 500;
    return send(response, status, { error: message });
  }
}

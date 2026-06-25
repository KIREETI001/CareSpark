import { getSupabaseAdmin, parseBody, send } from "./_supabase.js";

export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      response.setHeader("allow", "POST");
      return send(response, 405, { error: "Method not allowed" });
    }

    const body = await parseBody(request);
    if (!body.eventName) return send(response, 400, { error: "eventName is required" });

    const { data, error } = await getSupabaseAdmin()
      .rpc("capture_product_event", {
        p_event_name: body.eventName,
        p_share_code: body.shareCode || null,
        p_persona: body.persona || null,
        p_metadata: body.metadata || {},
      })
      .single();
    if (error) return send(response, 500, { error: error.message });
    return send(response, 200, { event: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    const status = message.includes("SUPABASE_SERVICE_ROLE_KEY") ? 503 : 500;
    return send(response, status, { error: message });
  }
}

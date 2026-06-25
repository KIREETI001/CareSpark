import { getSupabaseAdmin, parseBody, send } from "./_supabase.js";

async function sendTwilioReminder({ to, message }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from || !to) {
    return { sent: false, provider: "placeholder", reason: "Twilio env vars or recipient missing" };
  }

  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: message,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    return { sent: false, provider: "twilio", reason: (await response.text()).slice(0, 240) };
  }

  const result = await response.json();
  return { sent: true, provider: "twilio", sid: result.sid };
}

export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      response.setHeader("allow", "POST");
      return send(response, 405, { error: "Method not allowed" });
    }

    const body = await parseBody(request);
    const message = body.message || `CareSpark reminder: ${body.title || "check the care plan"}`;
    const delivery = await sendTwilioReminder({ to: body.to, message });

    const payload = {
      share_code: body.shareCode || null,
      task_title: body.title || "CareSpark reminder",
      recipient: body.to || "",
      channel: body.channel || "sms",
      message,
      scheduled_for: body.scheduledFor || null,
      status: delivery.sent ? "sent" : "stored",
      provider_response: delivery,
    };

    const { data, error } = await getSupabaseAdmin().from("reminders").insert(payload).select("*").single();
    if (error) return send(response, 500, { error: error.message, delivery });
    return send(response, 200, { reminder: data, delivery });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    const status = message.includes("SUPABASE_SERVICE_ROLE_KEY") ? 503 : 500;
    return send(response, status, { error: message });
  }
}

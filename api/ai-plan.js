function send(response, status, payload) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(payload));
}

function fallbackPlan(profile = {}, score = 0) {
  const recipient = profile.recipientName || "the care recipient";
  const caregiver = profile.caregiverName || "the primary caregiver";
  const highRisk = score >= 70 || profile.stage === "crisis";
  return {
    mode: "fallback",
    summary: highRisk
      ? `${caregiver} should reduce load before adding more care tasks. The immediate priority is respite, backup coverage, and scheme activation.`
      : `${caregiver} has a workable base, but the plan should make hidden work visible before the next escalation.`,
    nextBestActions: [
      `Create a one-page brief for ${recipient}: meds, doctors, routines, risks, and emergency contacts.`,
      "Assign one family member to subsidy/service navigation and one to respite coverage.",
      "Check HCG, CTG, CHAS, ACP, AIC respite/services, HealthHub caregiver access, and mindline 1771 routing.",
      "Hold a 15-minute Sunday care review with named owners and due dates.",
    ],
    script: "I am not asking everyone to take over. I need each person to own one concrete task so this care system does not depend on one exhausted person.",
  };
}

export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      response.setHeader("allow", "POST");
      return send(response, 405, { error: "Method not allowed" });
    }

    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return send(response, 200, { plan: fallbackPlan(body.profile, body.score), configured: false });
    }

    const prompt = [
      "You are a Singapore caregiver navigation expert. Produce a concise, non-clinical care action plan.",
      "Do not diagnose. Route crisis mental health risk to national mindline 1771 or emergency services.",
      `Assessment: ${JSON.stringify(body).slice(0, 6000)}`,
    ].join("\n");

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: prompt,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return send(response, 200, {
        plan: fallbackPlan(body.profile, body.score),
        configured: true,
        warning: `OpenAI fallback used: ${errorText.slice(0, 240)}`,
      });
    }

    const result = await aiResponse.json();
    const text = result.output_text || result.output?.flatMap((item) => item.content || []).map((item) => item.text).join("\n") || "";
    return send(response, 200, {
      configured: true,
      plan: {
        mode: "ai",
        summary: text.trim() || fallbackPlan(body.profile, body.score).summary,
      },
    });
  } catch (error) {
    return send(response, 500, { error: error instanceof Error ? error.message : "Unexpected server error" });
  }
}

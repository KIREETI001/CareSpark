import { parseBody, send } from "./_supabase.js";

function fallbackReply(message = "") {
  const text = message.toLowerCase();
  if (text.includes("grant") || text.includes("hcg") || text.includes("ctg") || text.includes("chas")) {
    return "Start with Grants & bills. CareSpark highlights HCG, CTG, CHAS, CareShield Life, and planning routes, then links you to official source pages so you can verify eligibility quickly.";
  }
  if (text.includes("support") || text.includes("aic") || text.includes("respite") || text.includes("mindline")) {
    return "Open Support channels for AIC services, mindline 1771, Healthier SG, and Advance Care Planning. For urgent medical or safety concerns, use emergency services or your clinical care team.";
  }
  if (text.includes("price") || text.includes("plan") || text.includes("subscription")) {
    return "CareSpark starts with a free check. Family is for shared task coordination, Care Circle adds larger family access and reminder hooks, and Guided Setup helps overwhelmed families set up the first care rhythm.";
  }
  if (text.includes("community") || text.includes("alone") || text.includes("shame")) {
    return "The community layer is meant to reduce isolation. It helps caregivers ask for help clearly, share one care brief, and feel validated instead of carrying the whole situation privately.";
  }
  if (text.includes("document") || text.includes("claim") || text.includes("brief")) {
    return "Use Documents to prepare the one-page care brief, claims checklist, and appointment pack before stressful moments. The goal is to avoid rebuilding the same information during a crisis.";
  }
  if (text.includes("voice") || text.includes("elevenlabs")) {
    return "The voice layer can read care briefs aloud, support hands-free check-ins, and later power a conversational voice guide using ElevenLabs.";
  }
  return "I can help with grants, support channels, pricing, documents, community support, or adding tasks. To add a task, type something like: add task book GP appointment.";
}

export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      response.setHeader("allow", "POST");
      return send(response, 405, { error: "Method not allowed" });
    }

    const body = await parseBody(request);
    const message = String(body.message || "").slice(0, 1200);
    if (!message.trim()) return send(response, 400, { error: "message is required" });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return send(response, 200, { configured: false, reply: fallbackReply(message) });

    const prompt = [
      "You are CareSpark's product support assistant for caregivers in Singapore.",
      "Help users navigate CareSpark features, support pages, pricing, documents, family tasks, and wellbeing prompts.",
      "Do not provide medical, legal, financial, or emergency advice. Encourage official source verification and emergency services for urgent situations.",
      `User profile context: ${JSON.stringify(body.profile || {}).slice(0, 1500)}`,
      `Current score: ${body.score ?? "unknown"}`,
      `Existing tasks: ${JSON.stringify(body.tasks || []).slice(0, 1500)}`,
      `User message: ${message}`,
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
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      return send(response, 200, { configured: true, reply: fallbackReply(message) });
    }

    const result = await aiResponse.json();
    const reply = result.output_text || result.output?.flatMap((item) => item.content || []).map((item) => item.text).join("\n") || fallbackReply(message);
    return send(response, 200, { configured: true, reply: reply.trim() });
  } catch (error) {
    return send(response, 500, { error: error instanceof Error ? error.message : "Unexpected server error" });
  }
}

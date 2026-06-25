import { parseBody } from "./_supabase.js";

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(payload));
}

export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      response.setHeader("allow", "POST");
      return sendJson(response, 405, { error: "Method not allowed" });
    }

    const body = await parseBody(request);
    const text = String(body.text || "").slice(0, 1800).trim();
    if (!text) return sendJson(response, 400, { error: "text is required" });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;
    if (!apiKey || !voiceId) {
      return sendJson(response, 200, {
        configured: false,
        provider: "elevenlabs",
        message: "Voice mode is ready. Add ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID to enable speech.",
      });
    }

    const elevenResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        accept: "audio/mpeg",
        "content-type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_TTS_MODEL || "eleven_flash_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.1,
          use_speaker_boost: true,
        },
      }),
    });

    if (!elevenResponse.ok) {
      const detail = await elevenResponse.text();
      return sendJson(response, 502, {
        error: "ElevenLabs speech request failed",
        detail: detail.slice(0, 300),
      });
    }

    const arrayBuffer = await elevenResponse.arrayBuffer();
    response.statusCode = 200;
    response.setHeader("content-type", "audio/mpeg");
    response.setHeader("cache-control", "no-store");
    response.end(Buffer.from(arrayBuffer));
  } catch (error) {
    return sendJson(response, 500, { error: error instanceof Error ? error.message : "Unexpected server error" });
  }
}

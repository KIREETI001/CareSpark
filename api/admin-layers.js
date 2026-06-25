import { adminLayers } from "./_adminData.js";
import { send } from "./_supabase.js";

function bearerToken(request) {
  const header = request.headers.authorization || request.headers.Authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function allowedAdminEmails() {
  return new Set(
    String(process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function getSupabaseUser(accessToken) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Missing Supabase configuration");

  const response = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) return null;
  return response.json();
}

export default async function handler(request, response) {
  try {
    if (request.method !== "GET") {
      response.setHeader("allow", "GET");
      return send(response, 405, { error: "Method not allowed" });
    }

    const admins = allowedAdminEmails();
    if (admins.size === 0) {
      return send(response, 403, { error: "Founder access is not configured. Set ADMIN_EMAILS in Vercel." });
    }

    const token = bearerToken(request);
    if (!token) return send(response, 401, { error: "Sign in is required for founder access." });

    const user = await getSupabaseUser(token);
    const email = String(user?.email || "").toLowerCase();
    if (!email || !admins.has(email)) {
      return send(response, 403, { error: "This account is not allowed to access the founder workspace." });
    }

    return send(response, 200, { layers: adminLayers });
  } catch (error) {
    return send(response, 500, { error: error instanceof Error ? error.message : "Unexpected server error" });
  }
}

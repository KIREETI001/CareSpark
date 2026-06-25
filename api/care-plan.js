import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function riskScore(profile) {
  const hours = clamp((Number(profile.hoursPerWeek || 0) / 60) * 100);
  const sleep = (10 - Number(profile.sleepQuality || 5)) * 10;
  const emotional = Number(profile.emotionalLoad || 5) * 10;
  const isolation = (10 - Number(profile.familySupport || 5)) * 10;
  const money = Number(profile.financialStress || 5) * 10;
  const work = Number(profile.workStrain || 5) * 10;
  const stageBoost = profile.stage === "crisis" ? 16 : profile.stage === "escalating" ? 10 : 0;
  return Math.round(clamp(hours * 0.2 + sleep * 0.18 + emotional * 0.24 + isolation * 0.16 + money * 0.12 + work * 0.1 + stageBoost));
}

function riskBand(score) {
  if (score >= 75) return { label: "High burnout risk", tone: "danger", copy: "Protect the caregiver this week before adding more care tasks." };
  if (score >= 50) return { label: "Rising strain", tone: "warn", copy: "The system is starting to run hot. Add respite, role clarity, and scheme checks." };
  return { label: "Manageable for now", tone: "good", copy: "Keep the plan living and monitor warning signs before load spikes." };
}

function matchSchemes(profile) {
  const schemes = [
    {
      name: "Healthier SG and HealthHub caregiver access",
      tag: "Preventive care",
      why: profile.hasHealthierSg
        ? "A health home already exists. Make sure caregiver access and key records are usable."
        : "Creates a family doctor anchor and a baseline preventive health plan.",
      nextStep: "Confirm GP enrollment, screenings, vaccinations, and caregiver access in HealthHub.",
      priority: profile.hasHealthierSg ? "Medium" : "High",
    },
    {
      name: "Home Caregiving Grant (HCG)",
      tag: "Monthly care support",
      why: "Useful when daily care, helper support, transport, or respite costs are becoming regular.",
      nextStep: "Check ADL needs, household eligibility, and whether funds can support respite or home help.",
      priority: Number(profile.hoursPerWeek || 0) >= 20 || profile.condition === "dementia" ? "High" : "Medium",
    },
    {
      name: "Caregivers Training Grant (CTG)",
      tag: "Skills and helper training",
      why: profile.hasHelper
        ? "Can help train a family caregiver or helper for safer home care routines."
        : "Can reduce fear and mistakes by funding approved caregiver courses.",
      nextStep: "Shortlist one AIC-approved course for the highest-friction task at home.",
      priority: "High",
    },
    {
      name: "CHAS and subsidised primary care",
      tag: "Medical cost relief",
      why: "Reduces the friction of caregiver and care recipient GP visits, chronic care, and reviews.",
      nextStep: "Check card status and book overdue caregiver preventive care.",
      priority: Number(profile.financialStress || 0) >= 6 ? "High" : "Medium",
    },
    {
      name: "Advance Care Planning (ACP)",
      tag: "Decision clarity",
      why: profile.hasAcp
        ? "Review it as conditions change so decisions stay current."
        : "Reduces future family conflict and moral distress during escalation.",
      nextStep: "Start with values, preferred place of care, and nominated healthcare spokesperson.",
      priority: profile.hasAcp ? "Medium" : profile.stage === "crisis" || profile.condition === "palliative" ? "High" : "Medium",
    },
  ];

  if (profile.condition === "dementia" || profile.condition === "disability" || profile.stage === "escalating") {
    schemes.push({
      name: "AIC care services and respite pathways",
      tag: "Service navigation",
      why: "Day care, home care, respite, and referral pathways can reduce family overload.",
      nextStep: "Map one immediate service need and prepare documents for referral or enquiry.",
      priority: "High",
    });
  }

  if (Number(profile.workStrain || 0) >= 6) {
    schemes.push({
      name: "Workplace flexibility plan",
      tag: "Income protection",
      why: "Caregiving is already affecting work capacity, so informal coping may not hold.",
      nextStep: "Draft a temporary work arrangement request with schedule, backup, and review date.",
      priority: "High",
    });
  }

  return schemes.sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "High" ? -1 : 1));
}

function buildRoadmap(profile, score) {
  const steps = [
    {
      title: "Create the one-page care brief",
      body: `Summarise ${profile.recipientName || "the care recipient"}'s condition, doctors, meds, routines, risks, emergency contacts, and current care load.`,
      owner: profile.caregiverName || "Primary caregiver",
      time: "Today",
    },
    {
      title: "Protect the caregiver first",
      body:
        score >= 50
          ? "Block one fixed respite window, one sleep recovery action, and one person to call when strain spikes."
          : "Set a weekly check-in and watch sleep, resentment, brain fog, and isolation before they compound.",
      owner: profile.caregiverName || "Primary caregiver",
      time: "48 hours",
    },
    {
      title: "Match support before the next escalation",
      body: "Check HCG, CTG, CHAS, AIC services, HealthHub access, and ACP gaps against current needs.",
      owner: "Family lead",
      time: "This week",
    },
    {
      title: "Formalise the family operating rhythm",
      body: "Assign primary, backup, money, appointments, and respite owners. Review every Sunday for 15 minutes.",
      owner: "Care circle",
      time: "7 days",
    },
  ];

  if (profile.stage === "crisis") {
    steps.unshift({
      title: "Stabilise the next 72 hours",
      body: "Separate urgent clinical decisions from admin tasks. Use one shared list and one decision owner.",
      owner: "Care circle",
      time: "Now",
    });
  }

  return steps;
}

function bearerToken(request) {
  const header = request.headers.authorization || request.headers.Authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function getSupabase(request) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }
  const token = request ? bearerToken(request) : "";
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}

async function requireUser(request, supabase) {
  const token = bearerToken(request);
  if (!token) {
    const error = new Error("Sign in is required before saving private care plans.");
    error.statusCode = 401;
    throw error;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    const authError = new Error(error?.message || "Invalid session.");
    authError.statusCode = 401;
    throw authError;
  }
  return data.user;
}

function toDbPayload(plan) {
  const profile = plan.profile || {};
  const score = riskScore(profile);
  const band = riskBand(score);
  const schemes = matchSchemes(profile);
  const roadmap = buildRoadmap(profile, score);
  return {
    share_code: plan.shareCode,
    owner_id: plan.ownerId,
    care_circle_id: plan.careCircleId || null,
    caregiver_name: profile.caregiverName || "",
    recipient_name: profile.recipientName || "",
    relationship: profile.relationship || "",
    stage: profile.stage || "active",
    condition: profile.condition || "aging",
    hours_per_week: Number(profile.hoursPerWeek || 0),
    sleep_quality: Number(profile.sleepQuality || 5),
    emotional_load: Number(profile.emotionalLoad || 5),
    family_support: Number(profile.familySupport || 5),
    financial_stress: Number(profile.financialStress || 5),
    work_strain: Number(profile.workStrain || 5),
    has_helper: Boolean(profile.hasHelper),
    has_acp: Boolean(profile.hasAcp),
    has_healthier_sg: Boolean(profile.hasHealthierSg),
    has_care_plan: Boolean(profile.hasCarePlan),
    risk_score: score,
    risk_band: band.label,
    schemes,
    roadmap,
    tasks: Array.isArray(plan.tasks) ? plan.tasks : [],
    privacy_consent: Boolean(plan.privacyConsent),
  };
}

function fromDb(row) {
  return {
    id: row.id,
    shareCode: row.share_code,
    profile: {
      caregiverName: row.caregiver_name,
      recipientName: row.recipient_name,
      relationship: row.relationship,
      stage: row.stage,
      condition: row.condition,
      hoursPerWeek: row.hours_per_week,
      sleepQuality: row.sleep_quality,
      emotionalLoad: row.emotional_load,
      familySupport: row.family_support,
      financialStress: row.financial_stress,
      workStrain: row.work_strain,
      hasHelper: row.has_helper,
      hasAcp: row.has_acp,
      hasHealthierSg: row.has_healthier_sg,
      hasCarePlan: row.has_care_plan,
    },
    score: row.risk_score,
    riskBand: row.risk_band,
    schemes: row.schemes,
    roadmap: row.roadmap,
    tasks: row.tasks,
    updatedAt: row.updated_at,
  };
}

function send(response, status, payload) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(payload));
}

export default async function handler(request, response) {
  try {
    const url = new URL(request.url, "http://localhost");
    const supabase = getSupabase(request);
    const user = await requireUser(request, supabase);

    if (request.method === "GET") {
      const shareCode = url.searchParams.get("shareCode");
      if (!shareCode) return send(response, 400, { error: "shareCode is required" });

      const { data, error } = await supabase.from("care_plans").select("*").eq("share_code", shareCode).single();
      if (error) return send(response, error.code === "PGRST116" ? 404 : 500, { error: error.message });
      return send(response, 200, { plan: fromDb(data) });
    }

    if (request.method === "POST") {
      const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
      if (!body.shareCode) return send(response, 400, { error: "shareCode is required" });

      const payload = toDbPayload({ ...body, ownerId: user.id });
      const { data, error } = await supabase
        .from("care_plans")
        .upsert(payload, { onConflict: "share_code" })
        .select("*")
        .single();

      if (error) return send(response, 500, { error: error.message });
      return send(response, 200, { plan: fromDb(data) });
    }

    response.setHeader("allow", "GET, POST");
    return send(response, 405, { error: "Method not allowed" });
  } catch (error) {
    return send(response, 500, { error: error instanceof Error ? error.message : "Unexpected server error" });
  }
}

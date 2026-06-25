import {
  ArrowRight,
  Bell,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  CreditCard,
  ExternalLink,
  FileCheck2,
  HeartPulse,
  Home,
  LifeBuoy,
  LockKeyhole,
  LogOut,
  Mail,
  MessageCircleHeart,
  Phone,
  PiggyBank,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

type CareStage = "preparing" | "active" | "escalating" | "crisis";
type CareCondition = "aging" | "dementia" | "stroke" | "disability" | "mental-health" | "palliative";
type RecentEvent = "none" | "post-discharge" | "new-diagnosis" | "fall" | "worsening-symptoms" | "care-arrangement-change";
type PchiBand = "unknown" | "lte1500" | "lte3600" | "lte4800" | "gt4800";
type MobilityNeed = "none" | "walking-aid" | "wheelchair" | "hospital-bed" | "home-modification";
type TaskStatus = "todo" | "doing" | "done";
type View = "public" | "signin" | "app" | "pricing" | "admin" | "submission";
type AppSection = "dashboard" | "onboarding" | "grants" | "support" | "tasks" | "wellbeing" | "documents" | "community" | "settings";

type Profile = {
  caregiverName: string;
  recipientName: string;
  recipientAge: number;
  relationship: string;
  stage: CareStage;
  condition: CareCondition;
  diagnosis: string;
  recentEvent: RecentEvent;
  adlCount: number;
  medicationCount: number;
  warningSigns: string;
  mobilityNeed: MobilityNeed;
  pchiBand: PchiBand;
  isCitizen: boolean;
  multiProperty: boolean;
  hasMdw: boolean;
  careTeamMembers: string;
  hoursPerWeek: number;
  sleepQuality: number;
  emotionalLoad: number;
  familySupport: number;
  financialStress: number;
  workStrain: number;
  hasHelper: boolean;
  hasAcp: boolean;
  hasHealthierSg: boolean;
  hasCarePlan: boolean;
};

type Task = {
  id: string;
  title: string;
  owner: string;
  due: string;
  status: TaskStatus;
};

type ActionState = {
  tone: "idle" | "working" | "success" | "error";
  message: string;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type Resource = {
  title: string;
  tag: string;
  copy: string;
  href?: string;
};

type DirectoryCard = {
  id: string;
  section: AppSection;
  icon: React.ElementType;
  label: string;
  title: string;
  value: string;
  copy: string;
};

type AdminLayerPayload = {
  interviewLayers: string[];
  growthPlays: string[];
  integrationChecklist: string[];
  marketSignals: string[];
};

const defaultProfile: Profile = {
  caregiverName: "Alyssa",
  recipientName: "Mum",
  recipientAge: 76,
  relationship: "Adult child",
  stage: "active",
  condition: "dementia",
  diagnosis: "Dementia with rising night-time supervision needs",
  recentEvent: "worsening-symptoms",
  adlCount: 3,
  medicationCount: 4,
  warningSigns: "wandering at night, missed medication, sudden confusion",
  mobilityNeed: "walking-aid",
  pchiBand: "lte3600",
  isCitizen: true,
  multiProperty: false,
  hasMdw: false,
  careTeamMembers: "Brother, Sister",
  hoursPerWeek: 28,
  sleepQuality: 5,
  emotionalLoad: 7,
  familySupport: 4,
  financialStress: 6,
  workStrain: 6,
  hasHelper: false,
  hasAcp: false,
  hasHealthierSg: true,
  hasCarePlan: false,
};

const starterTasks: Task[] = [
  { id: "1", title: "Check HCG and CTG eligibility", owner: "Alyssa", due: "Today", status: "doing" },
  { id: "2", title: "Ask brother to cover Saturday morning", owner: "Brother", due: "Fri", status: "todo" },
  { id: "3", title: "Book GP review and update medication list", owner: "Alyssa", due: "This week", status: "todo" },
  { id: "4", title: "Add emergency contacts to shared care brief", owner: "Sister", due: "Done", status: "done" },
];

const conditionLabels: Record<CareCondition, string> = {
  aging: "Ageing parent",
  dementia: "Dementia or cognitive decline",
  stroke: "Stroke recovery",
  disability: "Disability / ADL support",
  "mental-health": "Mental health or addiction",
  palliative: "Palliative or end-of-life care",
};

const stageLabels: Record<CareStage, string> = {
  preparing: "Preparing",
  active: "Active care",
  escalating: "Needs rising",
  crisis: "Urgent reset",
};

const recentEventLabels: Record<RecentEvent, string> = {
  none: "No recent trigger",
  "post-discharge": "Recent hospital discharge",
  "new-diagnosis": "New diagnosis",
  fall: "Recent fall",
  "worsening-symptoms": "Symptoms are worsening",
  "care-arrangement-change": "Care arrangement changed",
};

const pchiBandLabels: Record<PchiBand, string> = {
  unknown: "Not sure yet",
  lte1500: "S$1,500 or below",
  lte3600: "S$1,501 to S$3,600",
  lte4800: "S$3,601 to S$4,800",
  gt4800: "Above S$4,800",
};

const mobilityNeedLabels: Record<MobilityNeed, string> = {
  none: "No major mobility need",
  "walking-aid": "Walking aid",
  wheelchair: "Wheelchair",
  "hospital-bed": "Hospital bed",
  "home-modification": "Home modification",
};

const grantResources = [
  {
    title: "Home Caregiving Grant",
    tag: "Likely worth checking",
    copy: "Monthly support may help with care costs if disability and means-test criteria are met.",
    href: "https://www.aic.sg/Financial-Assistance/Home-Caregiving-Grant",
  },
  {
    title: "Caregivers Training Grant",
    tag: "Quick win",
    copy: "Use approved training to make home routines safer and less stressful.",
    href: "https://www.aic.sg/Financial-Assistance/Caregivers-Training-Grant",
  },
  {
    title: "CHAS",
    tag: "Medical cost relief",
    copy: "Check subsidies for GP, dental, chronic disease, and selected specialist outpatient care.",
    href: "https://www.chas.sg/",
  },
  {
    title: "CareShield Life",
    tag: "Long-term care",
    copy: "Review severe disability protection and whether claims support should be prepared.",
    href: "https://www.careshieldlife.gov.sg/",
  },
];

const supportResources = [
  {
    title: "AIC care services",
    tag: "Service navigation",
    copy: "Explore home care, centre care, respite, and caregiver support options.",
    href: "https://www.aic.sg/Care-Services",
  },
  {
    title: "mindline 1771",
    tag: "Mental wellbeing",
    copy: "Use this as a low-friction route when stress, grief, anxiety, or overwhelm spikes.",
    href: "https://www.mindline.sg/",
  },
  {
    title: "Healthier SG",
    tag: "Primary care anchor",
    copy: "Review GP enrolment, preventive care, screenings, and caregiver self-care appointments.",
    href: "https://www.healthiersg.gov.sg/",
  },
  {
    title: "Advance Care Planning",
    tag: "Decision clarity",
    copy: "Prepare values, preferences, and decision roles before a future escalation.",
    href: "https://www.aic.sg/caregiving/advance-care-planning/",
  },
];

const pricingPlans = [
  {
    name: "Free Check",
    price: "S$0",
    cadence: "forever",
    audience: "For first clarity",
    features: ["7-minute load check", "Basic care brief", "Starter support map", "One saved plan"],
    cta: "Start free",
  },
  {
    name: "Family",
    price: "S$14.90",
    cadence: "per month",
    audience: "For one active care circle",
    features: ["Shared family task board", "Grant and claims checklist", "Calendar export", "3 family members"],
    cta: "Choose Family",
    featured: true,
  },
  {
    name: "Care Circle",
    price: "S$29.90",
    cadence: "per month",
    audience: "For families coordinating weekly care",
    features: ["8 family members", "WhatsApp reminder hooks", "Document vault ready", "Monthly wellbeing review"],
    cta: "Choose Care Circle",
  },
  {
    name: "Guided Setup",
    price: "S$99",
    cadence: "one time",
    audience: "For overwhelmed families",
    features: ["Assisted care plan setup", "Grant checklist prep", "Family role map", "First 7-day care rhythm"],
    cta: "Request setup",
  },
];

const evidenceSignals = [
  {
    value: "20.7%",
    label: "Singapore citizens aged 65+ in 2025",
    source: "Population.gov.sg",
    href: "https://www.population.gov.sg/our-population/population-trends/longevity/",
  },
  {
    value: "6.8h/day",
    label: "Typical local daily care load cited for caregivers",
    source: "NTUC Health",
    href: "https://ntuchealth.sg/elderly-care/resources/health-and-wellness/preventing-caregiver-burnout-self-care-and-respite-care",
  },
  {
    value: "1771",
    label: "National mindline route for mental wellbeing support",
    source: "MOH / mindline",
    href: "https://www.mindline.sg/",
  },
];

const submissionScores = [
  { area: "Challenge-Solution Fit", weight: "20%", score: "18/20", note: "Clear caregiver bottleneck: admin, family coordination, support discovery, and burnout prevention." },
  { area: "AI Leverage and Tech Execution", weight: "25%", score: "21/25", note: "OpenAI assistant, ElevenLabs voice brief, Supabase persistence, Stripe-ready billing, and task workflows." },
  { area: "Product Thinking and UI/UX", weight: "20%", score: "18/20", note: "Public education flow, secure sign-in, calm dashboard, clickable directories, and reduced dashboard clutter." },
  { area: "Originality and Insight", weight: "20%", score: "17/20", note: "Reframes caregiving as a shared operating system, not generic wellness advice." },
  { area: "Evidence of Real Demand", weight: "15%", score: "10/15", note: "Public research, proxy sentiment layers, and live pilot capture. Stronger after 3-5 real caregiver quotes." },
];

const submissionTools = ["OpenAI", "ElevenLabs", "Supabase", "Vercel", "Stripe", "Twilio", "Resend", "PostHog", "React", "Vite", "TypeScript"];

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function riskScore(profile: Profile) {
  const hours = clamp((profile.hoursPerWeek / 60) * 100);
  const sleep = (10 - profile.sleepQuality) * 10;
  const emotional = profile.emotionalLoad * 10;
  const isolation = (10 - profile.familySupport) * 10;
  const money = profile.financialStress * 10;
  const work = profile.workStrain * 10;
  const stageBoost = profile.stage === "crisis" ? 16 : profile.stage === "escalating" ? 10 : 0;
  const dependencyBoost = profile.adlCount >= 3 ? 8 : profile.adlCount >= 1 ? 4 : 0;
  const eventBoost = profile.recentEvent === "post-discharge" || profile.recentEvent === "fall" ? 6 : profile.recentEvent === "worsening-symptoms" ? 5 : 0;
  return Math.round(clamp(hours * 0.18 + sleep * 0.16 + emotional * 0.22 + isolation * 0.14 + money * 0.12 + work * 0.09 + stageBoost + dependencyBoost + eventBoost));
}

function riskBand(score: number) {
  if (score >= 75) return { label: "Needs relief now", tone: "danger", copy: "Start with respite, backup coverage, and support routing." };
  if (score >= 50) return { label: "Rising strain", tone: "warn", copy: "A few planned supports can prevent a crisis week." };
  return { label: "Stable for now", tone: "good", copy: "Keep checking in before the load spikes." };
}

function normalizeProfile(profile: Partial<Profile>): Profile {
  return { ...defaultProfile, ...profile };
}

function careTeamList(profile: Profile) {
  return profile.careTeamMembers
    .split(",")
    .map((member) => member.trim())
    .filter(Boolean);
}

function hcgAmount(profile: Profile) {
  if (profile.adlCount < 3) return "Check after ADL assessment";
  if (profile.multiProperty || profile.pchiBand === "lte4800") return "Likely S$200/month";
  if (profile.pchiBand === "lte1500") return "Likely S$600/month";
  if (profile.pchiBand === "lte3600") return "Likely S$400/month";
  if (profile.pchiBand === "gt4800") return "May exceed income threshold";
  return "S$200-S$600/month to verify";
}

function buildGrantResources(profile: Profile): Resource[] {
  const resources: Resource[] = [];
  const adl3 = profile.adlCount >= 3;
  const adl1 = profile.adlCount >= 1;
  const senior = profile.recipientAge >= 67;

  resources.push({
    title: "Home Caregiving Grant",
    tag: adl3 ? hcgAmount(profile) : "ADL assessment needed",
    copy: adl3
      ? `${profile.recipientName} needs help with ${profile.adlCount} ADLs, so HCG should be checked against household income and property criteria.`
      : "HCG usually requires permanent help with at least 3 of 6 Activities of Daily Living. Start by confirming ADL status.",
    href: "https://www.aic.sg/Financial-Assistance/Home-Caregiving-Grant",
  });

  resources.push({
    title: "Caregivers Training Grant",
    tag: profile.hasHelper ? "Train family/helper" : "Quick capability win",
    copy: profile.condition === "dementia"
      ? "Use approved dementia or home-care courses to make routines, communication, and safety less stressful."
      : "Use approved training to make home routines safer and reduce trial-and-error caregiving.",
    href: "https://www.aic.sg/Financial-Assistance/Caregivers-Training-Grant",
  });

  resources.push({
    title: "CHAS",
    tag: profile.pchiBand === "unknown" ? "Means-test check" : pchiBandLabels[profile.pchiBand],
    copy: "Check GP, dental, chronic disease, and specialist outpatient subsidies based on household income tier.",
    href: "https://www.chas.sg/",
  });

  if (adl3) {
    resources.push({
      title: "CareShield Life claim",
      tag: "Severe disability trigger",
      copy: `${profile.recipientName} may meet the 3-of-6 ADL trigger. Prepare assessment and claim documents before cashflow pressure builds.`,
      href: "https://www.careshieldlife.gov.sg/",
    });
  }

  if (profile.hasMdw || senior || adl1) {
    resources.push({
      title: "Migrant Domestic Worker Levy Concession",
      tag: profile.hasMdw ? "Potential monthly saving" : "Check if hiring help",
      copy: "Households with a senior aged 67+, child, or person needing ADL help may qualify for concessionary levy rates.",
      href: "https://www.mom.gov.sg/passes-and-permits/work-permit-for-foreign-domestic-worker/foreign-domestic-worker-levy/levy-concession",
    });
  }

  if (profile.mobilityNeed !== "none" || profile.condition === "stroke" || profile.condition === "disability") {
    resources.push({
      title: "Seniors' Mobility & Enabling Fund",
      tag: mobilityNeedLabels[profile.mobilityNeed],
      copy: "Check support for assistive devices, mobility aids, hospital beds, or home safety needs recommended by a provider.",
      href: "https://www.aic.sg/Financial-Assistance/Seniors-Mobility-and-Enabling-Fund---Mobility-and-Assistive-Devices",
    });
  }

  if (!profile.hasAcp || profile.stage === "escalating" || profile.stage === "crisis") {
    resources.push({
      title: "Advance Care Planning",
      tag: profile.hasAcp ? "Review preferences" : "Missing planning layer",
      copy: "Clarify care preferences and decision roles before the family is forced to decide under pressure.",
      href: "https://www.aic.sg/caregiving/advance-care-planning/",
    });
  }

  return resources;
}

function buildSupportResources(profile: Profile, score: number): Resource[] {
  const resources: Resource[] = [
    {
      title: "AIC care services",
      tag: profile.recentEvent === "post-discharge" ? "Post-discharge routing" : "Service navigation",
      copy: "Explore home care, centre care, respite, caregiver support, and care assessment routes matched to the current situation.",
      href: "https://www.aic.sg/Care-Services",
    },
  ];

  if (!profile.hasHealthierSg || profile.medicationCount > 0 || profile.condition === "aging") {
    resources.push({
      title: "Healthier SG / primary care anchor",
      tag: profile.hasHealthierSg ? "Use GP anchor" : "Set GP anchor",
      copy: `${profile.recipientName}'s GP can anchor medication reviews, screenings, chronic care, and caregiver self-care check-ins.`,
      href: "https://www.healthiersg.gov.sg/",
    });
  }

  if (profile.condition === "dementia") {
    resources.push({
      title: "Dementia-friendly care support",
      tag: "Condition-specific",
      copy: "Prioritize respite, routines, wandering risk planning, communication strategies, and caregiver training for dementia care.",
      href: "https://www.aic.sg/caregiving/",
    });
  }

  if (profile.recentEvent === "post-discharge" || profile.warningSigns.trim()) {
    resources.push({
      title: "HealthHub care records and discharge details",
      tag: "Medical context",
      copy: "Use HealthHub and discharge notes to keep medications, appointments, warning signs, and follow-up tasks consistent.",
      href: "https://www.healthhub.sg/",
    });
  }

  if (score >= 50 || profile.emotionalLoad >= 7 || profile.sleepQuality <= 5) {
    resources.push({
      title: "mindline 1771",
      tag: "Energy support",
      copy: "Use this when stress, grief, anxiety, sleep loss, or overwhelm spikes. It is a low-friction wellbeing route.",
      href: "https://www.mindline.sg/",
    });
  }

  if (profile.hasHelper || profile.hasMdw) {
    resources.push({
      title: "Helper handover and support",
      tag: "MDW support",
      copy: "Create a simple routine handover, training checklist, and support path so paid help is integrated safely into the family plan.",
      href: "https://www.aic.sg/Financial-Assistance/Caregivers-Training-Grant",
    });
  }

  return resources;
}

function buildDocumentResources(profile: Profile): Resource[] {
  const resources: Resource[] = [
    {
      title: `${profile.recipientName}'s one-page care brief`,
      tag: profile.hasCarePlan ? "Update existing" : "Create first",
      copy: `${conditionLabels[profile.condition]}, age ${profile.recipientAge || "not set"}, care stage ${stageLabels[profile.stage].toLowerCase()}, family roles, emergency contacts, and support routes.`,
    },
    {
      title: "Medication and appointment list",
      tag: `${profile.medicationCount} meds noted`,
      copy: profile.medicationCount > 0
        ? "Keep medication names, timing, prescribing clinic, refill dates, and appointment questions together."
        : "Add medications, supplements, allergies, and appointment questions before the next visit.",
    },
  ];

  if (profile.recentEvent === "post-discharge" || profile.warningSigns.trim()) {
    resources.push({
      title: "Discharge and warning-sign pack",
      tag: recentEventLabels[profile.recentEvent],
      copy: profile.warningSigns.trim()
        ? `Track warning signs to escalate: ${profile.warningSigns.trim()}.`
        : "Capture discharge diagnosis, wound care, diet, therapy, warning signs, and follow-up dates.",
    });
  }

  if (profile.adlCount >= 3 || profile.financialStress >= 6) {
    resources.push({
      title: "Claims and subsidy checklist",
      tag: "Money admin",
      copy: "Prepare ID documents, assessment reports, invoices, referral letters, bank details, and household income information.",
    });
  }

  if (careTeamList(profile).length > 0) {
    resources.push({
      title: "Family WhatsApp digest",
      tag: `${careTeamList(profile).length + 1} people`,
      copy: "Turn today's open tasks, warning signs, and support checks into one shareable family update.",
    });
  }

  return resources;
}

function buildCommunityResources(profile: Profile, score: number): Resource[] {
  return [
    {
      title: profile.familySupport <= 4 ? "Ask for named help" : "Keep family aligned",
      tag: profile.familySupport <= 4 ? "Low support signal" : "Weekly rhythm",
      copy: profile.familySupport <= 4
        ? "Use one specific ask instead of a broad plea: transport, documents, respite block, bill check, or appointment note-taking."
        : "Use a weekly care-circle check-in to prevent one person from quietly absorbing the load again.",
    },
    {
      title: profile.condition === "dementia" ? "Dementia peer support prompts" : "Peer support prompts",
      tag: "Validation",
      copy: "Share what is hard, what worked, and what you need next without shame or judgment.",
    },
    {
      title: score >= 75 ? "Escalate to respite or counselling" : "Partner handoff when load rises",
      tag: score >= 75 ? "Relief now" : "Next layer",
      copy: "When the load is too high, route the family toward respite, counselling, care training, or provider support.",
    },
  ];
}

function buildWellbeingActions(profile: Profile, score: number) {
  const actions: string[] = [];
  if (profile.hoursPerWeek >= 25) actions.push("Block a named respite window before the next heavy care day");
  if (profile.familySupport <= 4) actions.push("Ask one person for one named task instead of broad help");
  if (profile.sleepQuality <= 5) actions.push("Protect one sleep recovery block and move a night task to another helper");
  if (profile.emotionalLoad >= 7 || score >= 50) actions.push("Use mindline 1771 or a GP check-in before overwhelm becomes normal");
  if (profile.hasHelper || profile.hasMdw) actions.push("Write a short helper handover so mental load does not stay with you");
  if (actions.length < 4) actions.push("Write down one task you can stop owning this week");
  return actions.slice(0, 4);
}

function buildInitialTasks(profile: Profile, score: number): Task[] {
  const owner = profile.caregiverName || "Family lead";
  const helper = careTeamList(profile)[0] || "Family";
  const tasks: Task[] = [
    {
      id: `generated-grants-${crypto.randomUUID().slice(0, 6)}`,
      title: `Check ${profile.recipientName}'s grant and claims matches`,
      owner,
      due: "Today",
      status: "doing",
    },
    {
      id: `generated-brief-${crypto.randomUUID().slice(0, 6)}`,
      title: `Create ${profile.recipientName}'s one-page care brief`,
      owner,
      due: "This week",
      status: "todo",
    },
    {
      id: `generated-family-${crypto.randomUUID().slice(0, 6)}`,
      title: `Ask ${helper} to own one fixed care task`,
      owner: helper,
      due: "3 days",
      status: "todo",
    },
  ];

  if (profile.recentEvent === "post-discharge") {
    tasks.splice(1, 0, {
      id: `generated-discharge-${crypto.randomUUID().slice(0, 6)}`,
      title: "Turn discharge notes into meds, warning signs, and follow-up tasks",
      owner,
      due: "Today",
      status: "todo",
    });
  }

  if (profile.adlCount >= 3) {
    tasks.push({
      id: `generated-adl-${crypto.randomUUID().slice(0, 6)}`,
      title: "Book or locate ADL assessment documents for HCG / CareShield",
      owner,
      due: "This week",
      status: "todo",
    });
  }

  if (score >= 50) {
    tasks.push({
      id: `generated-respite-${crypto.randomUUID().slice(0, 6)}`,
      title: "Block one respite or recovery window before the next heavy care day",
      owner: helper,
      due: "This week",
      status: "todo",
    });
  }

  return tasks.slice(0, 6);
}

function mergeGeneratedTasks(current: Task[], generated: Task[]) {
  const starterIds = new Set(["1", "2", "3", "4"]);
  const nonGenerated = current.filter((task) => !task.id.startsWith("generated-") && !starterIds.has(task.id));
  return [...generated, ...nonGenerated].slice(0, 12);
}

function buildDirectoryCards(profile: Profile, score: number, tasks: Task[]): DirectoryCard[] {
  const grants = buildGrantResources(profile);
  const supports = buildSupportResources(profile, score);
  const documents = buildDocumentResources(profile);
  const openTasks = tasks.filter((task) => task.status !== "done").length;
  const helpers = careTeamList(profile).length + 1;

  return [
    {
      id: "grants",
      section: "grants",
      icon: PiggyBank,
      label: "Grants & bills",
      title: "Likely support to check",
      value: `${grants.length} matches`,
      copy: `${hcgAmount(profile)}, CTG, CHAS${profile.adlCount >= 3 ? ", CareShield" : ""}.`,
    },
    {
      id: "support",
      section: "support",
      icon: LifeBuoy,
      label: "Support channels",
      title: "Help paths ready",
      value: `${supports.length} routes`,
      copy: `${recentEventLabels[profile.recentEvent]}, ${conditionLabels[profile.condition].toLowerCase()}, care navigation.`,
    },
    {
      id: "family",
      section: "tasks",
      icon: Users,
      label: "Family circle",
      title: "Shared load",
      value: `${helpers} people`,
      copy: `${openTasks} open tasks for ${profile.recipientName}; assign the next concrete help request.`,
    },
    {
      id: "wellbeing",
      section: "wellbeing",
      icon: HeartPulse,
      label: "Energy check",
      title: riskBand(score).label,
      value: `${score}/100`,
      copy: `Care hours ${profile.hoursPerWeek}/wk, sleep ${profile.sleepQuality}/10, support ${profile.familySupport}/10.`,
    },
    {
      id: "documents",
      section: "documents",
      icon: FileCheck2,
      label: "Documents",
      title: "Prepared once",
      value: documents.length > 3 ? "Claim pack" : "Care brief",
      copy: `${profile.medicationCount} meds, ${profile.adlCount} ADLs, ${recentEventLabels[profile.recentEvent].toLowerCase()}.`,
    },
    {
      id: "community",
      section: "community",
      icon: MessageCircleHeart,
      label: "Community",
      title: profile.familySupport <= 4 ? "Ask earlier" : "Keep support warm",
      value: profile.familySupport <= 4 ? "Low support" : "Circles",
      copy: "Prompts for family support and peer validation without shame.",
    },
  ];
}

function loadState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function loadProfile() {
  return normalizeProfile(loadState<Partial<Profile>>("carespark-profile", defaultProfile));
}

function createShareCode() {
  const existing = localStorage.getItem("carespark-share-code");
  if (existing) return existing;
  const code = `care-${crypto.randomUUID().slice(0, 8)}`;
  localStorage.setItem("carespark-share-code", code);
  return code;
}

async function requestJson(path: string, options?: RequestInit) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options?.headers || {}),
    },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}

function authHeader(session: Session | null) {
  return session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {};
}

function routeFromPath(): View {
  const path = window.location.pathname;
  if (path.startsWith("/signin")) return "signin";
  if (path.startsWith("/app")) return "app";
  if (path.startsWith("/pricing")) return "pricing";
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/submission")) return "submission";
  return "public";
}

function appSectionFromPath(): AppSection {
  const path = window.location.pathname;
  if (path.includes("/app/onboarding")) return "onboarding";
  if (path.includes("/app/grants")) return "grants";
  if (path.includes("/app/tasks")) return "tasks";
  if (path.includes("/app/support")) return "support";
  if (path.includes("/app/wellbeing")) return "wellbeing";
  if (path.includes("/app/documents")) return "documents";
  if (path.includes("/app/community")) return "community";
  if (path.includes("/app/settings")) return "settings";
  return "dashboard";
}

function setRoute(view: View) {
  const paths: Record<View, string> = {
    public: "/",
    signin: "/signin",
    app: "/app/dashboard",
    pricing: "/pricing",
    admin: "/admin",
    submission: "/submission",
  };
  window.history.pushState({}, "", paths[view]);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function setAppRoute(section: AppSection) {
  const paths: Record<AppSection, string> = {
    dashboard: "/app/dashboard",
    onboarding: "/app/onboarding",
    grants: "/app/grants",
    tasks: "/app/tasks",
    support: "/app/support",
    wellbeing: "/app/wellbeing",
    documents: "/app/documents",
    community: "/app/community",
    settings: "/app/settings",
  };
  window.history.pushState({}, "", paths[section]);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function planKeyFor(planName: string) {
  return planName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function App() {
  const [view, setView] = useState<View>(() => routeFromPath());
  const [appSection, setAppSection] = useState<AppSection>(() => appSectionFromPath());
  const [session, setSession] = useState<Session | null>(null);
  const [demoMode, setDemoMode] = useState(() => localStorage.getItem("carespark-demo") === "true");
  const [onboardingComplete, setOnboardingComplete] = useState(() => localStorage.getItem("carespark-onboarding-complete") === "true");
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const [tasks, setTasks] = useState<Task[]>(() => loadState("carespark-tasks", starterTasks));
  const [shareCode, setShareCode] = useState(() => createShareCode());
  const [email, setEmail] = useState("");
  const [authState, setAuthState] = useState<ActionState>({ tone: "idle", message: "Sign in with your email to access your private care dashboard." });
  const [appState, setAppState] = useState<ActionState>({ tone: "idle", message: "Your care plan is saved privately when you choose Save." });

  const score = useMemo(() => riskScore(profile), [profile]);
  const band = riskBand(score);
  const isSignedIn = Boolean(session || demoMode);

  useEffect(() => {
    const onPop = () => {
      setView(routeFromPath());
      setAppSection(appSectionFromPath());
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => localStorage.setItem("carespark-profile", JSON.stringify(profile)), [profile]);
  useEffect(() => localStorage.setItem("carespark-tasks", JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem("carespark-share-code", shareCode), [shareCode]);
  useEffect(() => localStorage.setItem("carespark-demo", String(demoMode)), [demoMode]);
  useEffect(() => localStorage.setItem("carespark-onboarding-complete", String(onboardingComplete)), [onboardingComplete]);

  useEffect(() => {
    if (view === "app" && isSignedIn && !onboardingComplete && appSection === "dashboard") {
      setAppRoute("onboarding");
    }
  }, [appSection, isSignedIn, onboardingComplete, view]);

  const go = (next: View) => setRoute(next);

  const signIn = async () => {
    if (!email.trim()) return;
    setAuthState({ tone: "working", message: "Sending secure sign-in link..." });
    if (!supabase) {
      setAuthState({ tone: "error", message: "Supabase auth keys are not available in this environment." });
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/app/onboarding` },
    });
    setAuthState(error ? { tone: "error", message: error.message } : { tone: "success", message: "Check your email for a secure sign-in link." });
  };

  const enterDemo = () => {
    setDemoMode(true);
    setAppRoute("onboarding");
  };

  const completeOnboarding = () => {
    setTasks((current) => mergeGeneratedTasks(current, buildInitialTasks(profile, score)));
    setOnboardingComplete(true);
    setAppState({ tone: "success", message: "Your first care map is ready. Review the dashboard, then save when you are ready." });
    setAppRoute("dashboard");
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setDemoMode(false);
    go("public");
  };

  const savePlan = async () => {
    if (!session || demoMode) {
      setAppState({ tone: "idle", message: "Demo changes stay on this browser. Sign in to save a private care plan." });
      return;
    }
    setAppState({ tone: "working", message: "Saving your care plan..." });
    try {
      await requestJson("/api/care-plan", {
        method: "POST",
        headers: authHeader(session),
        body: JSON.stringify({ shareCode, profile, tasks, privacyConsent: true }),
      });
      setAppState({ tone: "success", message: "Saved. Your care circle can continue from the same plan." });
    } catch (error) {
      setAppState({ tone: "error", message: error instanceof Error ? error.message : "Could not save plan." });
    }
  };

  const checkout = async (planName: string) => {
    setAppState({ tone: "working", message: `Preparing ${planName} checkout...` });
    try {
      const payload = await requestJson("/api/create-checkout-session", {
        method: "POST",
        headers: authHeader(session),
        body: JSON.stringify({
          planName,
          planKey: planKeyFor(planName),
          email: session?.user.email || email,
          userId: session?.user.id,
          shareCode,
          successPath: "/app/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}",
          cancelPath: "/pricing?checkout=cancelled",
        }),
      });
      if (payload.url) window.location.href = payload.url;
      setAppState({ tone: "success", message: payload.message || "Checkout placeholder is ready for Stripe keys." });
    } catch (error) {
      setAppState({ tone: "error", message: error instanceof Error ? error.message : "Checkout is not ready yet." });
    }
  };

  if (view === "signin") {
    return <SignInPage email={email} setEmail={setEmail} authState={authState} onSignIn={signIn} onDemo={enterDemo} go={go} />;
  }

  if (view === "app") {
    return isSignedIn ? (
      <AppDashboard
        profile={profile}
        setProfile={setProfile}
        tasks={tasks}
        setTasks={setTasks}
        score={score}
        band={band}
        shareCode={shareCode}
        setShareCode={setShareCode}
        state={appState}
        onSave={savePlan}
        onCheckout={checkout}
        onSignOut={signOut}
        demoMode={demoMode}
        onboardingComplete={onboardingComplete}
        onCompleteOnboarding={completeOnboarding}
        section={appSection}
        setSection={(section) => setAppRoute(section)}
      />
    ) : (
      <SignInPage email={email} setEmail={setEmail} authState={authState} onSignIn={signIn} onDemo={enterDemo} go={go} />
    );
  }

  if (view === "pricing") {
    return <PricingPage go={go} onCheckout={checkout} state={appState} />;
  }

  if (view === "admin") {
    return session ? <AdminPage go={go} session={session} /> : <SignInPage email={email} setEmail={setEmail} authState={authState} onSignIn={signIn} onDemo={enterDemo} go={go} />;
  }

  if (view === "submission") {
    return <SubmissionPage go={go} />;
  }

  return <PublicSite go={go} />;
}

function PublicSite({ go }: { go: (view: View) => void }) {
  return (
    <main className="site-shell">
      <PublicNav go={go} />
      <section className="marketing-hero">
        <div className="hero-text">
          <p className="eyebrow"><Sparkles size={16} /> Caregiving support, made lighter</p>
          <h1>Get the next step sorted, without carrying everything alone.</h1>
          <p>
            CareSpark helps families plan care, check likely support, share tasks, and protect caregiver energy so you can spend more time showing love and less time chasing admin.
          </p>
          <div className="hero-actions">
            <button className="primary-action" type="button" onClick={() => go("signin")}>Start free check <ArrowRight size={18} /></button>
            <button className="ghost-action" type="button" onClick={() => go("pricing")}>See plans</button>
          </div>
        </div>
        <div className="journey-card">
          <p className="status-pill good">7-minute start</p>
          <h2>Your care map</h2>
          <div className="journey-steps">
            <StepDone text="Understand caregiver load" />
            <StepDone text="See likely grants and support" />
            <StepDone text="Invite family into one shared plan" />
            <StepDone text="Set reminders before things slip" />
          </div>
        </div>
      </section>

      <section className="promise-band">
        <h2>One calm place for the parts of care that usually scatter everywhere.</h2>
        <p>CareSpark does not replace doctors, social workers, or family. It helps you prepare, coordinate, and ask for help earlier.</p>
      </section>

      <section className="benefit-grid">
        <Benefit icon={PiggyBank} title="Find support you may qualify for" copy="Check grants, care training, subsidies, insurance routes, and practical next steps in plain language." />
        <Benefit icon={Users} title="Share the load with family" copy="Turn vague offers of help into named tasks, reminders, and a care plan everyone can understand." />
        <Benefit icon={HeartPulse} title="Protect your energy" copy="Track strain gently and get small resilience actions before burnout becomes the default." />
      </section>

      <EvidenceSection />

      <section className="how-section" id="how">
        <div>
          <p className="eyebrow">How onboarding feels</p>
          <h2>A short guided setup, not another task on your schedule.</h2>
        </div>
        <div className="how-list">
          <ProcessStep number="1" title="Tell us what is happening" copy="A few questions about care stage, support, money strain, and your energy." />
          <ProcessStep number="2" title="Get a personalized care map" copy="See relevant grants, support routes, family tasks, documents, and wellbeing actions." />
          <ProcessStep number="3" title="Bring your circle in" copy="Invite family members so care coordination stops living in one person's head." />
        </div>
      </section>

      <section className="community-section">
        <div>
          <p className="eyebrow"><MessageCircleHeart size={16} /> Community support</p>
          <h2>Caregivers deserve to feel seen, not ashamed.</h2>
          <p>Build a care circle, ask for help clearly, and connect with people who understand the emotional weight of the journey.</p>
        </div>
        <button className="primary-action" type="button" onClick={() => go("signin")}>Create your care circle</button>
      </section>

      <VoicePreview />
      <LeadCapture />
      <PricingPreview go={go} />
      <PolicyStrip />
      <FooterNav go={go} />
    </main>
  );
}

function EvidenceSection() {
  return (
    <section className="evidence-section" aria-label="CareSpark evidence">
      <div>
        <p className="eyebrow"><ShieldCheck size={16} /> Why this matters now</p>
        <h2>Caregiver stress is not a niche edge case. It is a planning gap families feel every week.</h2>
        <p>CareSpark uses public Singapore support routes and caregiver sentiment patterns to turn scattered worry into specific next actions.</p>
      </div>
      <div className="evidence-grid">
        {evidenceSignals.map((signal) => (
          <a className="signal-card" href={signal.href} target="_blank" rel="noreferrer" key={signal.label}>
            <strong>{signal.value}</strong>
            <span>{signal.label}</span>
            <small>{signal.source} <ExternalLink size={13} /></small>
          </a>
        ))}
      </div>
    </section>
  );
}

function VoicePreview() {
  const [state, setState] = useState<ActionState>({ tone: "idle", message: "Try the sponsor-ready voice brief during your demo." });
  const [isWorking, setIsWorking] = useState(false);

  const playVoice = async () => {
    setIsWorking(true);
    setState({ tone: "working", message: "Preparing a short caregiver voice brief..." });
    try {
      const response = await fetch("/api/elevenlabs-speech", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: "CareSpark voice brief. Your care plan is ready. Start with one support route, one family task, and one recovery action this week.",
        }),
      });
      const contentType = response.headers.get("content-type") || "";
      if (response.ok && contentType.includes("audio")) {
        const blob = await response.blob();
        const audio = new Audio(URL.createObjectURL(blob));
        await audio.play();
        setState({ tone: "success", message: "Playing ElevenLabs voice brief." });
        return;
      }
      const payload = await response.json();
      setState({ tone: response.ok ? "idle" : "error", message: payload.message || payload.error || "Voice brief is not available yet." });
    } catch {
      setState({ tone: "error", message: "Voice brief could not start. Check the ElevenLabs key and voice ID." });
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <section className="voice-section">
      <div>
        <p className="eyebrow"><Bot size={16} /> Voice support layer</p>
        <h2>Hands-free care briefs for overloaded moments.</h2>
        <p>ElevenLabs turns CareSpark from a screen-only planner into a voice-guided companion for caregivers who are cooking, commuting, or coordinating care in the middle of a stressful day.</p>
      </div>
      <div className="voice-actions">
        <button className="primary-action" type="button" onClick={playVoice} disabled={isWorking}>Play voice brief</button>
        <p className={`state-message ${state.tone}`}>{state.message}</p>
      </div>
    </section>
  );
}

function LeadCapture() {
  const [email, setEmail] = useState("");
  const [segment, setSegment] = useState("family-caregiver");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(true);
  const [state, setState] = useState<ActionState>({ tone: "idle", message: "Collect pilot interest here to strengthen real-demand evidence." });

  const submitLead = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      setState({ tone: "error", message: "Add an email so we can register the pilot signal." });
      return;
    }
    if (!consent) {
      setState({ tone: "error", message: "Consent is needed before we store pilot interest." });
      return;
    }
    setState({ tone: "working", message: "Saving pilot interest..." });
    try {
      await requestJson("/api/lead", {
        method: "POST",
        body: JSON.stringify({
          email,
          segment,
          source: "public_pilot_waitlist",
          message,
          consent,
          metadata: { route: window.location.pathname, intent: "pilot-demand-validation" },
        }),
      });
      setEmail("");
      setMessage("");
      setState({ tone: "success", message: "Saved. This is now a real pilot-demand signal for your submission." });
    } catch (error) {
      localStorage.setItem("carespark-pilot-interest", JSON.stringify({ email, segment, message, consent, capturedAt: new Date().toISOString() }));
      setState({ tone: "error", message: error instanceof Error ? `Stored locally for now: ${error.message}` : "Stored locally for now. Backend capture needs checking." });
    }
  };

  return (
    <section className="lead-section">
      <div>
        <p className="eyebrow"><Mail size={16} /> Pilot access</p>
        <h2>Want help setting up the first care rhythm?</h2>
        <p>Join the pilot list and share the one thing that feels heaviest right now. CareSpark uses this to prioritize the next support workflow.</p>
      </div>
      <form className="lead-box" onSubmit={submitLead}>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        </label>
        <label>
          I am a
          <select value={segment} onChange={(event) => setSegment(event.target.value)}>
            <option value="family-caregiver">Family caregiver</option>
            <option value="care-provider">Care provider</option>
            <option value="employer-hr">Employer / HR lead</option>
            <option value="partner">Potential partner</option>
          </select>
        </label>
        <label className="lead-message">
          What feels hardest to manage?
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="e.g. grants, siblings, hospital admin, burnout, reminders..." />
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          I agree to be contacted about the CareSpark pilot.
        </label>
        <button className="primary-action full" type="submit">Join pilot list</button>
        <p className={`state-message ${state.tone}`}>{state.message}</p>
      </form>
    </section>
  );
}

function SubmissionPage({ go }: { go: (view: View) => void }) {
  const totalScore = submissionScores.reduce((sum, row) => sum + Number(row.score.split("/")[0]), 0);

  return (
    <main className="site-shell submission-shell">
      <PublicNav go={go} />
      <section className="submission-hero">
        <p className="eyebrow"><Sparkles size={16} /> Hackathon submission</p>
        <h1>CareSpark turns caregiver overwhelm into a shared care operating system.</h1>
        <p>
          A Singapore-focused caregiver support MVP with secure care-plan storage, AI assistance, ElevenLabs voice briefs, official support routing, family task coordination, and Stripe-ready subscription paths.
        </p>
        <div className="hero-actions">
          <button className="primary-action" type="button" onClick={() => go("signin")}>Open demo dashboard <ArrowRight size={18} /></button>
          <a className="ghost-action" href="https://the-first-spark.vercel.app" target="_blank" rel="noreferrer">Live link <ExternalLink size={17} /></a>
        </div>
      </section>

      <section className="submission-grid">
        <article className="workspace-panel">
          <SectionTitle icon={<Users />} title="Problem and target user" subtitle="Who CareSpark serves first." />
          <p className="soft-copy">
            Working adult children and family leads often become the invisible operating layer for eldercare: grants, claims, appointments, family coordination, documents, respite, and emotional strain all land on one person.
          </p>
          <p className="soft-copy">
            CareSpark targets Singapore family caregivers first, with later B2B2C routes through employers, care providers, insurers, and community partners.
          </p>
        </article>
        <article className="workspace-panel">
          <SectionTitle icon={<Bot />} title="Solution summary" subtitle="Two-minute judge read." />
          <p className="soft-copy">
            CareSpark gives caregivers a calm onboarding flow, then creates a personalized dashboard with clickable support directories, a shared family task board, caregiver energy prompts, document preparation, and community support.
          </p>
          <p className="soft-copy">
            OpenAI handles natural-language service guidance and task creation; ElevenLabs adds hands-free voice briefs; Supabase keeps private care plans and pilot signals; Stripe, Twilio, Resend, and PostHog are ready for growth and monetization.
          </p>
        </article>
      </section>

      <section className="workspace-panel">
        <SectionTitle icon={<ShieldCheck />} title="Judging score projection" subtitle={`Current self-audit: ${totalScore}/100 after this upgrade.`} />
        <div className="score-table" role="table" aria-label="Judging score projection">
          <div className="score-row header" role="row">
            <span>Area</span>
            <span>Weight</span>
            <span>Score</span>
            <span>Why</span>
          </div>
          {submissionScores.map((row) => (
            <div className="score-row" role="row" key={row.area}>
              <span>{row.area}</span>
              <span>{row.weight}</span>
              <strong>{row.score}</strong>
              <span>{row.note}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="submission-grid">
        <article className="workspace-panel">
          <SectionTitle icon={<ClipboardList />} title="Demo path" subtitle="Keep the video under 3 minutes." />
          <ol className="submission-list">
            <li>Open the public site and explain the caregiver problem in one sentence.</li>
            <li>Click Start free check, then View demo dashboard.</li>
            <li>Click the six directory cards to show grants, support, tasks, wellbeing, documents, and community.</li>
            <li>Use Ask CareSpark to add a task and answer a service question.</li>
            <li>Play the ElevenLabs voice brief and close with the subscription/pricing path.</li>
          </ol>
        </article>
        <article className="workspace-panel">
          <SectionTitle icon={<CreditCard />} title="Tools used" subtitle="Sponsor and architecture coverage." />
          <div className="tool-chip-grid">
            {submissionTools.map((tool) => <span key={tool}>{tool}</span>)}
          </div>
        </article>
      </section>

      <section className="workspace-panel">
        <SectionTitle icon={<FileCheck2 />} title="Submission checklist" subtitle="Copy this into the portal and attach the repo materials." />
        <div className="submission-checklist">
          <SupportRow title="Project name and team" tag="Required" copy="CareSpark. Team: Kiree, founder/product/full-stack. Add additional teammate names in the submission form if applicable." />
          <SupportRow title="Problem statement and target user" tag="Required" copy="Family caregivers are overloaded by fragmented care admin, financial support discovery, and invisible family coordination work." />
          <SupportRow title="Demo video" tag="Required" copy="Record the 5-step demo path above. Keep it to 2:30-2:50 so the final value proposition has room to breathe." />
          <SupportRow title="Live demo link" tag="Required" copy="Submit https://the-first-spark.vercel.app and optionally add https://the-first-spark.vercel.app/submission for judges." href="https://the-first-spark.vercel.app/submission" />
          <SupportRow title="Pitch deck" tag="Required" copy="Use the 10-slide outline in docs/project-submission-pack.md." />
          <SupportRow title="Architecture and feedback" tag="Required" copy="Attach the repo, screenshots, submission pack, and any waitlist/user quote evidence collected before upload." />
        </div>
      </section>

      <FooterNav go={go} />
    </main>
  );
}

function SignInPage({
  email,
  setEmail,
  authState,
  onSignIn,
  onDemo,
  go,
}: {
  email: string;
  setEmail: (value: string) => void;
  authState: ActionState;
  onSignIn: () => void;
  onDemo: () => void;
  go: (view: View) => void;
}) {
  return (
    <main className="auth-shell">
      <button className="text-button" type="button" onClick={() => go("public")}>CareSpark</button>
      <section className="auth-card">
        <p className="eyebrow"><LockKeyhole size={16} /> Private care dashboard</p>
        <h1>Sign in to continue your care plan.</h1>
        <p>Use a secure email link. New care circles begin with a short setup before the dashboard opens.</p>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        </label>
        <button className="primary-action full" type="button" onClick={onSignIn}>Send secure link</button>
        <button className="ghost-action full" type="button" onClick={onDemo}>Start demo onboarding</button>
        <p className={`state-message ${authState.tone}`}>{authState.message}</p>
      </section>
    </main>
  );
}

function AppDashboard({
  profile,
  setProfile,
  tasks,
  setTasks,
  score,
  band,
  shareCode,
  setShareCode,
  state,
  onSave,
  onCheckout,
  onSignOut,
  demoMode,
  onboardingComplete,
  onCompleteOnboarding,
  section,
  setSection,
}: {
  profile: Profile;
  setProfile: (profile: Profile) => void;
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  score: number;
  band: ReturnType<typeof riskBand>;
  shareCode: string;
  setShareCode: (value: string) => void;
  state: ActionState;
  onSave: () => void;
  onCheckout: (planName: string) => void;
  onSignOut: () => void;
  demoMode: boolean;
  onboardingComplete: boolean;
  onCompleteOnboarding: () => void;
  section: AppSection;
  setSection: (section: AppSection) => void;
}) {
  const directoryCards = useMemo(() => buildDirectoryCards(profile, score, tasks), [profile, score, tasks]);
  const grantMatches = useMemo(() => buildGrantResources(profile), [profile]);
  const supportMatches = useMemo(() => buildSupportResources(profile, score), [profile, score]);
  const documentNeeds = useMemo(() => buildDocumentResources(profile), [profile]);
  const communityPrompts = useMemo(() => buildCommunityResources(profile, score), [profile, score]);

  const addTask = (title: string) => {
    if (!title.trim()) return;
    setTasks([{ id: crypto.randomUUID(), title: title.trim(), owner: profile.caregiverName || "Family", due: "Next", status: "todo" }, ...tasks]);
  };

  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand"><HeartPulse size={20} /> CareSpark</div>
        <button className={section === "dashboard" ? "active-nav" : ""} type="button" onClick={() => setSection("dashboard")}>Overview</button>
        <button className={section === "onboarding" ? "active-nav" : ""} type="button" onClick={() => setSection("onboarding")}>Onboarding</button>
        <button className={section === "grants" ? "active-nav" : ""} type="button" onClick={() => setSection("grants")}>Grants & bills</button>
        <button className={section === "support" ? "active-nav" : ""} type="button" onClick={() => setSection("support")}>Support channels</button>
        <button className={section === "tasks" ? "active-nav" : ""} type="button" onClick={() => setSection("tasks")}>Family board</button>
        <button className={section === "wellbeing" ? "active-nav" : ""} type="button" onClick={() => setSection("wellbeing")}>Wellbeing</button>
        <button className={section === "documents" ? "active-nav" : ""} type="button" onClick={() => setSection("documents")}>Documents</button>
        <button className={section === "community" ? "active-nav" : ""} type="button" onClick={() => setSection("community")}>Community</button>
        <button className={section === "settings" ? "active-nav" : ""} type="button" onClick={() => setSection("settings")}>Settings</button>
        <button className="text-button" type="button" onClick={onSignOut}><LogOut size={16} /> Sign out</button>
      </aside>

      <section className="app-main">
        <div className="app-topbar">
          <div>
            <p className="eyebrow">{demoMode ? "Demo care circle" : "Private care circle"}</p>
            <h1>{section === "onboarding" ? "Let us set up your first care map." : `Good evening, ${profile.caregiverName}. Here is what needs attention first.`}</h1>
          </div>
          <div className="topbar-actions">
            <label className="compact-field">
              Care code
              <input value={shareCode} onChange={(event) => setShareCode(event.target.value)} />
            </label>
            <button className="primary-action" type="button" onClick={onSave}>Save plan</button>
          </div>
        </div>
        <p className={`state-message ${state.tone}`}>{state.message}</p>

        {section === "dashboard" && (
          <section className="directory-grid" id="overview">
            {directoryCards.map((item) => {
              const Icon = item.icon;
              return (
                <button className="directory-card" type="button" key={item.id} onClick={() => setSection(item.section)}>
                  <Icon size={22} />
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.copy}</small>
                </button>
              );
            })}
          </section>
        )}

        {section === "dashboard" && <CareMapStrip profile={profile} score={score} />}

        {section === "onboarding" && (
          <OnboardingPanel
            profile={profile}
            setProfile={setProfile}
            score={score}
            band={band}
            onboardingComplete={onboardingComplete}
            onComplete={onCompleteOnboarding}
          />
        )}

        {section === "dashboard" && (
          <TaskBoardPanel profile={profile} tasks={tasks} setTasks={setTasks} onAddTask={addTask} />
        )}

        {section === "grants" && (
          <ResourcePanel
            icon={<PiggyBank />}
            title="Grants & bills"
            subtitle={`Personalized from ${profile.recipientName}'s ADL, income, age, mobility, and support context.`}
            resources={grantMatches}
          />
        )}

        {section === "support" && (
          <ResourcePanel
            icon={<LifeBuoy />}
            title="Support channels"
            subtitle={`Routes matched to ${recentEventLabels[profile.recentEvent].toLowerCase()} and ${conditionLabels[profile.condition].toLowerCase()}.`}
            resources={supportMatches}
          />
        )}

        {section === "tasks" && (
          <TaskBoardPanel profile={profile} tasks={tasks} setTasks={setTasks} onAddTask={addTask} />
        )}

        {section === "wellbeing" && <WellbeingPanel profile={profile} score={score} band={band} />}

        {section === "documents" && <DocumentsPanel profile={profile} resources={documentNeeds} />}

        {section === "community" && <CommunityPanel resources={communityPrompts} />}

        {section === "settings" && (
          <SettingsPanel profile={profile} setProfile={setProfile} onCheckout={onCheckout} />
        )}
      </section>
      <CareAssistant profile={profile} score={score} tasks={tasks} onAddTask={addTask} setSection={setSection} />
    </main>
  );
}

function OnboardingPanel({
  profile,
  setProfile,
  score,
  band,
  onboardingComplete,
  onComplete,
}: {
  profile: Profile;
  setProfile: (profile: Profile) => void;
  score: number;
  band: ReturnType<typeof riskBand>;
  onboardingComplete: boolean;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const steps = ["Care situation", "Patient details", "Eligibility clues", "Support in place", "Caregiver load", "First care map"];
  const progress = Math.round(((step + 1) / steps.length) * 100);

  const next = () => setStep((current) => Math.min(current + 1, steps.length - 1));
  const back = () => setStep((current) => Math.max(current - 1, 0));

  return (
    <section className="onboarding-page">
      <article className="workspace-panel onboarding-panel">
        <div className="onboarding-head">
          <div>
            <p className="eyebrow"><Sparkles size={16} /> 7-minute onboarding</p>
            <h2>{steps[step]}</h2>
            <p>Answer only what helps CareSpark create the first usable care map. You can refine everything later.</p>
          </div>
          <div className="progress-card" aria-label={`Onboarding progress ${progress}%`}>
            <strong>{progress}%</strong>
            <span>{step + 1} of {steps.length}</span>
          </div>
        </div>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>

        {step === 0 && (
          <div className="onboarding-step">
            <div className="form-grid">
              <TextField label="Your name" value={profile.caregiverName} onChange={(value) => setProfile({ ...profile, caregiverName: value })} />
              <TextField label="Care recipient" value={profile.recipientName} onChange={(value) => setProfile({ ...profile, recipientName: value })} />
              <NumberField label="Care recipient age" value={profile.recipientAge} onChange={(value) => setProfile({ ...profile, recipientAge: value })} />
              <TextField label="Relationship" value={profile.relationship} onChange={(value) => setProfile({ ...profile, relationship: value })} />
              <label>
                Care stage
                <select value={profile.stage} onChange={(event) => setProfile({ ...profile, stage: event.target.value as CareStage })}>
                  {Object.entries(stageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>
                Main situation
                <select value={profile.condition} onChange={(event) => setProfile({ ...profile, condition: event.target.value as CareCondition })}>
                  {Object.entries(conditionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
            <div className="onboarding-note">
              <ShieldCheck size={18} />
              <span>CareSpark uses this to tailor grants, support routes, document prompts, and family tasks. It is planning support, not medical advice.</span>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-step">
            <div className="form-grid">
              <TextAreaField label="Diagnosis or care context" value={profile.diagnosis} onChange={(value) => setProfile({ ...profile, diagnosis: value })} placeholder="e.g. dementia, stroke recovery, recent hip fracture, diabetes..." />
              <label>
                Recent trigger
                <select value={profile.recentEvent} onChange={(event) => setProfile({ ...profile, recentEvent: event.target.value as RecentEvent })}>
                  {Object.entries(recentEventLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <RangeField label="Current medications to track" value={profile.medicationCount} min={0} max={12} suffix=" meds" onChange={(value) => setProfile({ ...profile, medicationCount: value })} />
              <label>
                Main mobility need
                <select value={profile.mobilityNeed} onChange={(event) => setProfile({ ...profile, mobilityNeed: event.target.value as MobilityNeed })}>
                  {Object.entries(mobilityNeedLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <TextAreaField label="Warning signs or things family must watch" value={profile.warningSigns} onChange={(value) => setProfile({ ...profile, warningSigns: value })} placeholder="e.g. wandering, glucose spikes, wound redness, breathlessness..." />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <div className="range-grid">
              <RangeField label="ADLs needing help" value={profile.adlCount} min={0} max={6} suffix="/6" onChange={(value) => setProfile({ ...profile, adlCount: value })} />
              <label>
                Household income per person
                <select value={profile.pchiBand} onChange={(event) => setProfile({ ...profile, pchiBand: event.target.value as PchiBand })}>
                  {Object.entries(pchiBandLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
            <div className="choice-grid">
              <ToggleRow label={`${profile.recipientName || "Care recipient"} is a Singapore Citizen`} checked={profile.isCitizen} onChange={(checked) => setProfile({ ...profile, isCitizen: checked })} />
              <ToggleRow label="Household owns more than one property" checked={profile.multiProperty} onChange={(checked) => setProfile({ ...profile, multiProperty: checked })} />
              <ToggleRow label="We employ or plan to employ a migrant domestic worker" checked={profile.hasMdw} onChange={(checked) => setProfile({ ...profile, hasMdw: checked })} />
            </div>
            <div className="onboarding-note">
              <PiggyBank size={18} />
              <span>These clues help CareSpark prioritize HCG, CareShield, CHAS, mobility support, MDW levy concession, and claims prep. Final eligibility must still be confirmed with official sources.</span>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-step">
            <div className="choice-grid">
              <ToggleRow label="We already have a helper or regular paid support" checked={profile.hasHelper} onChange={(checked) => setProfile({ ...profile, hasHelper: checked })} />
              <ToggleRow label="Advance Care Planning has been discussed or completed" checked={profile.hasAcp} onChange={(checked) => setProfile({ ...profile, hasAcp: checked })} />
              <ToggleRow label="Care recipient is enrolled or likely enrolled in Healthier SG" checked={profile.hasHealthierSg} onChange={(checked) => setProfile({ ...profile, hasHealthierSg: checked })} />
              <ToggleRow label="There is already a written care plan or shared document" checked={profile.hasCarePlan} onChange={(checked) => setProfile({ ...profile, hasCarePlan: checked })} />
            </div>
            <TextField label="Family members or helpers to involve" value={profile.careTeamMembers} onChange={(value) => setProfile({ ...profile, careTeamMembers: value })} placeholder="e.g. Brother, Sister, Helper, Auntie Mary" />
            <div className="support-list">
              <SupportRow title="What this unlocks" tag="Personalized" copy="CareSpark will avoid repeating support you already have and bring missing routes like ACP, grants, respite, or care training forward." />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="onboarding-step">
            <div className="range-grid">
              <RangeField label="Care hours per week" value={profile.hoursPerWeek} min={0} max={80} suffix="h" onChange={(value) => setProfile({ ...profile, hoursPerWeek: value })} />
              <RangeField label="Sleep quality" value={profile.sleepQuality} min={1} max={10} suffix="/10" onChange={(value) => setProfile({ ...profile, sleepQuality: value })} />
              <RangeField label="Emotional load" value={profile.emotionalLoad} min={1} max={10} suffix="/10" onChange={(value) => setProfile({ ...profile, emotionalLoad: value })} />
              <RangeField label="Family support" value={profile.familySupport} min={1} max={10} suffix="/10" onChange={(value) => setProfile({ ...profile, familySupport: value })} />
              <RangeField label="Financial stress" value={profile.financialStress} min={1} max={10} suffix="/10" onChange={(value) => setProfile({ ...profile, financialStress: value })} />
              <RangeField label="Work strain" value={profile.workStrain} min={1} max={10} suffix="/10" onChange={(value) => setProfile({ ...profile, workStrain: value })} />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="onboarding-step care-map-preview">
            <div className="care-score-card">
              <span>Caregiver energy</span>
              <strong>{score}/100</strong>
              <p>{band.label}: {band.copy}</p>
            </div>
            <div className="support-list">
              {buildGrantResources(profile).slice(0, 2).map((resource) => <SupportRow key={resource.title} title={resource.title} tag={resource.tag} copy={resource.copy} href={resource.href} />)}
              {buildInitialTasks(profile, score).slice(0, 2).map((task) => <SupportRow key={task.title} title={task.title} tag={task.due} copy={`Owner: ${task.owner}. This will appear on the family task board.`} />)}
            </div>
          </div>
        )}

        <div className="onboarding-actions">
          <button className="ghost-action" type="button" onClick={back} disabled={step === 0}>Back</button>
          {step < steps.length - 1 ? (
            <button className="primary-action" type="button" onClick={next}>Continue <ArrowRight size={18} /></button>
          ) : (
            <button className="primary-action" type="button" onClick={onComplete}>{onboardingComplete ? "Update dashboard" : "Create my dashboard"} <ArrowRight size={18} /></button>
          )}
        </div>
      </article>
    </section>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="toggle-row">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="range-field">
      <span>{label}</span>
      <div className="range-value">
        <input type="number" min={min} max={max} value={value} onChange={(event) => onChange(clamp(Number(event.target.value || min), min, max))} />
        <strong>{suffix}</strong>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function CareMapStrip({ profile, score }: { profile: Profile; score: number }) {
  const team = careTeamList(profile);
  return (
    <section className="care-map-strip" aria-label="Personalized care map summary">
      <div>
        <span>Care recipient</span>
        <strong>{profile.recipientName}, {profile.recipientAge || "age not set"}</strong>
        <small>{conditionLabels[profile.condition]} - {recentEventLabels[profile.recentEvent]}</small>
      </div>
      <div>
        <span>Dependency</span>
        <strong>{profile.adlCount}/6 ADLs</strong>
        <small>{profile.adlCount >= 3 ? "HCG / CareShield trigger to check" : "Confirm ADL assessment if needs rise"}</small>
      </div>
      <div>
        <span>Household check</span>
        <strong>{pchiBandLabels[profile.pchiBand]}</strong>
        <small>{profile.isCitizen ? "Singapore Citizen route" : "Check PR/foreigner eligibility separately"}</small>
      </div>
      <div>
        <span>Care circle</span>
        <strong>{team.length + 1} people</strong>
        <small>{score >= 50 ? "Assign relief early" : "Keep weekly check-in warm"}</small>
      </div>
    </section>
  );
}

function TaskBoardPanel({
  profile,
  tasks,
  setTasks,
  onAddTask,
}: {
  profile: Profile;
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  onAddTask: (title: string) => void;
}) {
  const [newTask, setNewTask] = useState("");

  const submitTask = () => {
    if (!newTask.trim()) return;
    onAddTask(newTask);
    setNewTask("");
  };

  return (
    <section className="overview-board">
      <article className="workspace-panel task-panel" id="tasks">
        <SectionTitle icon={<ClipboardList />} title="Family task board" subtitle="Shared coordination for everyone helping with care." />
        <div className="task-input">
          <label className="compact-field">
            Add task
            <input value={newTask} onChange={(event) => setNewTask(event.target.value)} placeholder="e.g. submit HCG documents" />
          </label>
          <button type="button" onClick={submitTask} aria-label="Add task"><ChevronRight size={18} /></button>
        </div>
        <div className="task-board">
          {(["todo", "doing", "done"] as TaskStatus[]).map((status) => (
            <div className="task-lane" key={status}>
              <h3>{status === "todo" ? "To do" : status === "doing" ? "Doing" : "Done"}</h3>
              {tasks.filter((task) => task.status === status).map((task) => (
                <article className="task" key={task.id}>
                  <p>{task.title}</p>
                  <small>{task.owner || profile.caregiverName} - {task.due}</small>
                  <div className="task-actions">
                    {(["todo", "doing", "done"] as TaskStatus[]).map((next) => (
                      <button type="button" key={next} className={task.status === next ? "selected" : ""} onClick={() => setTasks(tasks.map((item) => item.id === task.id ? { ...item, status: next } : item))}>{next}</button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function ResourcePanel({
  icon,
  title,
  subtitle,
  resources,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  resources: Resource[];
}) {
  return (
    <section className="detail-page">
      <article className="workspace-panel support-panel">
        <SectionTitle icon={icon} title={title} subtitle={subtitle} />
        <div className="support-list">
          {resources.map((resource) => (
            <SupportRow key={resource.title} title={resource.title} tag={resource.tag} copy={resource.copy} href={resource.href} />
          ))}
        </div>
      </article>
    </section>
  );
}

function WellbeingPanel({ profile, score, band }: { profile: Profile; score: number; band: ReturnType<typeof riskBand> }) {
  const actions = buildWellbeingActions(profile, score);
  return (
    <section className="detail-page">
      <article className="workspace-panel wellbeing-card">
        <SectionTitle icon={<HeartPulse />} title="Caregiver energy" subtitle="A gentle weekly signal, not a judgment." />
        <div className="score-compact">
          <strong>{score}</strong>
          <span>{band.label}</span>
        </div>
        <p>{band.copy}</p>
        <div className="energy-actions">
          {actions.map((action) => <span key={action}>{action}</span>)}
        </div>
      </article>
    </section>
  );
}

function DocumentsPanel({ profile, resources }: { profile: Profile; resources: Resource[] }) {
  return (
    <section className="detail-page">
      <article className="workspace-panel">
        <SectionTitle icon={<FileCheck2 />} title="Documents" subtitle={`Prepared around ${profile.recipientName}'s condition, medication count, ADL needs, and recent event.`} />
        <div className="support-list">
          {resources.map((resource) => <SupportRow key={resource.title} title={resource.title} tag={resource.tag} copy={resource.copy} href={resource.href} />)}
        </div>
      </article>
    </section>
  );
}

function CommunityPanel({ resources }: { resources: Resource[] }) {
  return (
    <section className="detail-page">
      <article className="workspace-panel">
        <SectionTitle icon={<MessageCircleHeart />} title="Community" subtitle="A safer way to ask for help and feel less alone in the caregiving journey." />
        <div className="support-list">
          {resources.map((resource) => <SupportRow key={resource.title} title={resource.title} tag={resource.tag} copy={resource.copy} href={resource.href} />)}
        </div>
      </article>
    </section>
  );
}

function SettingsPanel({
  profile,
  setProfile,
  onCheckout,
}: {
  profile: Profile;
  setProfile: (profile: Profile) => void;
  onCheckout: (planName: string) => void;
}) {
  return (
    <section className="detail-page settings-page">
      <article className="workspace-panel" id="plan">
        <SectionTitle icon={<Home />} title="Care profile" subtitle="Keep details ready once, so they are not rebuilt during crisis." />
        <div className="form-grid app-form">
          <TextField label="Caregiver" value={profile.caregiverName} onChange={(value) => setProfile({ ...profile, caregiverName: value })} />
          <TextField label="Care recipient" value={profile.recipientName} onChange={(value) => setProfile({ ...profile, recipientName: value })} />
          <NumberField label="Care recipient age" value={profile.recipientAge} onChange={(value) => setProfile({ ...profile, recipientAge: value })} />
          <label>
            Care stage
            <select value={profile.stage} onChange={(event) => setProfile({ ...profile, stage: event.target.value as CareStage })}>
              {Object.entries(stageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            Situation
            <select value={profile.condition} onChange={(event) => setProfile({ ...profile, condition: event.target.value as CareCondition })}>
              {Object.entries(conditionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <TextAreaField label="Diagnosis or care context" value={profile.diagnosis} onChange={(value) => setProfile({ ...profile, diagnosis: value })} />
          <label>
            Recent trigger
            <select value={profile.recentEvent} onChange={(event) => setProfile({ ...profile, recentEvent: event.target.value as RecentEvent })}>
              {Object.entries(recentEventLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <RangeField label="ADLs needing help" value={profile.adlCount} min={0} max={6} suffix="/6" onChange={(value) => setProfile({ ...profile, adlCount: value })} />
          <RangeField label="Medication count" value={profile.medicationCount} min={0} max={12} suffix=" meds" onChange={(value) => setProfile({ ...profile, medicationCount: value })} />
          <label>
            Household income per person
            <select value={profile.pchiBand} onChange={(event) => setProfile({ ...profile, pchiBand: event.target.value as PchiBand })}>
              {Object.entries(pchiBandLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            Main mobility need
            <select value={profile.mobilityNeed} onChange={(event) => setProfile({ ...profile, mobilityNeed: event.target.value as MobilityNeed })}>
              {Object.entries(mobilityNeedLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <TextField label="Family members or helpers" value={profile.careTeamMembers} onChange={(value) => setProfile({ ...profile, careTeamMembers: value })} />
          <TextAreaField label="Warning signs" value={profile.warningSigns} onChange={(value) => setProfile({ ...profile, warningSigns: value })} />
        </div>
        <div className="choice-grid settings-choice-grid">
          <ToggleRow label="Singapore Citizen" checked={profile.isCitizen} onChange={(checked) => setProfile({ ...profile, isCitizen: checked })} />
          <ToggleRow label="More than one property" checked={profile.multiProperty} onChange={(checked) => setProfile({ ...profile, multiProperty: checked })} />
          <ToggleRow label="MDW employed or planned" checked={profile.hasMdw} onChange={(checked) => setProfile({ ...profile, hasMdw: checked })} />
          <ToggleRow label="Advance Care Planning done" checked={profile.hasAcp} onChange={(checked) => setProfile({ ...profile, hasAcp: checked })} />
        </div>
        <button className="ghost-action full" type="button"><CalendarDays size={18} /> Calendar sync ready</button>
        <button className="ghost-action full" type="button"><Phone size={18} /> WhatsApp reminders ready</button>
        <button className="primary-action full" type="button" onClick={() => onCheckout("Family")}>Upgrade family plan</button>
      </article>
    </section>
  );
}

function extractTaskIntent(text: string) {
  const trimmed = text.trim();
  const direct = trimmed.match(/^(?:please\s+)?(?:add|create)\s+(?:a\s+)?task[:\s-]*(.+)$/i);
  const reminder = trimmed.match(/^(?:please\s+)?remind(?: me| us)? to\s+(.+)$/i);
  return (direct?.[1] || reminder?.[1] || "").trim();
}

function CareAssistant({
  profile,
  score,
  tasks,
  onAddTask,
  setSection,
}: {
  profile: Profile;
  score: number;
  tasks: Task[];
  onAddTask: (title: string) => void;
  setSection: (section: AppSection) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [voiceState, setVoiceState] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi, I can help you add family tasks, find the right support page, or explain how CareSpark works.",
    },
  ]);

  const addMessage = (message: Omit<ChatMessage, "id">) => {
    setMessages((current) => [...current, { ...message, id: crypto.randomUUID() }]);
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    addMessage({ role: "user", text });

    const taskText = extractTaskIntent(text);
    if (taskText) {
      onAddTask(taskText);
      addMessage({ role: "assistant", text: `Added "${taskText}" to the family task board. You can move it between To do, Doing, and Done.` });
      return;
    }

    setIsWorking(true);
    try {
      const payload = await requestJson("/api/chat-assistant", {
        method: "POST",
        body: JSON.stringify({ message: text, profile, score, tasks }),
      });
      addMessage({ role: "assistant", text: payload.reply });
    } catch (error) {
      addMessage({ role: "assistant", text: error instanceof Error ? error.message : "I could not answer that just now." });
    } finally {
      setIsWorking(false);
    }
  };

  const readBriefAloud = async () => {
    setVoiceState("Preparing voice brief...");
    const text = `CareSpark summary for ${profile.caregiverName}. Current caregiver energy score is ${score}. Start with one family task, one support route, and one recovery action this week.`;
    try {
      const response = await fetch("/api/elevenlabs-speech", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("audio")) {
        const blob = await response.blob();
        const audio = new Audio(URL.createObjectURL(blob));
        await audio.play();
        setVoiceState("Playing voice brief.");
        return;
      }
      const payload = await response.json();
      setVoiceState(payload.message || "Voice mode is ready for ElevenLabs keys.");
    } catch {
      setVoiceState("Voice mode could not start yet.");
    }
  };

  return (
    <div className={isOpen ? "assistant-layer open" : "assistant-layer"}>
      {isOpen && (
        <section className="assistant-panel" aria-label="CareSpark assistant">
          <div className="assistant-header">
            <div>
              <p className="eyebrow"><Bot size={15} /> CareSpark guide</p>
              <h2>Ask for help without leaving the plan.</h2>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close assistant"><X size={18} /></button>
          </div>
          <div className="assistant-quick-actions">
            <button type="button" onClick={() => setSection("grants")}>Find grants</button>
            <button type="button" onClick={() => setSection("support")}>Support channels</button>
            <button type="button" onClick={() => setSection("tasks")}>Task board</button>
            <button type="button" onClick={readBriefAloud}>Read brief aloud</button>
          </div>
          {voiceState && <p className="assistant-note">{voiceState}</p>}
          <div className="assistant-messages">
            {messages.map((message) => (
              <p className={message.role === "assistant" ? "assistant-bubble" : "assistant-bubble user"} key={message.id}>{message.text}</p>
            ))}
            {isWorking && <p className="assistant-bubble">Thinking through the care map...</p>}
          </div>
          <div className="assistant-input">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendMessage();
              }}
              placeholder="Ask about grants, pricing, or add a task..."
            />
            <button type="button" onClick={sendMessage} aria-label="Send message"><Send size={18} /></button>
          </div>
        </section>
      )}
      <button className="assistant-launcher" type="button" onClick={() => setIsOpen((current) => !current)} aria-label="Ask CareSpark">
        <Bot size={20} />
        <span>Ask CareSpark</span>
      </button>
    </div>
  );
}

function PricingPage({ go, onCheckout, state }: { go: (view: View) => void; onCheckout: (plan: string) => void; state: ActionState }) {
  return (
    <main className="site-shell">
      <PublicNav go={go} />
      <section className="pricing-hero">
        <p className="eyebrow"><CreditCard size={16} /> Simple pricing</p>
        <h1>Start free. Upgrade when your family needs shared coordination.</h1>
        <p>CareSpark is priced below a single hour of many private care services because the goal is to prevent confusion, not add another burden.</p>
      </section>
      <PricingCards go={go} onCheckout={onCheckout} />
      <p className={`state-message ${state.tone}`}>{state.message}</p>
      <section className="compliance-band">
        <h2>Built for sensitive caregiving decisions.</h2>
        <p>CareSpark helps organize information and likely support routes. It is not medical, legal, financial, or emergency advice. Always confirm eligibility and treatment decisions with the relevant provider or official agency.</p>
      </section>
      <FooterNav go={go} />
    </main>
  );
}

function AdminPage({ go, session }: { go: (view: View) => void; session: Session }) {
  const [state, setState] = useState<ActionState>({ tone: "working", message: "Checking founder access..." });
  const [payload, setPayload] = useState<AdminLayerPayload | null>(null);

  useEffect(() => {
    requestJson("/api/admin-layers", { headers: authHeader(session) })
      .then((data) => {
        setPayload(data.layers);
        setState({ tone: "success", message: "Founder workspace unlocked." });
      })
      .catch((error) => {
        setPayload(null);
        setState({ tone: "error", message: error instanceof Error ? error.message : "Founder access is locked." });
      });
  }, [session]);

  return (
    <main className="admin-shell">
      <button className="text-button" type="button" onClick={() => go("public")}>Back to public site</button>
      <section className="admin-hero">
        <p className="eyebrow">Founder workspace</p>
        <h1>Internal research, growth, and integration controls.</h1>
        <p>This area is locked behind signed-in founder access and is not linked from the consumer experience.</p>
        <p className={`state-message ${state.tone}`}>{state.message}</p>
      </section>
      {payload && (
        <section className="admin-grid">
          <AdminBlock title="Interview layers" items={payload.interviewLayers} />
          <AdminBlock title="Growth plays" items={payload.growthPlays} />
          <AdminBlock title="Integration placeholders" items={payload.integrationChecklist} />
          <AdminBlock title="Market signals" items={payload.marketSignals} />
        </section>
      )}
    </main>
  );
}

function PublicNav({ go }: { go: (view: View) => void }) {
  return (
    <nav className="public-nav" aria-label="CareSpark navigation">
      <button className="nav-brand" type="button" onClick={() => go("public")}><HeartPulse size={18} /> CareSpark</button>
      <div className="nav-links">
        <a href="#how">How it helps</a>
        <button type="button" onClick={() => go("pricing")}>Pricing</button>
        <button type="button" onClick={() => go("signin")}>Sign in</button>
      </div>
    </nav>
  );
}

function PricingPreview({ go }: { go: (view: View) => void }) {
  return (
    <section className="pricing-preview">
      <div>
        <p className="eyebrow">Plans</p>
        <h2>Free to start, paid when coordination becomes ongoing.</h2>
      </div>
      <button className="primary-action" type="button" onClick={() => go("pricing")}>Compare plans</button>
    </section>
  );
}

function PolicyStrip() {
  return (
    <section className="policy-strip">
      <div>
        <h2>Private by design</h2>
        <p>Care details are sensitive. Sign in before saving, share only with people you trust, and review official sources before acting on grant or care-route suggestions.</p>
      </div>
      <div>
        <h2>Emergency note</h2>
        <p>For immediate danger or urgent medical needs, contact emergency services or your clinical care team. CareSpark is a planning companion, not emergency response.</p>
      </div>
    </section>
  );
}

function PricingCards({ go, onCheckout }: { go?: (view: View) => void; onCheckout: (plan: string) => void }) {
  return (
    <section className="pricing-grid">
      {pricingPlans.map((plan) => (
        <article className={plan.featured ? "price-card featured" : "price-card"} key={plan.name}>
          <p className="price-audience">{plan.audience}</p>
          <h2>{plan.name}</h2>
          <div className="price"><strong>{plan.price}</strong><span>{plan.cadence}</span></div>
          <ul>
            {plan.features.map((feature) => <li key={feature}><Check size={16} /> {feature}</li>)}
          </ul>
          <button
            className={plan.featured ? "primary-action full" : "ghost-action full"}
            type="button"
            onClick={() => (plan.name === "Free Check" && go ? go("signin") : onCheckout(plan.name))}
          >
            {plan.cta}
          </button>
        </article>
      ))}
    </section>
  );
}

function Benefit({ icon: Icon, title, copy }: { icon: React.ElementType; title: string; copy: string }) {
  return (
    <article className="benefit">
      <Icon size={24} />
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  );
}

function ProcessStep({ number, title, copy }: { number: string; title: string; copy: string }) {
  return (
    <article className="process-step">
      <span>{number}</span>
      <div>
        <h3>{title}</h3>
        <p>{copy}</p>
      </div>
    </article>
  );
}

function StepDone({ text }: { text: string }) {
  return <div className="step-done"><Check size={16} /> {text}</div>;
}

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="section-title">
      <span>{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function SupportRow({ title, tag, copy, href }: { title: string; tag: string; copy: string; href?: string }) {
  return (
    <article className="support-row">
      <div>
        <h3>{title}</h3>
        <p>{copy}</p>
      </div>
      <div className="support-actions">
        <span>{tag}</span>
        {href && (
          <a href={href} target="_blank" rel="noreferrer" aria-label={`Open source for ${title}`}>
            <ExternalLink size={15} />
          </a>
        )}
      </div>
    </article>
  );
}

function AdminBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="workspace-panel">
      <h2>{title}</h2>
      <ul className="admin-list">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </article>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label>
      {label}
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      {label}
      <input type="number" min="0" value={value || ""} onChange={(event) => onChange(Number(event.target.value || 0))} />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="textarea-field">
      {label}
      <textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function FooterNav({ go }: { go: (view: View) => void }) {
  return (
    <footer className="footer-nav">
      <strong>CareSpark</strong>
      <button type="button" onClick={() => go("signin")}>Sign in</button>
      <button type="button" onClick={() => go("pricing")}>Pricing</button>
    </footer>
  );
}

export default App;

export type InterviewLayer = {
  persona: string;
  trigger: string;
  emotionalTruth: string;
  jobToBeDone: string;
  objections: string[];
  winningMessage: string;
  productResponse: string;
};

export type MarketSignal = {
  label: string;
  value: string;
  interpretation: string;
  source: string;
  url: string;
};

export type GrowthPlay = {
  channel: string;
  audience: string;
  offer: string;
  metric: string;
};

export const marketSignals: MarketSignal[] = [
  {
    label: "Ageing pressure",
    value: "20.7%",
    interpretation: "Share of Singapore citizens aged 65+ in 2025, with around 1 in 4 expected by 2030.",
    source: "National Population and Talent Division",
    url: "https://www.population.gov.sg/our-population/population-trends/longevity/",
  },
  {
    label: "Care load",
    value: "6.8h/day",
    interpretation: "Typical daily care load cited locally, close to a second shift for working caregivers.",
    source: "NTUC Health",
    url: "https://ntuchealth.sg/elderly-care/resources/health-and-wellness/preventing-caregiver-burnout-self-care-and-respite-care",
  },
  {
    label: "Depression risk",
    value: ">40%",
    interpretation: "Local caregiver survey respondents at risk of depression after heavy caregiving demands.",
    source: "The Straits Times",
    url: "https://www.straitstimes.com/singapore/over-40-of-caregivers-at-risk-of-depression-amid-challenging-environment-survey",
  },
  {
    label: "HCG support",
    value: "Up to S$600",
    interpretation: "Enhanced monthly Home Caregiving Grant from April 2026 for eligible households.",
    source: "Together for Better",
    url: "https://www.togetherforbetter.gov.sg/lifestage/caregivers/",
  },
  {
    label: "Mental health routing",
    value: "1771",
    interpretation: "National mindline can be routed as a safety escalation path for overwhelmed caregivers.",
    source: "MOH",
    url: "https://www.moh.gov.sg/newsroom/support-for-caregivers-during-and-post-care/",
  },
];

export const interviewLayers: InterviewLayer[] = [
  {
    persona: "Working adult child",
    trigger: "A parent starts declining after a diagnosis, fall, discharge, or repeated missed medication.",
    emotionalTruth: "I am not sure when helping became my second job, but everyone assumes I will manage.",
    jobToBeDone: "Turn a messy family situation into a clear plan with owners, subsidies, and next steps.",
    objections: ["I do not have time for another app.", "My siblings will ignore it.", "I do not know what help we qualify for."],
    winningMessage: "Seven minutes to see the load, assign the next actions, and stop carrying it invisibly.",
    productResponse: "Fast assessment, shareable care brief, family task board, HCG/CTG/ACP/AIC matcher.",
  },
  {
    persona: "Sandwich caregiver",
    trigger: "Parent care collides with children, work, finances, and partner strain.",
    emotionalTruth: "There is no clean boundary between care, work, and home anymore.",
    jobToBeDone: "Protect income and family energy while keeping the care recipient safe.",
    objections: ["I cannot ask my employer for help.", "Every option sounds expensive.", "I feel guilty resting."],
    winningMessage: "Make the invisible workload visible enough to negotiate help.",
    productResponse: "Workplace accommodation brief, respite trigger, weekly load score, financial-support checklist.",
  },
  {
    persona: "Dementia family lead",
    trigger: "Wandering, agitation, night disruption, medication risk, or caregiver fear escalates.",
    emotionalTruth: "The person I love is changing, and the house is becoming a system I do not know how to run.",
    jobToBeDone: "Create routines, safety checks, backup roles, and early service escalation.",
    objections: ["Generic advice does not fit dementia.", "I do not know when to bring in outside help.", "I am scared of making the wrong decision."],
    winningMessage: "A dementia-aware home-care operating rhythm before the next crisis.",
    productResponse: "Condition-specific roadmap, escalation rules, home safety tasks, AIC respite pathway.",
  },
  {
    persona: "Long-distance sibling",
    trigger: "One sibling is local and overloaded while others only offer vague support.",
    emotionalTruth: "I want to help, but I do not know what concrete help actually removes load.",
    jobToBeDone: "Convert guilt and vague offers into specific remote tasks.",
    objections: ["I am not nearby.", "I do not know the medical details.", "I do not want family conflict."],
    winningMessage: "Help does not need to be local to be useful.",
    productResponse: "Remote task templates, shared brief, named owners, Sunday review rhythm.",
  },
  {
    persona: "Employer or HR lead",
    trigger: "Employees quietly lose focus, reduce hours, or leave because caregiving is unmanaged.",
    emotionalTruth: "Caregiving is a hidden productivity and retention issue, but we cannot see it early.",
    jobToBeDone: "Offer a useful benefit without becoming a healthcare provider.",
    objections: ["We already have EAP.", "Privacy risk.", "Hard to prove ROI."],
    winningMessage: "Anonymous caregiver load insights plus practical navigation support.",
    productResponse: "Employer pilot dashboard, aggregated risk metrics, care-plan benefit, referral routing.",
  },
];

export const growthPlays: GrowthPlay[] = [
  {
    channel: "LinkedIn founder-led content",
    audience: "Working adult children and HR leaders",
    offer: "Free Caregiver Load Check",
    metric: "Assessment completion rate",
  },
  {
    channel: "Caregiver communities",
    audience: "Dementia, eldercare, and sandwich-generation groups",
    offer: "Shareable family care brief",
    metric: "Share-code saves per 100 visits",
  },
  {
    channel: "Employer pilot",
    audience: "SME HR and benefits teams",
    offer: "Anonymous caregiver load snapshot",
    metric: "Pilot meetings booked",
  },
  {
    channel: "Care provider partnership",
    audience: "Home care, day care, palliative, and counselling providers",
    offer: "Qualified navigation/referral handoff",
    metric: "Partner referrals created",
  },
  {
    channel: "Financial adviser / insurer education",
    audience: "Adults planning for ageing parents",
    offer: "Care cost and readiness mini-report",
    metric: "Lead-to-consult conversion",
  },
];

export const integrationChecklist = [
  {
    name: "OpenAI plan generator",
    env: "OPENAI_API_KEY",
    status: "Optional",
    role: "Turns the structured assessment into a warmer, more personalized care plan.",
  },
  {
    name: "Twilio WhatsApp/SMS reminders",
    env: "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER",
    status: "Optional",
    role: "Sends family task nudges and respite reminders.",
  },
  {
    name: "PostHog analytics",
    env: "VITE_POSTHOG_KEY, VITE_POSTHOG_HOST",
    status: "Optional",
    role: "Tracks acquisition, assessment completion, save/load, and conversion funnels.",
  },
  {
    name: "Google Calendar",
    env: "GOOGLE_CLIENT_ID",
    status: "Placeholder",
    role: "Later creates appointment/respite calendar events. Current MVP exports ICS locally.",
  },
  {
    name: "Resend email",
    env: "RESEND_API_KEY",
    status: "Optional",
    role: "Sends care brief, partner follow-up, and waitlist confirmation emails.",
  },
];

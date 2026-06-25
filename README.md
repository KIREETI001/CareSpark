# CareSpark

CareSpark is a Singapore caregiver support MVP. It gives caregivers a calm public website, secure sign-in, a personalized care dashboard, support-directory routing, a shared family task board, wellbeing prompts, and subscription checkout placeholders for Vercel + Supabase deployment.

Live demo: https://the-first-spark.vercel.app

## Stack

- Frontend: Vite, React, TypeScript
- Backend: Vercel Serverless Functions in `api/`
- Database: Supabase Postgres
- Deployment: Vercel

## Local Development

```powershell
npm install
npm run dev
```

For local API routes, use Vercel's dev server:

```powershell
npm run dev:fullstack
```

## Supabase Setup

1. Create a Supabase project.
2. Apply the migrations in `supabase/migrations/`.
3. Add these environment variables locally and in Vercel:

Copy `.env.example` to `.env` for local development. Keep real secrets in `.env` only; `.env.example` is intentionally placeholder-only.

```powershell
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-or-publishable-key
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
APP_BASE_URL=http://127.0.0.1:5173
APP_ALLOWED_REDIRECT_ORIGINS=
ADMIN_EMAILS=founder@example.com
OPENAI_API_KEY=optional-openai-key
OPENAI_MODEL=gpt-4.1-mini
ELEVENLABS_API_KEY=optional-elevenlabs-key
ELEVENLABS_VOICE_ID=optional-elevenlabs-voice-id
ELEVENLABS_TTS_MODEL=eleven_flash_v2_5
STRIPE_SECRET_KEY=optional-stripe-secret-key
STRIPE_PRICE_ID=optional-default-subscription-price-id
STRIPE_PRICE_ID_FAMILY=optional-family-plan-price-id
STRIPE_PRICE_ID_CARE_CIRCLE=optional-care-circle-price-id
STRIPE_PRICE_ID_GUIDED_SETUP=optional-guided-setup-price-id
STRIPE_PRICE_MODE_GUIDED_SETUP=payment
STRIPE_PORTAL_CONFIGURATION_ID=optional-portal-configuration-id
STRIPE_ALLOW_CUSTOMER_ID_FROM_BODY=false
TWILIO_ACCOUNT_SID=optional-twilio-sid
TWILIO_AUTH_TOKEN=optional-twilio-token
TWILIO_FROM_NUMBER=optional-twilio-number
RESEND_API_KEY=optional-resend-key
VITE_POSTHOG_KEY=optional-posthog-key
VITE_POSTHOG_HOST=https://app.posthog.com
```

The MVP uses Supabase Auth for private care-plan saves. Demo mode stays local to the browser and cannot write care plans. The founder workspace is hidden at `/admin` and requires a signed-in Supabase user whose email is listed in `ADMIN_EMAILS`.

## Subscription Placeholders

Stripe is optional during MVP development. These backend routes return `configured: false`, `provider: "stripe"`, and `mode: "placeholder"` when `STRIPE_SECRET_KEY` or a required price ID is missing:

- `POST /api/create-checkout-session`
- `POST /api/create-portal-session`

Set `STRIPE_SECRET_KEY` and the relevant price IDs to create live Checkout sessions. Plan-specific prices use `STRIPE_PRICE_ID_FAMILY`, `STRIPE_PRICE_ID_CARE_CIRCLE`, `STRIPE_PRICE_ID_GUIDED_SETUP`, or any `STRIPE_PRICE_ID_<PLAN_KEY>` environment variable. `Guided Setup` is treated as a one-time payment by default through `STRIPE_PRICE_MODE_GUIDED_SETUP=payment`. In live mode, the portal route uses the authenticated Supabase profile's `stripe_customer_id`; only set `STRIPE_ALLOW_CUSTOMER_ID_FROM_BODY=true` for local testing or trusted server-to-server calls.

## Deploy To Vercel

```powershell
npx vercel env add SUPABASE_URL production
npx vercel env add SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add VITE_SUPABASE_URL production
npx vercel env add VITE_SUPABASE_ANON_KEY production
npx vercel env add APP_BASE_URL production
npx vercel env add APP_ALLOWED_REDIRECT_ORIGINS production
npx vercel env add ADMIN_EMAILS production
npx vercel env add OPENAI_API_KEY production
npx vercel env add ELEVENLABS_API_KEY production
npx vercel env add ELEVENLABS_VOICE_ID production
npx vercel env add ELEVENLABS_TTS_MODEL production
npx vercel env add STRIPE_SECRET_KEY production
npx vercel env add STRIPE_PRICE_ID production
npx vercel env add STRIPE_PRICE_ID_FAMILY production
npx vercel env add STRIPE_PRICE_ID_CARE_CIRCLE production
npx vercel env add STRIPE_PRICE_ID_GUIDED_SETUP production
npx vercel env add STRIPE_PRICE_MODE_GUIDED_SETUP production
npx vercel env add STRIPE_PORTAL_CONFIGURATION_ID production
npx vercel env add STRIPE_ALLOW_CUSTOMER_ID_FROM_BODY production
npx vercel env add TWILIO_ACCOUNT_SID production
npx vercel env add TWILIO_AUTH_TOKEN production
npx vercel env add TWILIO_FROM_NUMBER production
npx vercel env add VITE_POSTHOG_KEY production
npm run deploy
```

Health check:

```text
/api/health
```

It returns `supabaseConfigured: true` when Vercel has the required backend environment variables.

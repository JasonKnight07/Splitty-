# Splitty

Scan the slip, split the bill, keep the receipts.

A mobile-first web app (installable as a PWA) for:

- **Scanning a till slip** and having it read into structured line items (via a vision LLM).
- **Splitting a bill** — claim individual items, split a total equally among N people, or pair people into **couples** who see a combined total *and* their own individual portion.
- **Tipping** with 10% / 12.5% / 15% presets or a custom amount.
- **Saving receipts** for tax purposes, tagged **Personal** or **Business**, with CSV export.
- **Tracking warranties** for appliances/purchases, with an expiry countdown.
- A **subscription** (Free / Plus / Pro) billed monthly via Stripe.

## Running it locally

```bash
cd splitty
npm install
npm run dev
```

Open the printed localhost URL. **No environment variables are required to try the app** — without
`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` set, Splitty runs in **demo mode**: all data is stored
in `localStorage`, "sign in" just picks a display name, and scanning a receipt returns a simulated
parse after a short delay instead of calling the OCR backend. This is how you can click through
every screen (Home, Scan, Split, Receipts, Settings) with realistic seeded data before wiring up
any real backend.

## Architecture

- **Frontend**: Vite + React + TypeScript + Tailwind CSS, `react-router-dom` for navigation.
- **Data layer** (`src/lib/dataClient.ts`): a single `DataClient` interface with two
  implementations — `DemoDataClient` (localStorage) and `SupabaseDataClient` (Postgres via
  Supabase) — chosen automatically based on whether Supabase env vars are present. Every page talks
  to the interface, never to a specific backend, so switching to real infra is a config change, not
  a rewrite.
- **Split calculation engine** (`src/lib/calc.ts`): pure functions that compute tip, per-person
  totals (item-by-item or equal split, each proportionally loaded with their share of tax + tip),
  and couple totals. Fully unit-testable in isolation from the UI.
- **Backend** (`api/*.ts`): Vercel Edge Functions.
  - `scan-receipt.ts` — sends the receipt photo to Claude's vision API and returns structured JSON.
  - `create-checkout-session.ts` — starts a Stripe Checkout session for a subscription plan.
  - `stripe-webhook.ts` — verifies Stripe's webhook signature and writes the resulting plan/status
    to the user's `subscriptions` row using the Supabase **service role** key (bypassing RLS).
- **Database** (`supabase/migrations/0001_init.sql`): `bills`, `receipts`, `subscriptions` tables,
  each storing its payload as JSONB (matching `src/types.ts`) with row-level security scoping every
  row to its owner.

## Wiring up the real backend

1. **Supabase**: create a project, run `supabase/migrations/0001_init.sql` against it (SQL editor or
   `supabase db push`), then set on Vercel and in a local `.env`:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   # server-side only, used by the Stripe webhook
   ```
   Enable email auth (magic link) in the Supabase Auth settings — `signIn()` in
   `src/lib/supabaseClient.ts` calls `signInWithOtp`.

2. **Receipt scanning**: set `ANTHROPIC_API_KEY` on Vercel. `api/scan-receipt.ts` calls Claude's
   vision API directly over REST — no SDK dependency.

3. **Stripe billing**:
   - Create two recurring Prices (Plus, Pro) in the Stripe Dashboard.
   - Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PLUS`, `STRIPE_PRICE_PRO`, `PUBLIC_APP_URL`.
   - Add a webhook endpoint pointing at `https://<your-domain>/api/stripe-webhook`, subscribed to
     `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
     Set `STRIPE_WEBHOOK_SECRET` to the signing secret Stripe gives you.
   - For `customer.subscription.updated/deleted` to know which app user to update, attach
     `metadata.userId` to the Stripe subscription (e.g. in a `checkout.session.completed` handler
     you extend, or via the Customer Portal configuration) — the webhook reads it from
     `event.data.object.metadata.userId`.

4. **Deploy**: this is a standard Vite app with a Vercel `api/` folder, so `vercel deploy` picks up
   both the static frontend and the serverless functions with no extra config.

## Known limitations / next steps

- Demo mode has no real multi-device collaboration — inviting a friend to a bill only makes sense
  once Supabase is wired up (each bill's `id` can then be shared as a link; add a route guard so any
  signed-in user with the link can join, rather than only the creator).
- Stripe Customer Portal ("Manage billing") isn't wired up yet — add a
  `api/create-portal-session.ts` mirroring `create-checkout-session.ts` using
  `billing_portal/sessions` once you have real Stripe customers to point it at.
- Push notifications for warranty expiry aren't implemented (a PWA can request notification
  permission and a Supabase cron/Edge Function could send them).
- No automated tests yet — `src/lib/calc.ts` is pure and the highest-value place to start.

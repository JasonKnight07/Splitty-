// Vercel serverless function. Receives Stripe subscription lifecycle events
// and writes the resulting plan/status onto the user's subscription record
// in Supabase, using the service role key (server-side only, bypasses RLS).
//
// Requires env vars: STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY,
// VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//
// Register this endpoint's URL (https://<your-domain>/api/stripe-webhook) in
// the Stripe Dashboard -> Developers -> Webhooks, subscribed to:
// checkout.session.completed, customer.subscription.updated,
// customer.subscription.deleted.

export const config = { runtime: 'edge' }

async function verifyStripeSignature(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]))
  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`))
  const expected = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  if (expected.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  return diff === 0
}

function planFromPriceId(priceId: string | undefined): 'plus' | 'pro' | null {
  if (priceId && priceId === process.env.STRIPE_PRICE_PLUS) return 'plus'
  if (priceId && priceId === process.env.STRIPE_PRICE_PRO) return 'pro'
  return null
}

async function upsertSubscription(userId: string, data: Record<string, unknown>) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return

  await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ id: userId, data }),
  })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return new Response('STRIPE_WEBHOOK_SECRET is not configured on the server', { status: 500 })
  }

  const rawBody = await req.text()
  const valid = await verifyStripeSignature(rawBody, req.headers.get('stripe-signature'), webhookSecret)
  if (!valid) {
    return new Response('Invalid signature', { status: 400 })
  }

  const event = JSON.parse(rawBody)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const userId = session.client_reference_id
      if (userId) {
        await upsertSubscription(userId, { plan: 'plus', status: 'active' })
      }
      break
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object
      const userId = sub.metadata?.userId
      const priceId = sub.items?.data?.[0]?.price?.id
      const plan = planFromPriceId(priceId) ?? 'free'
      const status = event.type === 'customer.subscription.deleted' ? 'canceled' : sub.status
      if (userId) {
        await upsertSubscription(userId, { plan: status === 'canceled' ? 'free' : plan, status })
      }
      break
    }
    default:
      break
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

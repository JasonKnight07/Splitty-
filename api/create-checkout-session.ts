// Vercel serverless function. Creates a Stripe Checkout Session for a
// monthly subscription plan and returns its redirect URL.
//
// Requires env vars: STRIPE_SECRET_KEY, STRIPE_PRICE_PLUS, STRIPE_PRICE_PRO,
// and PUBLIC_APP_URL (e.g. https://splitty.app) for the success/cancel
// redirects.

export const config = { runtime: 'edge' }

const PRICE_ENV: Record<string, string | undefined> = {
  plus: process.env.STRIPE_PRICE_PLUS,
  pro: process.env.STRIPE_PRICE_PRO,
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  const appUrl = process.env.PUBLIC_APP_URL || new URL(req.url).origin
  if (!secretKey) {
    return new Response(JSON.stringify({ error: 'STRIPE_SECRET_KEY is not configured on the server' }), {
      status: 500,
    })
  }

  const { plan, email, userId } = (await req.json()) as { plan?: string; email?: string; userId?: string }
  const priceId = plan ? PRICE_ENV[plan] : undefined
  if (!priceId) {
    return new Response(JSON.stringify({ error: `No Stripe price configured for plan "${plan}"` }), { status: 400 })
  }

  const body = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: `${appUrl}/settings?checkout=success`,
    cancel_url: `${appUrl}/settings?checkout=cancelled`,
    allow_promotion_codes: 'true',
  })
  if (email) body.set('customer_email', email)
  if (userId) body.set('client_reference_id', userId)

  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!stripeRes.ok) {
    const detail = await stripeRes.text()
    return new Response(JSON.stringify({ error: 'Stripe request failed', detail }), { status: 502 })
  }

  const session = await stripeRes.json()
  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

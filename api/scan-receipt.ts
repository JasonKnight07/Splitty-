// Vercel serverless function. Receives a receipt photo and returns
// structured line items using a vision-capable LLM (Claude). Runs
// server-side so the API key never reaches the browser.
//
// Requires the ANTHROPIC_API_KEY environment variable to be set in the
// Vercel project (Project Settings -> Environment Variables).

export const config = { runtime: 'edge' }

const SYSTEM_PROMPT = `You read till slips / restaurant receipts from photos and extract structured data.
Respond with ONLY minified JSON matching this shape, no prose, no markdown fences:
{"merchant":string,"date":"YYYY-MM-DD","items":[{"name":string,"price":number,"quantity":number}],"subtotal":number,"tax":number,"total":number}
- "price" is the line's total price (already multiplied by quantity), in the receipt's currency, as a plain number.
- If a field is illegible, make a reasonable best guess rather than omitting it.
- If no explicit date is visible, use today's date.`

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured on the server' }), {
      status: 500,
    })
  }

  try {
    const { imageDataUrl } = (await req.json()) as { imageDataUrl?: string }
    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
      return new Response(JSON.stringify({ error: 'imageDataUrl (base64 data URL) is required' }), { status: 400 })
    }

    const [, mediaType, base64] = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/) ?? []
    if (!base64) {
      return new Response(JSON.stringify({ error: 'imageDataUrl is not a valid base64 image' }), { status: 400 })
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: 'Extract this receipt as JSON per the schema in your instructions.' },
            ],
          },
        ],
      }),
    })

    if (!anthropicRes.ok) {
      const detail = await anthropicRes.text()
      return new Response(JSON.stringify({ error: 'Vision model request failed', detail }), { status: 502 })
    }

    const payload = await anthropicRes.json()
    const text: string = payload.content?.[0]?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'Could not parse a receipt from that image' }), { status: 422 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    const items = (parsed.items ?? []).map((item: any, idx: number) => ({
      id: `scan-${idx}-${Date.now()}`,
      name: String(item.name ?? '').trim(),
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
    }))

    return new Response(
      JSON.stringify({
        merchant: String(parsed.merchant ?? '').trim(),
        date: parsed.date || new Date().toISOString().slice(0, 10),
        items,
        subtotal: Number(parsed.subtotal) || items.reduce((s: number, i: any) => s + i.price, 0),
        tax: Number(parsed.tax) || 0,
        total: Number(parsed.total) || 0,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Unexpected error scanning receipt' }), { status: 500 })
  }
}

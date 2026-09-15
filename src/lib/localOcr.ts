import { newId } from './id'
import type { ScannedReceipt } from '../types'

// Tesseract commonly misreads digits as look-alike letters (O/o for 0, l/I for 1),
// so match a price-shaped token loosely, then normalize just that token below.
const MONEY_LINE = /([0-9OolI]{1,6}[.,][0-9OolI]{2})\s*$/
const SKIP_WORDS = /\b(cash|change|card|balance|approved|thank you|receipt|visa|mastercard|ref|auth)\b/i
const TOTAL_WORDS = /\btotal\b/i
const SUBTOTAL_WORDS = /\bsub\s*-?total\b/i
const TAX_WORDS = /\b(tax|vat)\b/i
const DATE_PATTERN = /(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/

function toNumber(raw: string): number {
  const normalized = raw.replace(/[Oo]/g, '0').replace(/[lI]/g, '1').replace(',', '.')
  return Number(normalized) || 0
}

/**
 * Free, in-browser OCR via Tesseract.js (WebAssembly, no API key, no
 * account). Loaded lazily so its ~2MB worker/wasm/traineddata only download
 * for users who actually reach this fallback. Accuracy is heuristic — it
 * reads raw text off the photo and guesses which lines are items vs.
 * totals, so results are rougher than the paid vision-LLM path, but it's a
 * genuine read of the real receipt rather than a canned example.
 */
export async function localOcrScan(file: File): Promise<ScannedReceipt> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  let text: string
  try {
    const result = await worker.recognize(file)
    text = result.data.text
  } finally {
    await worker.terminate()
  }

  return parseReceiptText(text)
}

export function parseReceiptText(text: string): ScannedReceipt {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const items: ScannedReceipt['items'] = []
  let subtotal: number | null = null
  let tax: number | null = null
  let total: number | null = null
  let merchant = ''
  let date = new Date().toISOString().slice(0, 10)

  for (const line of lines) {
    const dateMatch = line.match(DATE_PATTERN)
    if (dateMatch && date === new Date().toISOString().slice(0, 10)) {
      const [, d, m, y] = dateMatch
      const year = y.length === 2 ? `20${y}` : y
      const candidate = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      if (!Number.isNaN(new Date(candidate).getTime())) date = candidate
    }

    const moneyMatch = line.match(MONEY_LINE)
    if (!moneyMatch) {
      if (!merchant && !SKIP_WORDS.test(line) && line.length > 2) merchant = line
      continue
    }

    const amount = toNumber(moneyMatch[1])
    const label = line.slice(0, moneyMatch.index).trim().replace(/[.:\s-]+$/, '')

    if (TOTAL_WORDS.test(label) && !SUBTOTAL_WORDS.test(label)) {
      total = amount
    } else if (SUBTOTAL_WORDS.test(label)) {
      subtotal = amount
    } else if (TAX_WORDS.test(label)) {
      tax = amount
    } else if (label && !SKIP_WORDS.test(label)) {
      items.push({ id: newId(), name: label, price: amount, quantity: 1 })
    }
  }

  const itemSum = items.reduce((s, i) => s + i.price, 0)
  if (subtotal === null) subtotal = itemSum || total || 0
  if (tax === null) tax = total !== null ? Math.max(0, +(total - subtotal).toFixed(2)) : 0
  if (total === null) total = +(subtotal + tax).toFixed(2)

  return {
    merchant: merchant || 'Scanned receipt',
    date,
    items: items.length ? items : [{ id: newId(), name: 'Item (edit me)', price: subtotal, quantity: 1 }],
    subtotal,
    tax,
    total,
  }
}

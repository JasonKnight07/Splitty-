import { newId } from './id'
import { localOcrScan } from './localOcr'
import type { ScannedReceipt } from '../types'

const MOCK_RECEIPTS: Omit<ScannedReceipt, 'date'>[] = [
  {
    merchant: 'The Olive Tree',
    items: [
      { id: newId(), name: 'Margherita Pizza', price: 145, quantity: 1 },
      { id: newId(), name: 'Caesar Salad', price: 90, quantity: 1 },
      { id: newId(), name: 'Craft Beer x2', price: 120, quantity: 2 },
      { id: newId(), name: 'Tiramisu', price: 75, quantity: 1 },
    ],
    subtotal: 430,
    tax: 64.5,
    total: 494.5,
  },
  {
    merchant: 'Pick n Pay',
    items: [
      { id: newId(), name: 'Milk 2L', price: 32, quantity: 1 },
      { id: newId(), name: 'Eggs (dozen)', price: 41, quantity: 1 },
      { id: newId(), name: 'Sourdough Loaf', price: 55, quantity: 1 },
      { id: newId(), name: 'Bananas', price: 23, quantity: 1 },
    ],
    subtotal: 151,
    tax: 22.65,
    total: 173.65,
  },
]

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export interface ScanResult {
  receipt: ScannedReceipt
  /**
   * 'ai' = read by the paid vision LLM (most accurate).
   * 'local' = read for free in the browser via Tesseract.js (rougher — worth double-checking).
   * 'demo' = neither worked, so this is a canned example, not your photo.
   */
  source: 'ai' | 'local' | 'demo'
}

/**
 * Scans a receipt photo into structured line items, cheapest-first-that-
 * actually-reads-the-photo:
 *  1. /api/scan-receipt — a Vercel function calling a vision LLM. Best
 *     accuracy, costs a fraction of a cent per scan, needs ANTHROPIC_API_KEY.
 *  2. Free, in-browser OCR (Tesseract.js) — no API key, no account, no
 *     cost, runs entirely on-device. Rougher heuristic parsing, but it's a
 *     real read of the real photo.
 *  3. A canned example receipt, only if both of the above fail, so the rest
 *     of the flow is still testable.
 */
export async function scanReceiptImage(file: File): Promise<ScanResult> {
  try {
    const imageDataUrl = await fileToDataUrl(file)
    const res = await fetch('/api/scan-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageDataUrl }),
    })
    if (!res.ok) throw new Error(`Scan failed: ${res.status}`)
    return { receipt: (await res.json()) as ScannedReceipt, source: 'ai' }
  } catch {
    // Falls through to free local OCR below.
  }

  try {
    return { receipt: await localOcrScan(file), source: 'local' }
  } catch {
    const pick = MOCK_RECEIPTS[Math.floor(Math.random() * MOCK_RECEIPTS.length)]
    return { receipt: { ...pick, date: new Date().toISOString().slice(0, 10) }, source: 'demo' }
  }
}

export function blankScannedReceipt(): ScannedReceipt {
  return {
    merchant: '',
    date: new Date().toISOString().slice(0, 10),
    items: [{ id: newId(), name: '', price: 0, quantity: 1 }],
    subtotal: 0,
    tax: 0,
    total: 0,
  }
}

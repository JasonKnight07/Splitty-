import { newId } from './id'
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

/**
 * Scans a receipt photo into structured line items. In demo mode (no backend
 * configured) this simulates the round trip with a small delay and returns a
 * plausible mock parse. Wired to a real backend, it POSTs the image to
 * /api/scan-receipt, a Vercel function that calls a vision-capable LLM.
 */
export async function scanReceiptImage(file: File, useBackend: boolean): Promise<ScannedReceipt> {
  const imageDataUrl = await fileToDataUrl(file)

  if (useBackend) {
    const res = await fetch('/api/scan-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageDataUrl }),
    })
    if (!res.ok) throw new Error(`Scan failed: ${res.status}`)
    return (await res.json()) as ScannedReceipt
  }

  await new Promise((r) => setTimeout(r, 1400))
  const pick = MOCK_RECEIPTS[Math.floor(Math.random() * MOCK_RECEIPTS.length)]
  return { ...pick, date: new Date().toISOString().slice(0, 10) }
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

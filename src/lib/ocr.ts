import { newId } from './id'
import type { ScannedReceipt } from '../types'

const MOCK_RECEIPTS: Omit<ScannedReceipt, 'date'>[] = [
  {
    merchant: 'The Olive Tree',
    items: [
      { id: newId(), name: 'Margherita Pizza', price: 14.5, quantity: 1 },
      { id: newId(), name: 'Caesar Salad', price: 9.0, quantity: 1 },
      { id: newId(), name: 'Craft Beer x2', price: 12.0, quantity: 2 },
      { id: newId(), name: 'Tiramisu', price: 7.5, quantity: 1 },
    ],
    subtotal: 43.0,
    tax: 3.44,
    total: 46.44,
  },
  {
    merchant: 'Corner Grocer',
    items: [
      { id: newId(), name: 'Milk 2L', price: 3.2, quantity: 1 },
      { id: newId(), name: 'Eggs (dozen)', price: 4.1, quantity: 1 },
      { id: newId(), name: 'Sourdough Loaf', price: 5.5, quantity: 1 },
      { id: newId(), name: 'Bananas', price: 2.3, quantity: 1 },
    ],
    subtotal: 15.1,
    tax: 1.21,
    total: 16.31,
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

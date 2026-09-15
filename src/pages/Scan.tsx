import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card, Screen, ScreenHeader } from '../components/ui'
import { CameraIcon, ImageIcon } from '../components/icons'
import { useApp } from '../context/AppContext'
import { newId } from '../lib/id'
import { blankScannedReceipt, scanReceiptImage } from '../lib/ocr'
import { formatCurrency } from '../lib/currency'
import type { Bill, ReceiptCategory, ReceiptKind, ScannedReceipt } from '../types'

type Step = 'capture' | 'processing' | 'review' | 'destination' | 'save-details'

export default function Scan() {
  const { client, user } = useApp()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const manual = params.get('mode') === 'manual'

  const [step, setStep] = useState<Step>(manual ? 'review' : 'capture')
  const [receipt, setReceipt] = useState<ScannedReceipt>(manual ? blankScannedReceipt() : blankScannedReceipt())
  const [error, setError] = useState<string | null>(null)
  const [destKind, setDestKind] = useState<ReceiptKind>('expense')
  const [category, setCategory] = useState<ReceiptCategory>('personal')
  const [productName, setProductName] = useState('')
  const [warrantyMonths, setWarrantyMonths] = useState(24)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setStep('processing')
    setError(null)
    try {
      const useBackend = client?.mode === 'supabase'
      const scanned = await scanReceiptImage(file, useBackend)
      setReceipt(scanned)
      setStep('review')
    } catch (e) {
      setError('Could not read that receipt. Try again or enter it manually.')
      setStep('capture')
    }
  }

  function updateItem(id: string, patch: Partial<ScannedReceipt['items'][number]>) {
    setReceipt((r) => ({ ...r, items: r.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))
  }

  function addItem() {
    setReceipt((r) => ({ ...r, items: [...r.items, { id: newId(), name: '', price: 0, quantity: 1 }] }))
  }

  function removeItem(id: string) {
    setReceipt((r) => ({ ...r, items: r.items.filter((i) => i.id !== id) }))
  }

  const subtotal = receipt.items.reduce((s, i) => s + i.price * (i.quantity || 1), 0)

  async function startBill() {
    if (!client || !user) return
    const bill: Bill = {
      id: newId(),
      name: receipt.merchant ? `${receipt.merchant}` : 'New bill',
      merchant: receipt.merchant,
      date: receipt.date,
      items: receipt.items
        .filter((i) => i.name.trim())
        .map((i) => ({ ...i, price: round2(i.price * (i.quantity || 1)) })),
      subtotal: round2(subtotal),
      tax: round2(receipt.tax),
      people: [{ id: newId(), name: 'You' }],
      couples: [],
      claims: [],
      splitMode: 'items',
      tipMode: '15',
      createdAt: new Date().toISOString(),
    }
    await client.saveBill(bill)
    navigate(`/bill/${bill.id}`)
  }

  async function saveAsReceipt() {
    if (!client) return
    const total = destKind === 'warranty' ? round2(subtotal) : round2(subtotal + receipt.tax)
    const expires = new Date()
    expires.setMonth(expires.getMonth() + warrantyMonths)
    await client.saveReceipt({
      id: newId(),
      merchant: receipt.merchant || 'Unnamed',
      date: receipt.date,
      total,
      kind: destKind,
      category,
      productName: destKind === 'warranty' ? productName || receipt.merchant : undefined,
      warrantyMonths: destKind === 'warranty' ? warrantyMonths : undefined,
      warrantyExpires: destKind === 'warranty' ? expires.toISOString().slice(0, 10) : undefined,
      items: receipt.items.filter((i) => i.name.trim()),
      createdAt: new Date().toISOString(),
    })
    navigate('/receipts')
  }

  return (
    <Screen>
      <ScreenHeader
        title={step === 'destination' || step === 'save-details' ? 'What is this for?' : 'Scan a slip'}
        subtitle={
          step === 'capture'
            ? 'Snap a photo of the till slip and Splitty will read the items.'
            : undefined
        }
      />

      {step === 'capture' && (
        <div className="space-y-4">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="tap-highlight-none flex w-full flex-col items-center justify-center rounded-xl2 border-2 border-dashed border-brand-300 bg-brand-50 py-14 text-brand-700 transition active:scale-[0.98]"
          >
            <CameraIcon className="h-11 w-11" strokeWidth={1.5} />
            <span className="mt-3 font-bold">Take a photo</span>
            <span className="text-xs text-brand-600">Use your camera</span>
          </button>
          <button
            onClick={() => uploadInputRef.current?.click()}
            className="tap-highlight-none flex w-full items-center justify-center gap-2 rounded-xl2 border border-ink-200 bg-white py-4 font-bold text-ink-700 transition active:scale-[0.98]"
          >
            <ImageIcon className="h-5 w-5" />
            Upload a photo
          </button>
          {error && <p className="text-center text-sm text-red-600">{error}</p>}
          <Button variant="secondary" className="w-full" onClick={() => setStep('review')}>
            Or enter items manually
          </Button>
        </div>
      )}

      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-5 font-semibold text-ink-700">Reading your receipt&hellip;</p>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <Card>
            <label className="text-xs font-semibold uppercase text-ink-400">Merchant</label>
            <input
              value={receipt.merchant}
              onChange={(e) => setReceipt((r) => ({ ...r, merchant: e.target.value }))}
              placeholder="e.g. The Olive Tree"
              className="mt-1 w-full border-0 border-b border-ink-100 bg-transparent pb-1 font-semibold outline-none focus:border-brand-500"
            />
            <label className="mt-3 block text-xs font-semibold uppercase text-ink-400">Date</label>
            <input
              type="date"
              value={receipt.date}
              onChange={(e) => setReceipt((r) => ({ ...r, date: e.target.value }))}
              className="mt-1 w-full border-0 border-b border-ink-100 bg-transparent pb-1 outline-none focus:border-brand-500"
            />
          </Card>

          <div className="space-y-2">
            {receipt.items.map((item) => (
              <Card key={item.id} className="flex items-center gap-2">
                <input
                  value={item.name}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  placeholder="Item name"
                  className="min-w-0 flex-1 border-0 bg-transparent outline-none"
                />
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) || 1 })}
                  className="w-10 rounded border border-ink-100 bg-ink-50 px-1 py-1 text-center text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  value={item.price}
                  onChange={(e) => updateItem(item.id, { price: Number(e.target.value) || 0 })}
                  className="w-20 rounded border border-ink-100 bg-ink-50 px-2 py-1 text-right"
                />
                <button onClick={() => removeItem(item.id)} className="px-1 text-lg text-ink-300">
                  &times;
                </button>
              </Card>
            ))}
            <Button variant="secondary" className="w-full" onClick={addItem}>
              + Add item
            </Button>
          </div>

          <Card>
            <div className="flex items-center justify-between text-sm text-ink-500">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-ink-500">Tax</span>
              <input
                type="number"
                step="0.01"
                value={receipt.tax}
                onChange={(e) => setReceipt((r) => ({ ...r, tax: Number(e.target.value) || 0 }))}
                className="w-24 rounded border border-ink-100 bg-ink-50 px-2 py-1 text-right"
              />
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-ink-100 pt-2 font-bold text-ink-900">
              <span>Total</span>
              <span>{formatCurrency(subtotal + receipt.tax)}</span>
            </div>
          </Card>

          <Button className="w-full" disabled={!receipt.items.some((i) => i.name.trim())} onClick={() => setStep('destination')}>
            Continue
          </Button>
        </div>
      )}

      {step === 'destination' && (
        <div className="space-y-3">
          <Card onClick={startBill} className="flex items-center gap-4">
            <span className="text-3xl">🍽️</span>
            <div>
              <p className="font-bold text-ink-900">Split this bill</p>
              <p className="text-sm text-ink-500">Invite people and divide items or the total</p>
            </div>
          </Card>
          <Card onClick={() => { setDestKind('expense'); setStep('save-details') }} className="flex items-center gap-4">
            <span className="text-3xl">🧾</span>
            <div>
              <p className="font-bold text-ink-900">Save as an expense</p>
              <p className="text-sm text-ink-500">Tag personal or business for tax time</p>
            </div>
          </Card>
          <Card onClick={() => { setDestKind('warranty'); setStep('save-details') }} className="flex items-center gap-4">
            <span className="text-3xl">🛠️</span>
            <div>
              <p className="font-bold text-ink-900">Save for warranty</p>
              <p className="text-sm text-ink-500">Track an appliance or purchase's warranty</p>
            </div>
          </Card>
        </div>
      )}

      {step === 'save-details' && (
        <div className="space-y-4">
          {destKind === 'expense' ? (
            <Card>
              <p className="mb-2 text-sm font-semibold text-ink-700">Category</p>
              <div className="flex gap-2">
                {(['personal', 'business'] as ReceiptCategory[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold capitalize transition ${
                      category === c ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 text-ink-600'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-400">
                Business expenses can be exported at tax time from the Receipts tab.
              </p>
            </Card>
          ) : (
            <Card>
              <label className="text-xs font-semibold uppercase text-ink-400">Product</label>
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder={receipt.merchant || 'e.g. LG Fridge'}
                className="mt-1 w-full border-0 border-b border-ink-100 bg-transparent pb-1 font-semibold outline-none focus:border-brand-500"
              />
              <label className="mt-3 block text-xs font-semibold uppercase text-ink-400">Warranty length</label>
              <div className="mt-1 flex gap-2">
                {[12, 24, 36].map((m) => (
                  <button
                    key={m}
                    onClick={() => setWarrantyMonths(m)}
                    className={`flex-1 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                      warrantyMonths === m ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 text-ink-600'
                    }`}
                  >
                    {m} mo
                  </button>
                ))}
              </div>
            </Card>
          )}
          <Button className="w-full" onClick={saveAsReceipt}>
            Save receipt
          </Button>
        </div>
      )}
    </Screen>
  )
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Card, Screen, ScreenHeader } from '../components/ui'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/currency'
import type { ReceiptCategory, SavedReceipt } from '../types'

export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>()
  const { client } = useApp()
  const navigate = useNavigate()
  const [receipt, setReceipt] = useState<SavedReceipt | null>(null)

  useEffect(() => {
    if (!client || !id) return
    client.listReceipts().then((rs) => setReceipt(rs.find((r) => r.id === id) ?? null))
  }, [client, id])

  if (!receipt) {
    return (
      <Screen>
        <p className="py-20 text-center text-ink-400">Loading&hellip;</p>
      </Screen>
    )
  }

  async function setCategory(category: ReceiptCategory) {
    if (!receipt) return
    const next = { ...receipt, category }
    setReceipt(next)
    await client?.saveReceipt(next)
  }

  const daysLeft = receipt.warrantyExpires
    ? Math.ceil((new Date(receipt.warrantyExpires).getTime() - Date.now()) / 86400000)
    : null

  return (
    <Screen>
      <ScreenHeader
        title={receipt.kind === 'warranty' ? receipt.productName || receipt.merchant : receipt.merchant}
        subtitle={new Date(receipt.date).toLocaleDateString()}
        right={
          <button
            onClick={async () => {
              if (confirm('Delete this receipt?')) {
                await client?.deleteReceipt(receipt.id)
                navigate('/receipts')
              }
            }}
            className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600"
          >
            Delete
          </button>
        }
      />

      {receipt.kind === 'expense' ? (
        <Card className="mb-4">
          <p className="mb-2 text-sm font-semibold text-ink-700">Category</p>
          <div className="flex gap-2">
            {(['personal', 'business'] as ReceiptCategory[]).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold capitalize transition ${
                  receipt.category === c ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 text-ink-600'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink-700">Warranty</p>
              <p className="text-xs text-ink-500">{receipt.warrantyMonths} months from purchase</p>
            </div>
            {daysLeft !== null && (
              <Badge tone={daysLeft < 0 ? 'red' : daysLeft <= 30 ? 'amber' : 'brand'}>
                {daysLeft < 0 ? 'Expired' : `${daysLeft} days left`}
              </Badge>
            )}
          </div>
          {receipt.warrantyExpires && (
            <p className="mt-2 text-sm text-ink-500">
              Expires {new Date(receipt.warrantyExpires).toLocaleDateString()}
            </p>
          )}
        </Card>
      )}

      <Card className="mb-4">
        <p className="mb-2 text-sm font-semibold text-ink-700">Items</p>
        <div className="space-y-1.5">
          {receipt.items.map((i) => (
            <div key={i.id} className="flex justify-between text-sm">
              <span className="text-ink-700">
                {i.name} {i.quantity > 1 ? `×${i.quantity}` : ''}
              </span>
              <span className="font-medium text-ink-900">{formatCurrency(i.price)}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between border-t border-ink-100 pt-2 font-bold text-ink-900">
          <span>Total</span>
          <span>{formatCurrency(receipt.total)}</span>
        </div>
      </Card>

      {receipt.notes && (
        <Card>
          <p className="text-sm font-semibold text-ink-700">Notes</p>
          <p className="mt-1 text-sm text-ink-500">{receipt.notes}</p>
        </Card>
      )}
    </Screen>
  )
}

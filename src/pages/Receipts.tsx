import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, Screen, ScreenHeader } from '../components/ui'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/currency'
import { downloadExpensesCsv } from '../lib/exportCsv'
import type { ReceiptCategory, SavedReceipt } from '../types'

type Tab = 'expenses' | 'warranty'

export default function Receipts() {
  const { client } = useApp()
  const navigate = useNavigate()
  const [receipts, setReceipts] = useState<SavedReceipt[]>([])
  const [tab, setTab] = useState<Tab>('expenses')
  const [categoryFilter, setCategoryFilter] = useState<ReceiptCategory | 'all'>('all')

  useEffect(() => {
    client?.listReceipts().then(setReceipts)
  }, [client])

  const expenses = useMemo(
    () =>
      receipts
        .filter((r) => r.kind === 'expense')
        .filter((r) => categoryFilter === 'all' || r.category === categoryFilter),
    [receipts, categoryFilter],
  )
  const warranties = useMemo(
    () =>
      receipts
        .filter((r) => r.kind === 'warranty')
        .sort((a, b) => (a.warrantyExpires ?? '').localeCompare(b.warrantyExpires ?? '')),
    [receipts],
  )

  const personalTotal = expenses.filter((r) => r.category === 'personal').reduce((s, r) => s + r.total, 0)
  const businessTotal = expenses.filter((r) => r.category === 'business').reduce((s, r) => s + r.total, 0)

  return (
    <Screen>
      <ScreenHeader title="Receipts" subtitle="Your tax records and warranty vault" />

      <div className="mb-4 flex rounded-full bg-ink-100 p-1">
        {(
          [
            ['expenses', 'Tax expenses'],
            ['warranty', 'Warranties'],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2 text-sm font-bold transition ${
              tab === t ? 'bg-white text-brand-700 shadow-card' : 'text-ink-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'expenses' && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <Card
              onClick={() => setCategoryFilter(categoryFilter === 'personal' ? 'all' : 'personal')}
              className={categoryFilter === 'personal' ? 'border-brand-500' : ''}
            >
              <p className="text-xs font-semibold text-ink-400">Personal</p>
              <p className="mt-1 text-xl font-extrabold text-ink-900">{formatCurrency(personalTotal)}</p>
            </Card>
            <Card
              onClick={() => setCategoryFilter(categoryFilter === 'business' ? 'all' : 'business')}
              className={categoryFilter === 'business' ? 'border-brand-500' : ''}
            >
              <p className="text-xs font-semibold text-ink-400">Business</p>
              <p className="mt-1 text-xl font-extrabold text-ink-900">{formatCurrency(businessTotal)}</p>
            </Card>
          </div>

          {expenses.length > 0 && (
            <Button variant="secondary" className="mb-4 w-full" onClick={() => downloadExpensesCsv(expenses)}>
              ⬇ Export {categoryFilter === 'all' ? '' : categoryFilter} CSV for tax time
            </Button>
          )}

          {expenses.length === 0 ? (
            <EmptyState icon="🧾" title="No expenses saved yet" subtitle="Scan a receipt and save it as an expense." />
          ) : (
            <div className="space-y-2">
              {expenses.map((r) => (
                <Card key={r.id} onClick={() => navigate(`/receipts/${r.id}`)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-ink-900">{r.merchant}</p>
                      <p className="text-xs text-ink-500">{new Date(r.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={r.category === 'business' ? 'brand' : 'ink'}>{r.category}</Badge>
                      <p className="font-bold text-ink-900">{formatCurrency(r.total)}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'warranty' && (
        <>
          {warranties.length === 0 ? (
            <EmptyState icon="🛠️" title="No warranties tracked" subtitle="Save a purchase to get expiry reminders." />
          ) : (
            <div className="space-y-2">
              {warranties.map((r) => {
                const daysLeft = r.warrantyExpires
                  ? Math.ceil((new Date(r.warrantyExpires).getTime() - Date.now()) / 86400000)
                  : null
                const expired = daysLeft !== null && daysLeft < 0
                const soon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30
                return (
                  <Card key={r.id} onClick={() => navigate(`/receipts/${r.id}`)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-ink-900">{r.productName || r.merchant}</p>
                        <p className="text-xs text-ink-500">
                          Bought {new Date(r.date).toLocaleDateString()} · {formatCurrency(r.total)}
                        </p>
                      </div>
                      <Badge tone={expired ? 'red' : soon ? 'amber' : 'brand'}>
                        {expired ? 'Expired' : daysLeft !== null ? `${daysLeft}d left` : '—'}
                      </Badge>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </Screen>
  )
}

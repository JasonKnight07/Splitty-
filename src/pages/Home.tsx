import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Badge, Button, Card, EmptyState, Screen, ScreenHeader } from '../components/ui'
import { CameraIcon } from '../components/icons'
import { useApp } from '../context/AppContext'
import { computeGrandTotal, computePersonTotals } from '../lib/calc'
import { formatCurrency } from '../lib/currency'
import type { Bill, SavedReceipt } from '../types'

type Tab = 'bills' | 'receipts' | 'appliances'

export default function Home() {
  const { client, user, signIn } = useApp()
  const navigate = useNavigate()
  const [bills, setBills] = useState<Bill[]>([])
  const [receipts, setReceipts] = useState<SavedReceipt[]>([])
  const [name, setName] = useState('')
  const [tab, setTab] = useState<Tab>('bills')

  useEffect(() => {
    if (!client) return
    client.listBills().then(setBills)
    client.listReceipts().then(setReceipts)
  }, [client])

  if (!user) {
    return (
      <Screen>
        <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
          <div className="mb-2 text-5xl">🧾</div>
          <h1 className="text-3xl font-extrabold text-ink-900">Splitty</h1>
          <p className="mt-2 max-w-xs text-ink-500">
            Scan the slip, split the bill, keep the receipts.
          </p>
          <div className="mt-8 w-full max-w-xs space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-full border border-ink-200 bg-white px-4 py-3 text-center outline-none focus:border-brand-500"
            />
            <Button
              className="w-full"
              disabled={!name.trim()}
              onClick={() => signIn(name.trim(), `${name.trim().toLowerCase().replace(/\s+/g, '.')}@demo.splitty.app`)}
            >
              Get started
            </Button>
            <p className="text-xs text-ink-400">Demo mode &mdash; no password needed. Your data stays on this device.</p>
          </div>
        </div>
      </Screen>
    )
  }

  const openBills = bills.filter((b) => b.people.length > 0)
  const expenseReceipts = receipts.filter((r) => r.kind === 'expense')
  const applianceReceipts = receipts
    .filter((r) => r.kind === 'warranty')
    .sort((a, b) => (a.warrantyExpires ?? '').localeCompare(b.warrantyExpires ?? ''))

  return (
    <Screen>
      <ScreenHeader
        title={`Hey, ${user.name.split(' ')[0]} 👋`}
        subtitle="What are we splitting today?"
      />

      <Card onClick={() => navigate('/scan')} className="mb-2 flex items-center justify-center gap-2 rounded-full py-3.5">
        <CameraIcon className="h-5 w-5 text-brand-600" />
        <span className="text-sm font-bold text-ink-900">Scan</span>
      </Card>
      <button
        onClick={() => navigate('/scan?mode=manual')}
        className="mb-6 w-full text-center text-xs font-semibold text-ink-400 underline"
      >
        Or enter items manually
      </button>

      <div className="mb-4 flex rounded-full bg-ink-100 p-1">
        {(
          [
            ['bills', 'Bills'],
            ['receipts', 'Receipts'],
            ['appliances', 'Appliances'],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2 text-xs font-bold transition sm:text-sm ${
              tab === t ? 'bg-white text-brand-700 shadow-card' : 'text-ink-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'bills' ? (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink-900">Your bills</h2>
            {bills.length > 0 && (
              <button onClick={() => navigate('/scan')} className="text-sm font-semibold text-brand-700">
                + New
              </button>
            )}
          </div>

          {openBills.length === 0 ? (
            <EmptyState icon="🍽️" title="No bills yet" subtitle="Scan a receipt to start splitting with friends." />
          ) : (
            <div className="space-y-3">
              {openBills.map((bill) => {
                const totals = computePersonTotals(bill)
                const you = bill.people.find((p) => p.name === 'You') ?? bill.people[0]
                const yourTotal = you ? totals.get(you.id)?.total ?? 0 : 0
                return (
                  <Card key={bill.id} onClick={() => navigate(`/bill/${bill.id}`)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-ink-900">{bill.name}</p>
                        <p className="text-xs text-ink-500">
                          {new Date(bill.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ·{' '}
                          {bill.people.length} {bill.people.length === 1 ? 'person' : 'people'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-ink-900">{formatCurrency(computeGrandTotal(bill))}</p>
                        <p className="text-xs text-brand-700">you owe {formatCurrency(yourTotal)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex -space-x-2">
                      {bill.people.map((p) => (
                        <Avatar key={p.id} name={p.name} size="sm" />
                      ))}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      ) : tab === 'receipts' ? (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink-900">Saved receipts</h2>
            {expenseReceipts.length > 0 && (
              <button onClick={() => navigate('/receipts')} className="text-sm font-semibold text-brand-700">
                View all
              </button>
            )}
          </div>

          {expenseReceipts.length === 0 ? (
            <EmptyState icon="🧾" title="No receipts yet" subtitle="Scan a receipt and save it as a tax expense." />
          ) : (
            <div className="space-y-3">
              {expenseReceipts.slice(0, 5).map((r) => (
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
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink-900">Appliances &amp; purchases</h2>
            {applianceReceipts.length > 0 && (
              <button onClick={() => navigate('/receipts')} className="text-sm font-semibold text-brand-700">
                View all
              </button>
            )}
          </div>

          {applianceReceipts.length === 0 ? (
            <EmptyState icon="🛠️" title="No appliances tracked" subtitle="Save a purchase to get warranty expiry reminders." />
          ) : (
            <div className="space-y-3">
              {applianceReceipts.slice(0, 5).map((r) => {
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
                          Bought {new Date(r.date).toLocaleDateString()} &middot; {formatCurrency(r.total)}
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

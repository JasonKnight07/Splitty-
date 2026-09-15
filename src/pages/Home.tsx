import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, Badge, Button, Card, EmptyState, Screen, ScreenHeader } from '../components/ui'
import { useApp } from '../context/AppContext'
import { computeGrandTotal, computePersonTotals } from '../lib/calc'
import { formatCurrency } from '../lib/currency'
import type { Bill, SavedReceipt } from '../types'

export default function Home() {
  const { client, user, signIn } = useApp()
  const navigate = useNavigate()
  const [bills, setBills] = useState<Bill[]>([])
  const [receipts, setReceipts] = useState<SavedReceipt[]>([])
  const [name, setName] = useState('')

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

  return (
    <Screen>
      <ScreenHeader
        title={`Hey, ${user.name.split(' ')[0]} 👋`}
        subtitle="What are we splitting today?"
      />

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Card onClick={() => navigate('/scan')} className="bg-brand-600 text-white">
          <div className="text-2xl">📷</div>
          <p className="mt-2 font-bold">Scan a slip</p>
          <p className="text-xs text-brand-100">Capture items instantly</p>
        </Card>
        <Card onClick={() => navigate('/scan?mode=manual')}>
          <div className="text-2xl">✏️</div>
          <p className="mt-2 font-bold text-ink-900">Enter manually</p>
          <p className="text-xs text-ink-500">Type in a total to split</p>
        </Card>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink-900">Recent bills</h2>
        {bills.length > 0 && (
          <Link to="/scan" className="text-sm font-semibold text-brand-700">
            + New
          </Link>
        )}
      </div>

      {openBills.length === 0 ? (
        <EmptyState icon="🍽️" title="No bills yet" subtitle="Scan a receipt to start splitting with friends." />
      ) : (
        <div className="space-y-3">
          {openBills.slice(0, 5).map((bill) => {
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

      {receipts.length > 0 && (
        <>
          <div className="mb-3 mt-8 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink-900">Saved receipts</h2>
            <Link to="/receipts" className="text-sm font-semibold text-brand-700">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {receipts.slice(0, 3).map((r) => (
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
        </>
      )}
    </Screen>
  )
}

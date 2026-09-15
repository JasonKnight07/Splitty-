import { useState } from 'react'
import { Avatar, Badge, Button, Card, Screen, ScreenHeader } from '../components/ui'
import { useApp } from '../context/AppContext'
import { getCurrency, setCurrency } from '../lib/currency'
import type { SubscriptionPlan } from '../types'

const PLANS: { id: SubscriptionPlan; name: string; price: string; perks: string[] }[] = [
  { id: 'free', name: 'Free', price: 'R0', perks: ['Split bills with friends', '3 receipt scans / month', 'Basic tip presets'] },
  {
    id: 'plus',
    name: 'Plus',
    price: 'R95/mo',
    perks: ['Unlimited receipt scans', 'Full tax expense vault + CSV export', 'Warranty tracking & reminders'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R189/mo',
    perks: ['Everything in Plus', 'Multiple businesses / categories', 'Priority support'],
  },
]

const CURRENCIES = ['ZAR', 'USD', 'GBP', 'EUR', 'AUD', 'CAD']

export default function Settings() {
  const { user, subscription, signOut, client, refreshSubscription } = useApp()
  const [currency, setCurrencyState] = useState(getCurrency())
  const [busyPlan, setBusyPlan] = useState<SubscriptionPlan | null>(null)

  async function choosePlan(plan: SubscriptionPlan) {
    if (!client || plan === subscription?.plan) return
    setBusyPlan(plan)
    try {
      if (client.mode === 'supabase') {
        const res = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan, email: user?.email, userId: user?.id }),
        })
        const { url } = await res.json()
        if (url) window.location.href = url
      } else {
        await client.setSubscription({ plan, status: 'active' })
        await refreshSubscription()
      }
    } finally {
      setBusyPlan(null)
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Settings" />

      {user && (
        <Card className="mb-4 flex items-center gap-3">
          <Avatar name={user.name} size="lg" />
          <div>
            <p className="font-bold text-ink-900">{user.name}</p>
            <p className="text-sm text-ink-500">{user.email}</p>
          </div>
        </Card>
      )}

      <h2 className="mb-2 text-lg font-bold text-ink-900">Subscription</h2>
      <div className="mb-4 space-y-2">
        {PLANS.map((plan) => {
          const active = subscription?.plan === plan.id
          return (
            <Card key={plan.id} className={active ? 'border-brand-500' : ''}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-ink-900">{plan.name}</p>
                    {active && <Badge tone="brand">Current plan</Badge>}
                  </div>
                  <p className="text-sm text-ink-500">{plan.price}</p>
                </div>
                {!active && (
                  <Button
                    variant="secondary"
                    className="px-4 py-2 text-xs"
                    disabled={busyPlan !== null}
                    onClick={() => choosePlan(plan.id)}
                  >
                    {busyPlan === plan.id ? 'Loading…' : plan.id === 'free' ? 'Downgrade' : 'Upgrade'}
                  </Button>
                )}
              </div>
              <ul className="mt-2 space-y-1 text-xs text-ink-500">
                {plan.perks.map((perk) => (
                  <li key={perk}>✓ {perk}</li>
                ))}
              </ul>
            </Card>
          )
        })}
      </div>
      {client?.mode === 'demo' && (
        <p className="mb-6 -mt-2 text-xs text-ink-400">
          Demo mode: plan changes are simulated locally. Connect Stripe + Supabase to take real payments.
        </p>
      )}

      <h2 className="mb-2 text-lg font-bold text-ink-900">Preferences</h2>
      <Card className="mb-6">
        <p className="mb-2 text-sm font-semibold text-ink-700">Currency</p>
        <div className="flex flex-wrap gap-2">
          {CURRENCIES.map((c) => (
            <button
              key={c}
              onClick={() => {
                setCurrency(c)
                setCurrencyState(c)
              }}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                currency === c ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 text-ink-600'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </Card>

      <Button variant="ghost" className="w-full" onClick={signOut}>
        Sign out
      </Button>
    </Screen>
  )
}

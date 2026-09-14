import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar, Badge, Button, Card, Screen, ScreenHeader } from '../components/ui'
import { TipSelector } from '../components/TipSelector'
import { useApp } from '../context/AppContext'
import {
  computeCoupleTotals,
  computeGrandTotal,
  computePersonTotals,
  computeTip,
  unclaimedItems,
} from '../lib/calc'
import { formatCurrency } from '../lib/currency'
import { newId } from '../lib/id'
import type { Bill, Person, SplitMode, TipMode } from '../types'

export default function SplitBill() {
  const { id } = useParams<{ id: string }>()
  const { client } = useApp()
  const navigate = useNavigate()
  const [bill, setBill] = useState<Bill | null>(null)
  const [newPersonName, setNewPersonName] = useState('')
  const [pairing, setPairing] = useState<string[]>([])
  const [pairingOpen, setPairingOpen] = useState(false)
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!client || !id) return
    client.getBill(id).then(setBill)
  }, [client, id])

  function persist(next: Bill) {
    setBill(next)
    client?.saveBill(next)
  }

  const personTotals = useMemo(() => (bill ? computePersonTotals(bill) : new Map()), [bill])
  const coupleTotals = useMemo(() => (bill ? computeCoupleTotals(bill, personTotals) : []), [bill, personTotals])
  const solo = useMemo(
    () => (bill ? bill.people.filter((p) => !p.coupleId) : []),
    [bill],
  )
  const missing = useMemo(() => (bill && bill.splitMode === 'items' ? unclaimedItems(bill) : []), [bill])

  if (!bill) {
    return (
      <Screen>
        <p className="py-20 text-center text-ink-400">Loading bill&hellip;</p>
      </Screen>
    )
  }

  function addPerson() {
    const name = newPersonName.trim()
    if (!name || !bill) return
    const person: Person = { id: newId(), name }
    persist({ ...bill, people: [...bill.people, person] })
    setNewPersonName('')
  }

  function removePerson(personId: string) {
    if (!bill) return
    persist({
      ...bill,
      people: bill.people.filter((p) => p.id !== personId),
      couples: bill.couples
        .filter((c) => !c.personIds.includes(personId))
        .map((c) => c),
      claims: bill.claims.map((c) => ({ ...c, personIds: c.personIds.filter((id) => id !== personId) })),
    })
  }

  function togglePairing(personId: string) {
    setPairing((cur) => {
      if (cur.includes(personId)) return cur.filter((id) => id !== personId)
      if (cur.length >= 2) return [cur[1], personId]
      return [...cur, personId]
    })
  }

  function confirmPairing() {
    if (!bill || pairing.length !== 2) return
    const [a, b] = pairing
    const coupleId = newId()
    const names = bill.people.filter((p) => pairing.includes(p.id)).map((p) => p.name)
    persist({
      ...bill,
      couples: [...bill.couples, { id: coupleId, name: `${names[0]} & ${names[1]}`, personIds: [a, b] }],
      people: bill.people.map((p) => (pairing.includes(p.id) ? { ...p, coupleId } : p)),
    })
    setPairing([])
    setPairingOpen(false)
  }

  function unpair(coupleId: string) {
    if (!bill) return
    persist({
      ...bill,
      couples: bill.couples.filter((c) => c.id !== coupleId),
      people: bill.people.map((p) => (p.coupleId === coupleId ? { ...p, coupleId: undefined } : p)),
    })
  }

  function setSplitMode(mode: SplitMode) {
    if (!bill) return
    persist({ ...bill, splitMode: mode })
  }

  function setTipMode(mode: TipMode) {
    if (!bill) return
    persist({ ...bill, tipMode: mode })
  }

  function setCustomTip(amount: number) {
    if (!bill) return
    persist({ ...bill, customTipAmount: amount })
  }

  function toggleClaim(itemId: string, personId: string) {
    if (!bill) return
    const existing = bill.claims.find((c) => c.itemId === itemId)
    let claims
    if (!existing) {
      claims = [...bill.claims, { itemId, personIds: [personId] }]
    } else {
      const has = existing.personIds.includes(personId)
      claims = bill.claims.map((c) =>
        c.itemId === itemId
          ? { ...c, personIds: has ? c.personIds.filter((id) => id !== personId) : [...c.personIds, personId] }
          : c,
      )
    }
    persist({ ...bill, claims })
  }

  function claimantsFor(itemId: string): string[] {
    if (!bill) return []
    return bill.claims.find((c) => c.itemId === itemId)?.personIds ?? []
  }

  async function copySummary() {
    if (!bill) return
    const lines = [`${bill.name} — ${formatCurrency(computeGrandTotal(bill))}`, '']
    for (const p of solo) {
      lines.push(`${p.name}: ${formatCurrency(personTotals.get(p.id)?.total ?? 0)}`)
    }
    for (const c of coupleTotals) {
      lines.push(`${c.name} (together): ${formatCurrency(c.total)}`)
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <Screen>
      <ScreenHeader
        title={bill.name}
        subtitle={`${bill.merchant || 'Manual entry'} · ${new Date(bill.date).toLocaleDateString()}`}
        right={
          <button
            onClick={async () => {
              if (confirm('Delete this bill?')) {
                await client?.deleteBill(bill.id)
                navigate('/')
              }
            }}
            className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600"
          >
            Delete
          </button>
        }
      />

      {/* Split mode */}
      <div className="mb-4 flex rounded-full bg-ink-100 p-1">
        {(
          [
            ['items', 'By item'],
            ['equal', 'Equally'],
          ] as [SplitMode, string][]
        ).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => setSplitMode(mode)}
            className={`flex-1 rounded-full py-2 text-sm font-bold transition ${
              bill.splitMode === mode ? 'bg-white text-brand-700 shadow-card' : 'text-ink-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* People */}
      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-ink-700">People</p>
          <button
            onClick={() => setPairingOpen((v) => !v)}
            className="text-xs font-semibold text-brand-700 disabled:text-ink-300"
            disabled={bill.people.length < 2}
          >
            {pairingOpen ? 'Cancel pairing' : '💑 Pair as couple'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {bill.people.map((p) => (
            <div
              key={p.id}
              onClick={() => pairingOpen && togglePairing(p.id)}
              className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 ${
                pairingOpen && pairing.includes(p.id) ? 'border-brand-600 bg-brand-50' : 'border-ink-100'
              } ${pairingOpen ? 'cursor-pointer' : ''}`}
            >
              <Avatar name={p.name} size="sm" />
              <span className="text-sm font-medium">{p.name}</span>
              {!pairingOpen && p.name !== 'You' && (
                <button onClick={() => removePerson(p.id)} className="text-ink-300">
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
        {pairingOpen && (
          <Button className="mt-3 w-full" disabled={pairing.length !== 2} onClick={confirmPairing}>
            Confirm pair
          </Button>
        )}
        {bill.couples.length > 0 && !pairingOpen && (
          <div className="mt-2 flex flex-wrap gap-2">
            {bill.couples.map((c) => (
              <Badge key={c.id} tone="brand">
                💑 {c.name}{' '}
                <button onClick={() => unpair(c.id)} className="ml-1">
                  &times;
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <input
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPerson()}
            placeholder="Add a person"
            className="min-w-0 flex-1 rounded-full border border-ink-200 px-4 py-2 text-sm outline-none focus:border-brand-500"
          />
          <Button variant="secondary" onClick={addPerson}>
            Add
          </Button>
        </div>
      </Card>

      {/* Items (item mode only) */}
      {bill.splitMode === 'items' && (
        <div className="mb-4 space-y-2">
          {missing.length > 0 && (
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              {missing.length} item{missing.length > 1 ? 's' : ''} not yet assigned to anyone
            </div>
          )}
          {bill.items.map((item) => {
            const claimants = claimantsFor(item.id)
            const isOpen = openItemId === item.id
            return (
              <Card key={item.id} className={claimants.length === 0 ? 'border-amber-300' : ''}>
                <button
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setOpenItemId(isOpen ? null : item.id)}
                >
                  <div>
                    <p className="font-semibold text-ink-900">{item.name}</p>
                    <div className="mt-1 flex -space-x-1.5">
                      {claimants.length === 0 ? (
                        <span className="text-xs text-amber-700">Tap to assign</span>
                      ) : (
                        claimants.map((pid) => {
                          const person = bill.people.find((p) => p.id === pid)
                          return person ? <Avatar key={pid} name={person.name} size="sm" /> : null
                        })
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-ink-900">{formatCurrency(item.price)}</p>
                </button>
                {isOpen && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
                    {bill.people.map((p) => {
                      const active = claimants.includes(p.id)
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggleClaim(item.id, p.id)}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                            active ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 text-ink-600'
                          }`}
                        >
                          <Avatar name={p.name} size="sm" />
                          {p.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Tip */}
      <Card className="mb-4">
        <TipSelector
          tipMode={bill.tipMode}
          customAmount={bill.customTipAmount ?? 0}
          subtotal={bill.subtotal}
          onChange={setTipMode}
          onCustomAmount={setCustomTip}
        />
      </Card>

      {/* Totals recap */}
      <Card className="mb-4 space-y-1 text-sm">
        <Row label="Subtotal" value={formatCurrency(bill.subtotal)} />
        <Row label="Tax" value={formatCurrency(bill.tax)} />
        <Row label="Tip" value={formatCurrency(computeTip(bill))} />
        <div className="mt-1 flex items-center justify-between border-t border-ink-100 pt-2 text-base font-extrabold text-ink-900">
          <span>Total</span>
          <span>{formatCurrency(computeGrandTotal(bill))}</span>
        </div>
      </Card>

      {/* Summary */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink-900">Who owes what</h2>
        <button onClick={copySummary} className="text-sm font-semibold text-brand-700">
          {copied ? 'Copied!' : 'Copy summary'}
        </button>
      </div>
      <div className="space-y-2">
        {coupleTotals.map((c) => (
          <Card key={c.coupleId}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {c.people.map((p) => (
                    <Avatar key={p.id} name={p.name} />
                  ))}
                </div>
                <div>
                  <p className="font-bold text-ink-900">{c.name}</p>
                  <p className="text-xs text-ink-400">paying together</p>
                </div>
              </div>
              <p className="text-lg font-extrabold text-ink-900">{formatCurrency(c.total)}</p>
            </div>
            <div className="mt-2 flex justify-between border-t border-ink-100 pt-2 text-xs text-ink-500">
              {c.people.map((p) => (
                <span key={p.id}>
                  {p.name}'s share: {formatCurrency(personTotals.get(p.id)?.total ?? 0)}
                </span>
              ))}
            </div>
          </Card>
        ))}
        {solo.map((p) => (
          <Card key={p.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={p.name} />
                <p className="font-bold text-ink-900">{p.name}</p>
              </div>
              <p className="text-lg font-extrabold text-ink-900">
                {formatCurrency(personTotals.get(p.id)?.total ?? 0)}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </Screen>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-ink-500">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

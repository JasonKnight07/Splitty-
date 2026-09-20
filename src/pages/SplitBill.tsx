import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar, Badge, Button, Card, Screen, ScreenHeader } from '../components/ui'
import { SlipDivider, SlipHeader, SlipRow, SlipTotalRow, TillSlip } from '../components/TillSlip'
import { TipSelector } from '../components/TipSelector'
import { useApp } from '../context/AppContext'
import {
  claimFor,
  computeCoupleTotals,
  computeGrandTotal,
  computePersonTotals,
  computeTip,
  round2,
  unclaimedUnits,
  unitsClaimedBy,
  unitsForItem,
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
  const [actingAsId, setActingAsId] = useState<string | null>(null)

  useEffect(() => {
    if (!client || !id) return
    client.getBill(id).then(setBill)
  }, [client, id])

  useEffect(() => {
    if (!bill || bill.people.length === 0) return
    if (actingAsId && bill.people.some((p) => p.id === actingAsId)) return
    setActingAsId(bill.people.find((p) => p.name === 'You')?.id ?? bill.people[0].id)
  }, [bill, actingAsId])

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
  const missing = useMemo(() => (bill && bill.splitMode === 'items' ? unclaimedUnits(bill) : []), [bill])
  const myUnits = useMemo(
    () => (bill && actingAsId ? unitsClaimedBy(bill, actingAsId) : []),
    [bill, actingAsId],
  )
  const actingAs = bill?.people.find((p) => p.id === actingAsId)

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

  /** Toggles one person on/off a specific unit — used by the per-unit "share this" panel. */
  function toggleUnitClaim(itemId: string, unitIndex: number, personId: string) {
    if (!bill) return
    const existing = claimFor(bill, itemId, unitIndex)
    let claims
    if (!existing) {
      claims = [...bill.claims, { itemId, unitIndex, personIds: [personId] }]
    } else {
      const has = existing.personIds.includes(personId)
      claims = bill.claims.map((c) =>
        c.itemId === itemId && c.unitIndex === unitIndex
          ? { ...c, personIds: has ? c.personIds.filter((id) => id !== personId) : [...c.personIds, personId] }
          : c,
      )
    }
    persist({ ...bill, claims })
  }

  /** Tapping an item on the main slip: pull the next free unit onto your own slip. */
  function grabNextUnit(itemId: string) {
    if (!bill || !actingAsId) return
    const item = bill.items.find((i) => i.id === itemId)
    if (!item) return
    for (let u = 0; u < item.quantity; u++) {
      if (!claimFor(bill, itemId, u)?.personIds.length) {
        toggleUnitClaim(itemId, u, actingAsId)
        return
      }
    }
  }

  /** Tapping a line on your own slip: send it back to the main slip. */
  function releaseUnit(itemId: string, unitIndex: number) {
    if (!actingAsId) return
    toggleUnitClaim(itemId, unitIndex, actingAsId)
  }

  function claimantsFor(itemId: string, unitIndex: number): string[] {
    if (!bill) return []
    return claimFor(bill, itemId, unitIndex)?.personIds ?? []
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
        <div className="mb-4 space-y-4">
          {bill.people.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="shrink-0 text-xs font-semibold text-ink-500">Acting as</span>
              {bill.people.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActingAsId(p.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                    actingAsId === p.id ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 text-ink-600'
                  }`}
                >
                  <Avatar name={p.name} size="sm" />
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {/* Your slip — fills up as you pull items off the main bill below */}
          <TillSlip torn>
            <SlipHeader
              merchant={bill.merchant || bill.name}
              date={bill.date}
              label={actingAs?.name === 'You' || !actingAs ? "Your slip" : `${actingAs.name}'s slip`}
            />
            {myUnits.length === 0 ? (
              <p className="py-3 text-center text-xs text-paper-faint">
                Tap items on the bill below to add them to your slip
              </p>
            ) : (
              <>
                {myUnits.map(({ item, unitIndex, unitPrice }) => {
                  const claimants = claimantsFor(item.id, unitIndex)
                  const yourShare = round2(unitPrice / claimants.length)
                  const others = claimants.filter((pid) => pid !== actingAsId)
                  return (
                    <SlipRow
                      key={`${item.id}-${unitIndex}`}
                      onClick={() => releaseUnit(item.id, unitIndex)}
                      left={item.quantity > 1 ? `${item.name} (1)` : item.name}
                      right={formatCurrency(yourShare)}
                      subtitle={
                        others.length > 0
                          ? `shared with ${others.map((pid) => bill.people.find((p) => p.id === pid)?.name).join(', ')} — tap to remove your share`
                          : 'tap to send back'
                      }
                    />
                  )
                })}
                <SlipDivider />
                <SlipTotalRow label="Your subtotal" value={formatCurrency(myUnits.reduce((s, { item, unitIndex, unitPrice }) => {
                  const claimants = claimantsFor(item.id, unitIndex)
                  return s + unitPrice / claimants.length
                }, 0))} strong />
              </>
            )}
          </TillSlip>

          {/* The main bill — everyone at the table sees the same slip */}
          <TillSlip>
            <SlipHeader merchant={bill.merchant || bill.name} date={bill.date} label="The bill" />
            {missing.length > 0 && (
              <p className="mb-2 rounded bg-amber-50 px-2 py-1.5 text-center text-[11px] font-semibold text-amber-800">
                {missing.length} unit{missing.length > 1 ? 's' : ''} still unclaimed
              </p>
            )}
            {bill.items.map((item) => {
              const units = unitsForItem(item)
              const isOpen = openItemId === item.id
              const claimedUnits = units.filter((u) => claimantsFor(item.id, u.unitIndex).length > 0)
              const fullyClaimed = claimedUnits.length === units.length

              const owners = Array.from(
                new Set(claimedUnits.flatMap((u) => claimantsFor(item.id, u.unitIndex)).filter((pid) => pid !== actingAsId)),
              )
                .map((pid) => bill.people.find((p) => p.id === pid)?.name)
                .filter(Boolean)

              let subtitle: string | undefined
              if (item.quantity > 1) {
                subtitle = `${formatCurrency(units[0].unitPrice)} each${
                  claimedUnits.length > 0 ? ` · ${units.length - claimedUnits.length} of ${units.length} left` : ` · ${units.length} left`
                }`
              }
              if (owners.length > 0) {
                subtitle = `${subtitle ? subtitle + ' · ' : ''}${owners.join(', ')} has ${owners.length === 1 && claimedUnits.length === 1 ? 'this' : 'some'}`
              }

              return (
                <div key={item.id}>
                  <SlipRow
                    onClick={fullyClaimed ? () => setOpenItemId(isOpen ? null : item.id) : () => grabNextUnit(item.id)}
                    left={item.name}
                    right={formatCurrency(item.price)}
                    subtitle={subtitle}
                    muted={fullyClaimed}
                  />
                  {(item.quantity > 1 || fullyClaimed) && (
                    <button
                      onClick={() => setOpenItemId(isOpen ? null : item.id)}
                      className="-mt-1 mb-1 text-[10px] font-semibold uppercase tracking-wide text-brand-700"
                    >
                      {isOpen ? 'Hide' : 'Edit who has this'}
                    </button>
                  )}
                  {isOpen && (
                    <div className="mb-2 space-y-1.5 rounded border border-dashed border-paper-300 p-2">
                      {units.map((u) => {
                        const claimants = claimantsFor(item.id, u.unitIndex)
                        return (
                          <div key={u.unitIndex} className="flex flex-wrap items-center gap-1.5">
                            {item.quantity > 1 && <span className="text-[10px] text-paper-faint">#{u.unitIndex + 1}</span>}
                            {bill.people.map((p) => {
                              const active = claimants.includes(p.id)
                              return (
                                <button
                                  key={p.id}
                                  onClick={() => toggleUnitClaim(item.id, u.unitIndex, p.id)}
                                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition ${
                                    active ? 'border-brand-600 bg-brand-600 text-white' : 'border-paper-300 text-paper-text'
                                  }`}
                                >
                                  {p.name}
                                </button>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </TillSlip>
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

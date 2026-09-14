import type { Bill, Person } from '../types'

export const TIP_RATES: Record<string, number> = {
  '10': 0.1,
  '12.5': 0.125,
  '15': 0.15,
}

/** Tip is calculated on the pre-tax subtotal, the common convention. */
export function computeTip(bill: Bill): number {
  if (bill.tipMode === 'custom') return bill.customTipAmount ?? 0
  if (bill.tipMode === 'none') return 0
  const rate = TIP_RATES[bill.tipMode] ?? 0
  return round2(bill.subtotal * rate)
}

export function computeGrandTotal(bill: Bill): number {
  return round2(bill.subtotal + bill.tax + computeTip(bill))
}

export interface PersonBreakdown {
  personId: string
  itemsTotal: number
  taxShare: number
  tipShare: number
  total: number
}

/**
 * Splits every item's cost evenly across the people claiming it, then loads
 * each person's item subtotal proportionally with their share of tax + tip
 * (so someone who ordered more pays proportionally more tax/tip too).
 */
export function computeItemPersonTotals(bill: Bill): Map<string, PersonBreakdown> {
  const totals = new Map<string, PersonBreakdown>()
  for (const person of bill.people) {
    totals.set(person.id, { personId: person.id, itemsTotal: 0, taxShare: 0, tipShare: 0, total: 0 })
  }

  const claimByItem = new Map(bill.claims.map((c) => [c.itemId, c.personIds]))

  for (const item of bill.items) {
    const claimants = claimByItem.get(item.id) ?? []
    if (claimants.length === 0) continue
    const share = item.price / claimants.length
    for (const pid of claimants) {
      const entry = totals.get(pid)
      if (entry) entry.itemsTotal = round2(entry.itemsTotal + share)
    }
  }

  const tip = computeTip(bill)
  const itemsSum = bill.items.reduce((s, i) => s + i.price, 0)

  for (const entry of totals.values()) {
    const proportion = itemsSum > 0 ? entry.itemsTotal / itemsSum : 0
    entry.taxShare = round2(bill.tax * proportion)
    entry.tipShare = round2(tip * proportion)
    entry.total = round2(entry.itemsTotal + entry.taxShare + entry.tipShare)
  }

  return totals
}

export function computeEqualPersonTotals(bill: Bill): Map<string, PersonBreakdown> {
  const totals = new Map<string, PersonBreakdown>()
  const n = bill.people.length || 1
  const grand = computeGrandTotal(bill)
  const each = round2(grand / n)
  for (const person of bill.people) {
    totals.set(person.id, {
      personId: person.id,
      itemsTotal: round2(bill.subtotal / n),
      taxShare: round2(bill.tax / n),
      tipShare: round2(computeTip(bill) / n),
      total: each,
    })
  }
  return totals
}

export function computePersonTotals(bill: Bill): Map<string, PersonBreakdown> {
  return bill.splitMode === 'equal' ? computeEqualPersonTotals(bill) : computeItemPersonTotals(bill)
}

export interface CoupleBreakdown {
  coupleId: string
  name: string
  people: Person[]
  total: number
}

/** Groups per-person totals into couples for a combined view, alongside the untouched individual totals. */
export function computeCoupleTotals(bill: Bill, personTotals: Map<string, PersonBreakdown>): CoupleBreakdown[] {
  return bill.couples.map((couple) => {
    const people = bill.people.filter((p) => couple.personIds.includes(p.id))
    const total = round2(people.reduce((s, p) => s + (personTotals.get(p.id)?.total ?? 0), 0))
    return { coupleId: couple.id, name: couple.name, people, total }
  })
}

export function unclaimedItems(bill: Bill) {
  const claimed = new Set(bill.claims.filter((c) => c.personIds.length > 0).map((c) => c.itemId))
  return bill.items.filter((i) => !claimed.has(i.id))
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

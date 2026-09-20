import type { Bill, ItemClaim, Person, ReceiptLineItem } from '../types'

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

export interface UnitRef {
  item: ReceiptLineItem
  /** 0-based index within item.quantity — e.g. "Craft Beer x2" has units 0 and 1, each independently claimable */
  unitIndex: number
  /** item.price divided across its quantity — the per-unit cost, worked out automatically when the receipt doesn't state one */
  unitPrice: number
}

export function unitsForItem(item: ReceiptLineItem): UnitRef[] {
  const unitPrice = round2(item.price / item.quantity)
  return Array.from({ length: item.quantity }, (_, unitIndex) => ({ item, unitIndex, unitPrice }))
}

export function allUnits(bill: Bill): UnitRef[] {
  return bill.items.flatMap(unitsForItem)
}

export function claimFor(bill: Bill, itemId: string, unitIndex: number): ItemClaim | undefined {
  return bill.claims.find((c) => c.itemId === itemId && c.unitIndex === unitIndex)
}

export interface PersonBreakdown {
  personId: string
  itemsTotal: number
  taxShare: number
  tipShare: number
  total: number
}

/**
 * Splits every unit's cost evenly across the people claiming it, then loads
 * each person's item subtotal proportionally with their share of tax + tip
 * (so someone who ordered more pays proportionally more tax/tip too).
 */
export function computeItemPersonTotals(bill: Bill): Map<string, PersonBreakdown> {
  const totals = new Map<string, PersonBreakdown>()
  for (const person of bill.people) {
    totals.set(person.id, { personId: person.id, itemsTotal: 0, taxShare: 0, tipShare: 0, total: 0 })
  }

  for (const unit of allUnits(bill)) {
    const claimants = claimFor(bill, unit.item.id, unit.unitIndex)?.personIds ?? []
    if (claimants.length === 0) continue
    const share = unit.unitPrice / claimants.length
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

/** Units nobody has claimed any part of yet — still sitting on the main slip. */
export function unclaimedUnits(bill: Bill): UnitRef[] {
  return allUnits(bill).filter((u) => (claimFor(bill, u.item.id, u.unitIndex)?.personIds.length ?? 0) === 0)
}

/** The units a given person has pulled onto their own slip (solely or shared). */
export function unitsClaimedBy(bill: Bill, personId: string): UnitRef[] {
  return allUnits(bill).filter((u) => claimFor(bill, u.item.id, u.unitIndex)?.personIds.includes(personId))
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

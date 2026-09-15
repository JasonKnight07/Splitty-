import type { AppUser, Bill, SavedReceipt, Subscription } from '../types'
import type { DataClient } from './dataClient'
import { newId } from './id'

const KEYS = {
  user: 'splitty.demo.user',
  bills: 'splitty.demo.bills',
  receipts: 'splitty.demo.receipts',
  subscription: 'splitty.demo.subscription',
  seeded: 'splitty.demo.seeded',
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

function seedIfEmpty() {
  if (read(KEYS.seeded, false)) return

  const alex = { id: 'p-alex', name: 'You' }
  const sam = { id: 'p-sam', name: 'Sam' }
  const jordan = { id: 'p-jordan', name: 'Jordan' }

  const items = [
    { id: 'i-1', name: 'Margherita Pizza', price: 145, quantity: 1 },
    { id: 'i-2', name: 'Caesar Salad', price: 90, quantity: 1 },
    { id: 'i-3', name: 'Craft Beer x2', price: 120, quantity: 2 },
    { id: 'i-4', name: 'Tiramisu', price: 75, quantity: 1 },
    { id: 'i-5', name: 'Sparkling Water', price: 40, quantity: 1 },
  ]

  const demoBill: Bill = {
    id: 'bill-demo-1',
    name: "Friday Dinner @ The Olive Tree",
    merchant: 'The Olive Tree',
    date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
    items,
    subtotal: items.reduce((s, i) => s + i.price, 0),
    tax: 70.5,
    people: [alex, sam, jordan],
    couples: [{ id: 'c-sam-jordan', name: 'Sam & Jordan', personIds: [sam.id, jordan.id] }],
    claims: [
      { itemId: 'i-1', personIds: [alex.id] },
      { itemId: 'i-2', personIds: [sam.id] },
      { itemId: 'i-3', personIds: [sam.id, jordan.id] },
      { itemId: 'i-4', personIds: [jordan.id] },
      { itemId: 'i-5', personIds: [alex.id] },
    ],
    splitMode: 'items',
    tipMode: '15',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  }

  const receipts: SavedReceipt[] = [
    {
      id: 'r-demo-1',
      merchant: 'Waltons',
      date: new Date(Date.now() - 86400000 * 10).toISOString().slice(0, 10),
      total: 843.2,
      kind: 'expense',
      category: 'business',
      notes: 'Printer paper + toner',
      items: [
        { id: 'ri-1', name: 'A4 Paper (5 reams)', price: 345, quantity: 1 },
        { id: 'ri-2', name: 'Toner Cartridge', price: 498.2, quantity: 1 },
      ],
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
      id: 'r-demo-2',
      merchant: 'Game',
      date: new Date(Date.now() - 86400000 * 60).toISOString().slice(0, 10),
      total: 6490.0,
      kind: 'warranty',
      category: 'personal',
      productName: 'LG 400L Fridge',
      warrantyMonths: 24,
      warrantyExpires: new Date(Date.now() + 86400000 * 305).toISOString().slice(0, 10),
      items: [{ id: 'ri-3', name: 'LG 400L Fridge', price: 6490.0, quantity: 1 }],
      createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    },
  ]

  write(KEYS.bills, [demoBill])
  write(KEYS.receipts, receipts)
  write(KEYS.subscription, { plan: 'free', status: 'active' } satisfies Subscription)
  write(KEYS.seeded, true)
}

export class DemoDataClient implements DataClient {
  readonly mode = 'demo' as const

  constructor() {
    seedIfEmpty()
  }

  async getCurrentUser(): Promise<AppUser | null> {
    return read<AppUser | null>(KEYS.user, null)
  }

  async signIn(name: string, email: string): Promise<AppUser> {
    const user: AppUser = { id: newId(), name, email }
    write(KEYS.user, user)
    return user
  }

  async signOut(): Promise<void> {
    window.localStorage.removeItem(KEYS.user)
  }

  async listBills(): Promise<Bill[]> {
    return read<Bill[]>(KEYS.bills, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async getBill(id: string): Promise<Bill | null> {
    const bills = read<Bill[]>(KEYS.bills, [])
    return bills.find((b) => b.id === id) ?? null
  }

  async saveBill(bill: Bill): Promise<Bill> {
    const bills = read<Bill[]>(KEYS.bills, [])
    const idx = bills.findIndex((b) => b.id === bill.id)
    if (idx >= 0) bills[idx] = bill
    else bills.unshift(bill)
    write(KEYS.bills, bills)
    return bill
  }

  async deleteBill(id: string): Promise<void> {
    write(
      KEYS.bills,
      read<Bill[]>(KEYS.bills, []).filter((b) => b.id !== id),
    )
  }

  async listReceipts(): Promise<SavedReceipt[]> {
    return read<SavedReceipt[]>(KEYS.receipts, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async saveReceipt(receipt: SavedReceipt): Promise<SavedReceipt> {
    const receipts = read<SavedReceipt[]>(KEYS.receipts, [])
    const idx = receipts.findIndex((r) => r.id === receipt.id)
    if (idx >= 0) receipts[idx] = receipt
    else receipts.unshift(receipt)
    write(KEYS.receipts, receipts)
    return receipt
  }

  async deleteReceipt(id: string): Promise<void> {
    write(
      KEYS.receipts,
      read<SavedReceipt[]>(KEYS.receipts, []).filter((r) => r.id !== id),
    )
  }

  async getSubscription(): Promise<Subscription> {
    return read<Subscription>(KEYS.subscription, { plan: 'free', status: 'active' })
  }

  async setSubscription(sub: Subscription): Promise<void> {
    write(KEYS.subscription, sub)
  }
}

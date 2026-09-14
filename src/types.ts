export type TipMode = '10' | '12.5' | '15' | 'custom' | 'none'

export interface ReceiptLineItem {
  id: string
  name: string
  price: number
  quantity: number
}

export interface ScannedReceipt {
  merchant: string
  date: string // ISO date
  items: ReceiptLineItem[]
  subtotal: number
  tax: number
  total: number
}

export type SplitMode = 'items' | 'equal' | 'couples'

export interface Person {
  id: string
  name: string
  /** id of the couple this person belongs to, if any */
  coupleId?: string
}

export interface Couple {
  id: string
  name: string
  personIds: [string, string]
}

export interface ItemClaim {
  itemId: string
  /** person ids sharing this item; item cost is split evenly across them */
  personIds: string[]
}

export interface Bill {
  id: string
  name: string
  merchant: string
  date: string
  items: ReceiptLineItem[]
  subtotal: number
  tax: number
  people: Person[]
  couples: Couple[]
  claims: ItemClaim[]
  splitMode: SplitMode
  tipMode: TipMode
  customTipAmount?: number
  createdAt: string
}

export type ReceiptCategory = 'personal' | 'business'
export type ReceiptKind = 'expense' | 'warranty'

export interface SavedReceipt {
  id: string
  merchant: string
  date: string
  total: number
  kind: ReceiptKind
  category: ReceiptCategory
  notes?: string
  imageDataUrl?: string
  items: ReceiptLineItem[]
  /** warranty-only */
  warrantyMonths?: number
  warrantyExpires?: string
  productName?: string
  createdAt: string
}

export type SubscriptionPlan = 'free' | 'plus' | 'pro'

export interface Subscription {
  plan: SubscriptionPlan
  status: 'active' | 'trialing' | 'past_due' | 'canceled'
  renewsAt?: string
}

export interface AppUser {
  id: string
  name: string
  email: string
}

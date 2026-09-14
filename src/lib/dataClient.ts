import type { AppUser, Bill, SavedReceipt, Subscription } from '../types'

export interface DataClient {
  readonly mode: 'demo' | 'supabase'

  getCurrentUser(): Promise<AppUser | null>
  signIn(name: string, email: string): Promise<AppUser>
  signOut(): Promise<void>

  listBills(): Promise<Bill[]>
  getBill(id: string): Promise<Bill | null>
  saveBill(bill: Bill): Promise<Bill>
  deleteBill(id: string): Promise<void>

  listReceipts(): Promise<SavedReceipt[]>
  saveReceipt(receipt: SavedReceipt): Promise<SavedReceipt>
  deleteReceipt(id: string): Promise<void>

  getSubscription(): Promise<Subscription>
  setSubscription(sub: Subscription): Promise<void>
}

/**
 * Splitty runs against a real Supabase backend when the env vars below are
 * configured, and otherwise falls back to a fully-functional local demo
 * client (localStorage) so the app is clickable out of the box.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

let singleton: DataClient | null = null

export async function getDataClient(): Promise<DataClient> {
  if (singleton) return singleton
  if (isSupabaseConfigured()) {
    const { SupabaseDataClient } = await import('./supabaseClient')
    singleton = new SupabaseDataClient()
  } else {
    const { DemoDataClient } = await import('./demoClient')
    singleton = new DemoDataClient()
  }
  return singleton
}

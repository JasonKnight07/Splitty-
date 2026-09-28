import type { AppUser, Bill, Contact, FriendGroup, SavedReceipt, Subscription } from '../types'

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

  listContacts(): Promise<Contact[]>
  saveContact(contact: Contact): Promise<Contact>
  deleteContact(id: string): Promise<void>

  listGroups(): Promise<FriendGroup[]>
  saveGroup(group: FriendGroup): Promise<FriendGroup>
  deleteGroup(id: string): Promise<void>
}

/**
 * Splitty runs against a real Supabase backend when the env vars below are
 * configured, and otherwise falls back to a fully-functional local demo
 * client (localStorage) so the app is clickable out of the box.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

/**
 * Temporary override: Supabase is fully configured and working (magic-link
 * sign-in was verified end to end), but email sign-in is paused for now in
 * favor of a frictionless name-only flow. Flip this back to
 * `isSupabaseConfigured()` whenever real accounts/email sign-in should
 * return — no other setup needs to be redone, the Supabase project and its
 * env vars are untouched.
 */
function shouldUseSupabase(): boolean {
  return false
}

let singleton: DataClient | null = null

export async function getDataClient(): Promise<DataClient> {
  if (singleton) return singleton
  if (shouldUseSupabase()) {
    const { SupabaseDataClient } = await import('./supabaseClient')
    singleton = new SupabaseDataClient()
  } else {
    const { DemoDataClient } = await import('./demoClient')
    singleton = new DemoDataClient()
  }
  return singleton
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AppUser, Bill, SavedReceipt, Subscription } from '../types'
import type { DataClient } from './dataClient'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON_KEY!)
  }
  return client
}

/**
 * Maps Splitty's app-level `Bill`/`SavedReceipt` shapes onto the Postgres
 * schema in supabase/migrations/0001_init.sql. See that file for the table
 * definitions this reads and writes.
 */
export class SupabaseDataClient implements DataClient {
  readonly mode = 'supabase' as const

  private get sb() {
    return getSupabase()
  }

  async getCurrentUser(): Promise<AppUser | null> {
    const { data } = await this.sb.auth.getUser()
    if (!data.user) return null
    return {
      id: data.user.id,
      name: (data.user.user_metadata?.name as string) ?? data.user.email ?? 'You',
      email: data.user.email ?? '',
    }
  }

  async signIn(_name: string, email: string): Promise<AppUser> {
    const { error } = await this.sb.auth.signInWithOtp({ email })
    if (error) throw error
    // Magic-link flow: the user completes sign-in via the emailed link.
    return { id: '', name: _name, email }
  }

  async signOut(): Promise<void> {
    await this.sb.auth.signOut()
  }

  async listBills(): Promise<Bill[]> {
    const { data, error } = await this.sb
      .from('bills')
      .select('data')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((row) => row.data as Bill)
  }

  async getBill(id: string): Promise<Bill | null> {
    const { data, error } = await this.sb.from('bills').select('data').eq('id', id).maybeSingle()
    if (error) throw error
    return (data?.data as Bill) ?? null
  }

  async saveBill(bill: Bill): Promise<Bill> {
    const { error } = await this.sb.from('bills').upsert({ id: bill.id, data: bill, created_at: bill.createdAt })
    if (error) throw error
    return bill
  }

  async deleteBill(id: string): Promise<void> {
    const { error } = await this.sb.from('bills').delete().eq('id', id)
    if (error) throw error
  }

  async listReceipts(): Promise<SavedReceipt[]> {
    const { data, error } = await this.sb
      .from('receipts')
      .select('data')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((row) => row.data as SavedReceipt)
  }

  async saveReceipt(receipt: SavedReceipt): Promise<SavedReceipt> {
    const { error } = await this.sb
      .from('receipts')
      .upsert({ id: receipt.id, data: receipt, created_at: receipt.createdAt })
    if (error) throw error
    return receipt
  }

  async deleteReceipt(id: string): Promise<void> {
    const { error } = await this.sb.from('receipts').delete().eq('id', id)
    if (error) throw error
  }

  async getSubscription(): Promise<Subscription> {
    const { data, error } = await this.sb.from('subscriptions').select('data').maybeSingle()
    if (error) throw error
    return (data?.data as Subscription) ?? { plan: 'free', status: 'active' }
  }

  async setSubscription(sub: Subscription): Promise<void> {
    const { error } = await this.sb.from('subscriptions').upsert({ id: 'me', data: sub })
    if (error) throw error
  }
}

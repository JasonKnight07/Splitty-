import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getDataClient, type DataClient } from '../lib/dataClient'
import type { AppUser, Subscription } from '../types'

interface AppContextValue {
  client: DataClient | null
  user: AppUser | null
  subscription: Subscription | null
  loading: boolean
  /** Resolves to { awaitingEmail: true } when a magic link was sent instead of signing in immediately (Supabase mode). */
  signIn: (name: string, email: string) => Promise<{ awaitingEmail: boolean }>
  signOut: () => Promise<void>
  refreshSubscription: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<DataClient | null>(null)
  const [user, setUser] = useState<AppUser | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getDataClient().then(async (c) => {
      if (cancelled) return
      setClient(c)
      const [u, sub] = await Promise.all([c.getCurrentUser(), c.getSubscription()])
      if (cancelled) return
      setUser(u)
      setSubscription(sub)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(
    async (name: string, email: string) => {
      if (!client) return { awaitingEmail: false }
      const u = await client.signIn(name, email)
      if (client.mode === 'demo') {
        setUser(u)
        return { awaitingEmail: false }
      }
      // Supabase mode: a magic link was emailed. Real sign-in completes when it's
      // clicked — the onAuthStateChange listener below picks that up and sets `user`.
      return { awaitingEmail: true }
    },
    [client],
  )

  // Supabase mode only: react to the session completing (e.g. after the magic-link
  // redirect lands back on the app) instead of only checking auth once at mount.
  useEffect(() => {
    if (!client || client.mode !== 'supabase') return
    let unsubscribe: (() => void) | undefined
    let cancelled = false
    ;(async () => {
      const { getSupabase } = await import('../lib/supabaseClient')
      if (cancelled) return
      const sb = getSupabase()
      const { data } = sb.auth.onAuthStateChange(async () => {
        setUser(await client.getCurrentUser())
      })
      unsubscribe = () => data.subscription.unsubscribe()
    })()
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [client])

  const signOut = useCallback(async () => {
    if (!client) return
    await client.signOut()
    setUser(null)
  }, [client])

  const refreshSubscription = useCallback(async () => {
    if (!client) return
    setSubscription(await client.getSubscription())
  }, [client])

  const value = useMemo(
    () => ({ client, user, subscription, loading, signIn, signOut, refreshSubscription }),
    [client, user, subscription, loading, signIn, signOut, refreshSubscription],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

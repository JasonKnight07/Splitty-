import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getDataClient, type DataClient } from '../lib/dataClient'
import type { AppUser, Subscription } from '../types'

interface AppContextValue {
  client: DataClient | null
  user: AppUser | null
  subscription: Subscription | null
  loading: boolean
  signIn: (name: string, email: string) => Promise<void>
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
      if (!client) return
      const u = await client.signIn(name, email)
      setUser(u)
    },
    [client],
  )

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

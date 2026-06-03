import { createElement, createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../firebase/firebase'
import { fetchUserProfile, fetchHousehold } from '../firebase/householdFirestore'
import { GUEST_HOUSEHOLD_ID, initGuestStore } from '../firebase/guestStore'
import { buildGuestData } from '../data/guestData'
import type { TransactionListDisplayMode } from '../types'

export type HouseholdState = 'loading' | 'unauthenticated' | 'needs_setup' | 'ready' | 'error'

interface HouseholdContextValue {
  user: User | null
  householdId: string | null
  state: HouseholdState
  payDay: number | null
  transactionListDisplayMode: TransactionListDisplayMode
  isGuest: boolean
  reloadHousehold: () => Promise<void>
}

const HouseholdContext = createContext<HouseholdContextValue>({
  user: null,
  householdId: null,
  state: 'loading',
  payDay: null,
  transactionListDisplayMode: 'date',
  isGuest: false,
  reloadHousehold: async () => {},
})

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [state, setState] = useState<HouseholdState>('loading')
  const [payDay, setPayDay] = useState<number | null>(null)
  const [transactionListDisplayMode, setTransactionListDisplayMode] =
    useState<TransactionListDisplayMode>('date')

  async function loadHousehold(firebaseUser: User) {
    try {
      const profile = await fetchUserProfile(firebaseUser.uid)
      if (profile?.householdId) {
        setHouseholdId(profile.householdId)
        const household = await fetchHousehold(profile.householdId)
        setPayDay(household?.payDay ?? null)
        setTransactionListDisplayMode(household?.transactionListDisplayMode ?? 'date')
        setState('ready')
      } else {
        setHouseholdId(null)
        setPayDay(null)
        setTransactionListDisplayMode('date')
        setState('needs_setup')
      }
    } catch (err) {
      console.warn('[useHousehold] loadHousehold failed:', err)
      setHouseholdId(null)
      setPayDay(null)
      setTransactionListDisplayMode('date')
      setState('error')
    }
  }

  async function reloadHousehold() {
    if (user) await loadHousehold(user)
  }

  useEffect(() => {
    function handleGuestMode() {
      initGuestStore(buildGuestData())
      setHouseholdId(GUEST_HOUSEHOLD_ID)
      setPayDay(null)
      setTransactionListDisplayMode('date')
      setState('ready')
    }
    window.addEventListener('kakeibo:guest-mode', handleGuestMode)
    return () => window.removeEventListener('kakeibo:guest-mode', handleGuestMode)
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      setUser(firebaseUser)
      if (firebaseUser) {
        await loadHousehold(firebaseUser)
      } else {
        setHouseholdId(null)
        setPayDay(null)
        setTransactionListDisplayMode('date')
        setState('unauthenticated')
      }
    })
    return unsubscribe
  }, [])

  const isGuest = householdId === GUEST_HOUSEHOLD_ID

  const value = useMemo(
    () => ({ user, householdId, state, payDay, transactionListDisplayMode, isGuest, reloadHousehold }),
    [user, householdId, state, payDay, transactionListDisplayMode, isGuest], // eslint-disable-line react-hooks/exhaustive-deps
  )

  return createElement(HouseholdContext.Provider, { value }, children)
}

export function useHousehold() {
  return useContext(HouseholdContext)
}

import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth'
import { auth } from '../firebase/firebase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    getRedirectResult(auth).catch((err: { code?: string }) => {
      setAuthError(`ログインに失敗しました（${err.code ?? 'unknown'}）`)
    })

    return onAuthStateChanged(auth, u => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  return { user, loading, authError }
}

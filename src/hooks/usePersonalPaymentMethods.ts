import { useEffect, useState } from 'react'
import { fetchPersonalPaymentMethods } from '../firebase/personalFirestore'
import { GUEST_PERSONAL_PAYMENT_METHODS } from '../data/guestData'
import type { PaymentMethod } from '../types'
import { useHousehold } from './useHousehold'

export function usePersonalPaymentMethods(uid: string) {
  const { isGuest } = useHousehold()
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isGuest) {
      setPaymentMethods([...GUEST_PERSONAL_PAYMENT_METHODS].sort((a, b) => a.order - b.order))
      setLoading(false)
      return
    }
    async function init() {
      try {
        const existing = await fetchPersonalPaymentMethods(uid)
        setPaymentMethods(existing.sort((a, b) => a.order - b.order))
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [uid, isGuest])

  function addPaymentMethodLocally(paymentMethod: PaymentMethod) {
    setPaymentMethods(prev => [...prev, paymentMethod].sort((a, b) => a.order - b.order))
  }

  function removePaymentMethodLocally(id: string) {
    setPaymentMethods(prev => prev.filter(pm => pm.id !== id))
  }

  return { paymentMethods, loading, addPaymentMethodLocally, removePaymentMethodLocally }
}

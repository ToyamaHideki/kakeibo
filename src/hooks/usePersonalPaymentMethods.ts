import { useEffect, useState } from 'react'
import { fetchPersonalPaymentMethods } from '../firebase/personalFirestore'
import type { PaymentMethod } from '../types'

export function usePersonalPaymentMethods(uid: string) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      try {
        const existing = await fetchPersonalPaymentMethods(uid)
        setPaymentMethods(existing.sort((a, b) => a.order - b.order))
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [uid])

  function addPaymentMethodLocally(paymentMethod: PaymentMethod) {
    setPaymentMethods(prev => [...prev, paymentMethod].sort((a, b) => a.order - b.order))
  }

  function removePaymentMethodLocally(id: string) {
    setPaymentMethods(prev => prev.filter(pm => pm.id !== id))
  }

  return { paymentMethods, loading, addPaymentMethodLocally, removePaymentMethodLocally }
}

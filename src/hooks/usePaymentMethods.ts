import { useEffect, useState } from 'react'
import { addPaymentMethod, fetchPaymentMethods } from '../firebase/firestore'
import { useHousehold } from './useHousehold'
import type { PaymentMethod } from '../types'

const DEFAULT_PAYMENT_METHODS: Omit<PaymentMethod, 'id'>[] = [
  { name: '現金',           order: 1 },
  { name: 'クレジットカード', order: 2 },
  { name: '電子マネー',      order: 3 },
  { name: 'QRコード決済',    order: 4 },
  { name: '銀行振込',        order: 5 },
]

export function usePaymentMethods() {
  const { householdId } = useHousehold()
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId) return
    async function init() {
      try {
        const existing = await fetchPaymentMethods(householdId!)
        if (existing.length > 0) {
          setPaymentMethods(existing.sort((a, b) => a.order - b.order))
          return
        }
        const ids = await Promise.all(DEFAULT_PAYMENT_METHODS.map(pm => addPaymentMethod(householdId!, pm)))
        setPaymentMethods(DEFAULT_PAYMENT_METHODS.map((pm, i) => ({ ...pm, id: ids[i] })))
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [householdId])

  function addPaymentMethodLocally(paymentMethod: PaymentMethod) {
    setPaymentMethods(prev =>
      [...prev, paymentMethod].sort((a, b) => a.order - b.order),
    )
  }

  function removePaymentMethodLocally(id: string) {
    setPaymentMethods(prev => prev.filter(pm => pm.id !== id))
  }

  return { paymentMethods, loading, addPaymentMethodLocally, removePaymentMethodLocally }
}

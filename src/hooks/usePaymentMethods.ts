import { useQuery, useQueryClient } from '@tanstack/react-query'
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

async function initPaymentMethods(householdId: string): Promise<PaymentMethod[]> {
  const existing = await fetchPaymentMethods(householdId)
  if (existing.length > 0) {
    return existing.sort((a, b) => a.order - b.order)
  }
  const ids = await Promise.all(DEFAULT_PAYMENT_METHODS.map(pm => addPaymentMethod(householdId, pm)))
  return DEFAULT_PAYMENT_METHODS.map((pm, i) => ({ ...pm, id: ids[i] }))
}

export function usePaymentMethods() {
  const { householdId } = useHousehold()
  const queryClient = useQueryClient()

  const { data: paymentMethods = [], isLoading: loading } = useQuery({
    queryKey: ['paymentMethods', householdId],
    queryFn: () => initPaymentMethods(householdId!),
    enabled: !!householdId,
    staleTime: Infinity,
  })

  function addPaymentMethodLocally(paymentMethod: PaymentMethod) {
    queryClient.setQueryData<PaymentMethod[]>(
      ['paymentMethods', householdId],
      prev => [...(prev ?? []), paymentMethod].sort((a, b) => a.order - b.order),
    )
  }

  function removePaymentMethodLocally(id: string) {
    queryClient.setQueryData<PaymentMethod[]>(
      ['paymentMethods', householdId],
      prev => (prev ?? []).filter(pm => pm.id !== id),
    )
  }

  return { paymentMethods, loading, addPaymentMethodLocally, removePaymentMethodLocally }
}

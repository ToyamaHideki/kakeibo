import { useCallback, useEffect, useState } from 'react'
import { fetchMonthData } from '../firebase/firestore'
import { useHousehold } from './useHousehold'
import { adjacentMonth, getPayPeriodRange } from '../utils/date'
import type { Transaction } from '../types'

export function useMonthlyData(yearMonth: string, payDay?: number) {
  const { householdId } = useHousehold()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const isPeriodMode = !!payDay && payDay >= 2
  const nextYearMonth = isPeriodMode ? adjacentMonth(yearMonth, 1) : ''

  const load = useCallback(async () => {
    if (!householdId) return
    setLoading(true)
    try {
      if (isPeriodMode) {
        const [d1, d2] = await Promise.all([
          fetchMonthData(householdId, yearMonth),
          fetchMonthData(householdId, nextYearMonth),
        ])
        const { start, end } = getPayPeriodRange(yearMonth, payDay!)
        const all = [...(d1?.transactions ?? []), ...(d2?.transactions ?? [])]
        setTransactions(all.filter(t => t.date >= start && t.date <= end))
      } else {
        const data = await fetchMonthData(householdId, yearMonth)
        setTransactions(data?.transactions ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [yearMonth, householdId, payDay])

  useEffect(() => {
    load()
  }, [load])

  return { transactions, loading, reload: load }
}

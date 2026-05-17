import { useCallback, useEffect, useState } from 'react'
import { fetchPersonalMonthData } from '../firebase/personalFirestore'
import { adjacentMonth, getPayPeriodRange } from '../utils/date'
import type { Transaction } from '../types'

export function usePersonalMonthlyData(yearMonth: string, uid: string, payDay?: number) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const isPeriodMode = !!payDay && payDay >= 2
  const nextYearMonth = isPeriodMode ? adjacentMonth(yearMonth, 1) : ''

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (isPeriodMode) {
        const [d1, d2] = await Promise.all([
          fetchPersonalMonthData(uid, yearMonth),
          fetchPersonalMonthData(uid, nextYearMonth),
        ])
        const { start, end } = getPayPeriodRange(yearMonth, payDay!)
        const all = [...(d1?.transactions ?? []), ...(d2?.transactions ?? [])]
        setTransactions(all.filter(t => t.date >= start && t.date <= end))
      } else {
        const data = await fetchPersonalMonthData(uid, yearMonth)
        setTransactions(data?.transactions ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [yearMonth, uid, payDay])

  useEffect(() => {
    load()
  }, [load])

  return { transactions, loading, reload: load }
}

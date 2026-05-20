import { useEffect, useState } from 'react'
import { fetchMonthData } from '../firebase/firestore'
import type { Transaction } from '../types'
import { useHousehold } from './useHousehold'

export function useAnnualData(year: number) {
  const { householdId } = useHousehold()
  const [monthData, setMonthData] = useState<Record<string, Transaction[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId) return
    setLoading(true)
    async function load() {
      try {
        const months = Array.from({ length: 12 }, (_, i) =>
          `${year}-${String(i + 1).padStart(2, '0')}`
        )
        const results = await Promise.all(months.map(m => fetchMonthData(householdId!, m)))
        const data: Record<string, Transaction[]> = {}
        months.forEach((m, i) => {
          data[m] = results[i]?.transactions ?? []
        })
        setMonthData(data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [year, householdId])

  return { monthData, loading }
}

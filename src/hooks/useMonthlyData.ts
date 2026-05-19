import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMonthData } from '../firebase/firestore'
import { useHousehold } from './useHousehold'
import { adjacentMonth, getPayPeriodRange } from '../utils/date'

export function useMonthlyData(yearMonth: string, payDay?: number) {
  const { householdId } = useHousehold()
  const queryClient = useQueryClient()

  const isPeriodMode = !!payDay && payDay >= 2
  const nextYearMonth = isPeriodMode ? adjacentMonth(yearMonth, 1) : null

  const { data: transactions = [], isLoading: loading } = useQuery({
    queryKey: ['monthData', householdId, yearMonth, payDay],
    queryFn: async () => {
      if (!householdId) return []
      if (isPeriodMode && nextYearMonth) {
        const [d1, d2] = await Promise.all([
          fetchMonthData(householdId, yearMonth),
          fetchMonthData(householdId, nextYearMonth),
        ])
        const { start, end } = getPayPeriodRange(yearMonth, payDay!)
        const all = [...(d1?.transactions ?? []), ...(d2?.transactions ?? [])]
        return all.filter(t => t.date >= start && t.date <= end)
      }
      const data = await fetchMonthData(householdId, yearMonth)
      return data?.transactions ?? []
    },
    enabled: !!householdId,
    staleTime: 30_000,
  })

  function reload() {
    void queryClient.invalidateQueries({ queryKey: ['monthData', householdId, yearMonth] })
  }

  return { transactions, loading, reload }
}

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPersonalMonthData } from '../firebase/personalFirestore'
import { guestGetPersonalMonthData } from '../firebase/guestStore'
import { useHousehold } from './useHousehold'
import { adjacentMonth, getPayPeriodRange } from '../utils/date'

export function usePersonalMonthlyData(yearMonth: string, uid: string, payDay?: number) {
  const { isGuest } = useHousehold()
  const queryClient = useQueryClient()

  const isPeriodMode = !!payDay && payDay >= 2
  const nextYearMonth = isPeriodMode ? adjacentMonth(yearMonth, 1) : null

  const { data: transactions = [], isLoading: loading } = useQuery({
    queryKey: ['personalMonthData', uid, yearMonth, payDay, isGuest],
    queryFn: async () => {
      if (isGuest) {
        if (isPeriodMode && nextYearMonth) {
          const d1 = guestGetPersonalMonthData(yearMonth)
          const d2 = guestGetPersonalMonthData(nextYearMonth)
          const { start, end } = getPayPeriodRange(yearMonth, payDay!)
          const all = [...(d1?.transactions ?? []), ...(d2?.transactions ?? [])]
          return all.filter(t => t.date >= start && t.date <= end)
        }
        return guestGetPersonalMonthData(yearMonth)?.transactions ?? []
      }
      if (isPeriodMode && nextYearMonth) {
        const [d1, d2] = await Promise.all([
          fetchPersonalMonthData(uid, yearMonth),
          fetchPersonalMonthData(uid, nextYearMonth),
        ])
        const { start, end } = getPayPeriodRange(yearMonth, payDay!)
        const all = [...(d1?.transactions ?? []), ...(d2?.transactions ?? [])]
        return all.filter(t => t.date >= start && t.date <= end)
      }
      const data = await fetchPersonalMonthData(uid, yearMonth)
      return data?.transactions ?? []
    },
    staleTime: 30_000,
  })

  function reload() {
    void queryClient.invalidateQueries({ queryKey: ['personalMonthData', uid, yearMonth] })
  }

  return { transactions, loading, reload }
}

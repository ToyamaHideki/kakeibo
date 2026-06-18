import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchFixedCosts } from '../firebase/firestore'
import { useHousehold } from './useHousehold'

export function useFixedCosts() {
  const { householdId } = useHousehold()
  const queryClient = useQueryClient()

  const { data: fixedCosts = [], isLoading: loading } = useQuery({
    queryKey: ['fixedCosts', householdId],
    queryFn: async () => {
      if (!householdId) return []
      return await fetchFixedCosts(householdId)
    },
    enabled: !!householdId,
    staleTime: 30_000,
  })

  function reload() {
    void queryClient.invalidateQueries({ queryKey: ['fixedCosts', householdId] })
  }

  return { fixedCosts, loading, reload }
}

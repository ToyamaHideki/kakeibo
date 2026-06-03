import { useCallback, useEffect, useState } from 'react'
import type { BudgetMap } from '../types'
import { fetchBudget, updateBudgetAmount } from '../firebase/firestore'
import { useHousehold } from './useHousehold'

export function useBudget(yearMonth: string) {
  const { householdId } = useHousehold()
  const [budgets, setBudgets] = useState<BudgetMap>({})
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!householdId) return
    setLoading(true)
    try {
      const data = await fetchBudget(householdId, yearMonth)
      setBudgets(data)
    } finally {
      setLoading(false)
    }
  }, [householdId, yearMonth])

  useEffect(() => {
    void reload()
  }, [reload])

  async function saveBudgetAmount(categoryId: string, amount: number) {
    if (!householdId) return
    await updateBudgetAmount(householdId, yearMonth, categoryId, amount)
    setBudgets(prev => ({ ...prev, [categoryId]: amount }))
  }

  return { budgets, loading, saveBudgetAmount, reload }
}

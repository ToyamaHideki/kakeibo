import { useEffect, useState } from 'react'
import { fetchBudget, updateBudgetAmount } from '../firebase/firestore'
import { useHousehold } from './useHousehold'

export function useBudget(yearMonth: string) {
  const { householdId } = useHousehold()
  const [budgets, setBudgets] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId) return
    setLoading(true)
    fetchBudget(householdId, yearMonth)
      .then(data => setBudgets(data))
      .finally(() => setLoading(false))
  }, [yearMonth, householdId])

  async function saveBudgetAmount(categoryId: string, amount: number) {
    if (!householdId) return
    await updateBudgetAmount(householdId, yearMonth, categoryId, amount)
    setBudgets(prev => ({ ...prev, [categoryId]: amount }))
  }

  return { budgets, loading, saveBudgetAmount }
}

import {
  fetchSavingsGoals,
  addSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
} from '../firebase/savingsFirestore'
import type { SavingsGoal } from '../types'
import { useFirestoreCollection } from './useFirestoreCollection'
import { nextOrder } from '../utils/order'

const ops = {
  fetch: fetchSavingsGoals,
  add: addSavingsGoal,
  update: updateSavingsGoal,
  remove: deleteSavingsGoal,
}

export function useSavingsGoals() {
  const { items: goals, setItems: setGoals, loading, householdId, add, update, remove } = useFirestoreCollection<SavingsGoal>(ops)

  async function addGoal(goal: Omit<SavingsGoal, 'id' | 'order'>) {
    await add({ ...goal, order: nextOrder(goals) })
  }

  async function logContribution(id: string, yearMonth: string, amount: number) {
    if (!householdId) return
    const goal = goals.find(g => g.id === id)
    if (!goal || amount <= 0) return
    const contributions = { ...goal.contributions, [yearMonth]: (goal.contributions[yearMonth] ?? 0) + amount }
    const currentAmount = goal.currentAmount + amount
    await updateSavingsGoal(householdId, id, { contributions, currentAmount })
    setGoals(prev => prev.map(g => g.id === id ? { ...g, contributions, currentAmount } : g))
  }

  return { goals, loading, addGoal, updateGoal: update, deleteGoal: remove, logContribution }
}

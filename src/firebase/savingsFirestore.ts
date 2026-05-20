import type { SavingsGoal } from '../types'
import { createHouseholdCrud } from './crud'

const ops = createHouseholdCrud<SavingsGoal>('savingsGoals')

export const fetchSavingsGoals = ops.fetch
export const addSavingsGoal = ops.add
export const updateSavingsGoal = ops.update
export const deleteSavingsGoal = ops.remove

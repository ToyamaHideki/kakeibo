import type { SavingsGoal } from '../types'

export function remainingMonths(targetYear: number): number {
  const now = new Date()
  const endMonth = targetYear * 12 + 12  // その年の12月末
  const nowMonth = now.getFullYear() * 12 + now.getMonth() + 1
  return Math.max(1, endMonth - nowMonth)
}

export function monthlyNeeded(goal: SavingsGoal): number | null {
  if (!goal.targetYear) return null
  const remaining = goal.targetAmount - goal.currentAmount
  if (remaining <= 0) return 0
  return Math.ceil(remaining / remainingMonths(goal.targetYear))
}

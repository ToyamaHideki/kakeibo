import type { FixedCost, FixedCostFrequency } from '../types'

// 繰り返し判定に必要な最小フィールド（FixedCost / FixedItem の両方が満たす）
type RecurringSpec = {
  frequency?: FixedCostFrequency | undefined
  month?: number | undefined
  baseYear?: number | undefined
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay()
}

export function getEffectiveDay(
  dayOfMonth: number,
  year: number,
  month: number,
): { effectiveDay: number; isShifted: boolean; overflows: boolean } {
  const daysInMonth = getDaysInMonth(year, month)
  if (dayOfMonth > daysInMonth) {
    return { effectiveDay: dayOfMonth, isShifted: false, overflows: true }
  }
  const dow = new Date(year, month - 1, dayOfMonth).getDay()
  const shift = dow === 6 ? 2 : dow === 0 ? 1 : 0
  const effectiveDay = dayOfMonth + shift
  return { effectiveDay, isShifted: shift > 0, overflows: effectiveDay > daysInMonth }
}

export function isApplicableThisMonth(cost: RecurringSpec, year: number, month: number): boolean {
  const freq = cost.frequency ?? 'monthly'
  if (freq === 'monthly') return true
  if (cost.month === undefined) return false
  if (freq === 'yearly') return cost.month === month
  if (freq === 'every2years') {
    return cost.month === month && cost.baseYear !== undefined && Math.abs(year - cost.baseYear) % 2 === 0
  }
  if (freq === 'every3years') {
    return cost.month === month && cost.baseYear !== undefined && Math.abs(year - cost.baseYear) % 3 === 0
  }
  return false
}

export const FREQ_LABEL: Record<string, string | null> = {
  monthly: null,
  yearly: '毎年',
  every2years: '隔年',
  every3years: '3年ごと',
}

export function dotColor(cost: FixedCost): string {
  if (cost.isVariable) return 'bg-amber-400'
  return (cost.frequency ?? 'monthly') === 'monthly' ? 'bg-sage-400' : 'bg-teal-400'
}

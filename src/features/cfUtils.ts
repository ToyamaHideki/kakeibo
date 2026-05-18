import type { CfItem } from '../types'

export function getCfValue(item: CfItem, year: number): number {
  const yearStr = String(year)
  if (item.values[yearStr] !== undefined) return item.values[yearStr]
  const explicitYears = Object.keys(item.values)
    .map(Number)
    .filter(y => y < year)
    .sort((a, b) => a - b)
  if (explicitYears.length === 0) return 0
  const baseYear = explicitYears[explicitYears.length - 1]
  const baseVal = item.values[String(baseYear)]
  const elapsed = year - baseYear
  return Math.round(baseVal * Math.pow(1 + item.rate / 100, elapsed))
}

export function fmt(n: number): string {
  if (n === 0) return ''
  return n.toLocaleString()
}

export function fmtBalance(n: number): string {
  return n.toLocaleString()
}

export const vKey = (type: 'income' | 'expense', id: string, year: number) => `v|${type}|${id}|${year}`
export const nKey = (type: 'income' | 'expense', id: string) => `n|${type}|${id}`
export const rKey = (type: 'income' | 'expense', id: string) => `r|${type}|${id}`

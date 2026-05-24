import type { CfItem } from '../types'

export function getCfValue(item: CfItem, year: number): number {
  const yearStr = String(year)
  const directVal = item.values[yearStr]
  if (directVal !== undefined) return directVal
  const explicitYears = Object.keys(item.values)
    .map(Number)
    .filter(y => y < year)
    .sort((a, b) => a - b)
  if (explicitYears.length === 0) return 0
  // filter で要素を絞り込んでいるため最後の要素は必ず存在する
  const baseYear = explicitYears[explicitYears.length - 1]!
  const baseVal = item.values[String(baseYear)]
  if (baseVal === undefined) return 0
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

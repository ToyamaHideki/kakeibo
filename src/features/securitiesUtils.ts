import type { SecuritiesAccount, SecuritiesAccountType } from '../types'
import { currentYearMonth, adjacentMonth } from '../utils/date'
export { formatYenCompact as formatYen } from '../utils/format'

export const ACCOUNT_COLORS = [
  '#4a7c59', '#3b82f6', '#8b5cf6', '#f97316',
  '#ec4899', '#14b8a6', '#eab308', '#ef4444',
]

export const ACCOUNT_TYPE_OPTIONS: { value: SecuritiesAccountType; label: string }[] = [
  { value: 'specific', label: '特定口座' },
  { value: 'nisa', label: 'NISA' },
  { value: 'ideco', label: 'iDeCo' },
  { value: 'foreign', label: '外国株' },
  { value: 'other', label: 'その他' },
]

export function past12Months(): string[] {
  const result: string[] = []
  let ym = currentYearMonth()
  for (let i = 0; i < 12; i++) {
    result.unshift(ym)
    ym = adjacentMonth(ym, -1)
  }
  return result
}

export function ymLabel(ym: string): string {
  const [, m] = ym.split('-')
  return `${Number(m)}月`
}

export type FormState = {
  name: string
  owner: string
  broker: string
  accountType: SecuritiesAccountType | ''
  color: string
  memo: string
  initialValue: string
}

export const defaultForm: FormState = {
  name: '',
  owner: '',
  broker: '',
  accountType: '',
  color: ACCOUNT_COLORS[0],
  memo: '',
  initialValue: '',
}

export function accountToForm(a: SecuritiesAccount): FormState {
  return {
    name: a.name,
    owner: a.owner ?? '',
    broker: a.broker ?? '',
    accountType: a.accountType ?? '',
    color: a.color,
    memo: a.memo ?? '',
    initialValue: String(a.currentValue),
  }
}

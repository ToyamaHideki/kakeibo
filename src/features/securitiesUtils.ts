import type { SecuritiesAccount, SecuritiesAccountType, SecuritiesHoldingCategory, SecuritiesVisibility } from '../types'
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

export const HOLDING_CATEGORY_OPTIONS: { value: SecuritiesHoldingCategory; label: string }[] = [
  { value: 'mutual_fund', label: '投資信託' },
  { value: 'domestic_stock', label: '国内株式' },
  { value: 'foreign_stock', label: '国外株式' },
  { value: 'bond', label: '債券' },
  { value: 'reit', label: 'REIT' },
  { value: 'crypto', label: '仮想通貨' },
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
  unrealizedPnL: string              // 評価損益（符号付き、空文字なら未設定）
  visibility: SecuritiesVisibility
}

export const defaultForm: FormState = {
  name: '',
  owner: '',
  broker: '',
  accountType: '',
  color: ACCOUNT_COLORS[0]!,
  memo: '',
  initialValue: '',
  unrealizedPnL: '',
  visibility: 'shared',
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
    unrealizedPnL: a.unrealizedPnL !== undefined ? String(a.unrealizedPnL) : '',
    visibility: a.visibility ?? 'shared',
  }
}

/** 元本 = 現在評価額 - 評価損益。評価損益が未設定なら null を返す */
export function computePrincipal(currentValue: number, unrealizedPnL: number | undefined): number | null {
  if (unrealizedPnL === undefined || Number.isNaN(unrealizedPnL)) return null
  return currentValue - unrealizedPnL
}

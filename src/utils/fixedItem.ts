import type { Contract, ContractScope, ContractType, FixedCost, FixedCostFrequency } from '../types'

// 固定費一覧（カレンダー/リスト）で固定費と契約を同列に扱うための正規化型。
export interface FixedItem {
  id: string
  source: 'fixedCost' | 'contract'
  name: string
  amount: number
  isVariable: boolean
  dayOfMonth: number
  frequency: FixedCostFrequency        // contract は monthly|yearly のみ
  month?: number | undefined           // yearly のとき発生月
  baseYear?: number | undefined        // fixedCost の every2/3years 用
  scope: ContractScope                 // fixedCost は常に 'shared'
  contractType?: ContractType | undefined  // contract のときのみ
  paymentMethod?: string | undefined
  memo?: string | undefined
  order: number
}

export function fixedCostToItem(c: FixedCost): FixedItem {
  return {
    id: c.id,
    source: 'fixedCost',
    name: c.name,
    amount: c.amount,
    isVariable: !!c.isVariable,
    dayOfMonth: c.dayOfMonth,
    frequency: c.frequency ?? 'monthly',
    month: c.month,
    baseYear: c.baseYear,
    scope: 'shared',
    paymentMethod: c.paymentMethod,
    memo: c.memo,
    order: c.order,
  }
}

// 契約 → FixedItem。renewalDate 未設定・不正なら null（固定費一覧に出さない）。
export function contractToItem(c: Contract): FixedItem | null {
  if (!c.renewalDate) return null
  const [y, m, d] = c.renewalDate.split('-').map(Number)
  if (!y || !m || !d) return null
  return {
    id: c.id,
    source: 'contract',
    name: c.name,
    amount: c.amount,
    isVariable: false,
    dayOfMonth: d,
    frequency: c.frequency, // 'monthly' | 'yearly'
    month: c.frequency === 'yearly' ? m : undefined,
    scope: c.scope ?? 'shared',
    contractType: c.contractType,
    paymentMethod: c.paymentMethod,
    memo: c.memo,
    order: c.order,
  }
}

// 固定費一覧に表示する FixedItem を組み立てる。
// - 固定費：全件
// - 契約：共有（＋ includePersonal かつ owner===currentUid の個人）かつ renewalDate あり
export function buildFixedItems(
  fixedCosts: FixedCost[],
  contracts: Contract[],
  opts: { includePersonal: boolean; currentUid: string | null },
): FixedItem[] {
  const items: FixedItem[] = fixedCosts.map(fixedCostToItem)
  for (const c of contracts) {
    const scope = c.scope ?? 'shared'
    if (scope === 'personal') {
      if (!opts.includePersonal) continue
      if (!opts.currentUid || c.owner !== opts.currentUid) continue
    }
    const item = contractToItem(c)
    if (item) items.push(item)
  }
  return items
}

// 個人固定費一覧用：指定ユーザーの個人契約（renewalDate あり）のみを FixedItem 化する。
export function buildPersonalContractItems(contracts: Contract[], uid: string | null): FixedItem[] {
  if (!uid) return []
  const items: FixedItem[] = []
  for (const c of contracts) {
    if ((c.scope ?? 'shared') !== 'personal') continue
    if (c.owner !== uid) continue
    const item = contractToItem(c)
    if (item) items.push(item)
  }
  return items
}

export const CONTRACT_TYPE_SHORT_LABEL: Record<ContractType, string> = {
  subscription: 'サブスク',
  insurance: '保険',
  loan: 'ローン',
  other: 'その他',
}

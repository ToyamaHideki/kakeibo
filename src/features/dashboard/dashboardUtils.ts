import type { BudgetMap, Category, FixedCost, Transaction } from '../../types'
import { isApplicableThisMonth } from '../../utils/fixedCost'

// 今月の収入・支出・収支差を集計する。
export function summarizeIncomeExpense(
  txs: Transaction[],
): { income: number; expense: number; balance: number } {
  let income = 0
  let expense = 0
  for (const t of txs) {
    if (t.type === 'income') income += t.amount
    else expense += t.amount
  }
  return { income, expense, balance: income - expense }
}

export interface BudgetRow {
  id: string
  name: string
  color: string
  budget: number
  actual: number
  rate: number
}

// 予算設定済み（>0）の支出カテゴリについて、予算・実績・消化率を算出し
// 消化率の高い順に topN 件返す。
export function buildBudgetRows(
  txs: Transaction[],
  budgets: BudgetMap,
  cats: Category[],
  topN: number,
): BudgetRow[] {
  const expenseByCat = new Map<string, number>()
  for (const t of txs) {
    if (t.type === 'expense') {
      expenseByCat.set(t.categoryId, (expenseByCat.get(t.categoryId) ?? 0) + t.amount)
    }
  }
  return cats
    .filter(c => c.type === 'expense' && (budgets[c.id] ?? 0) > 0)
    .map(c => {
      const budget = budgets[c.id]!
      const actual = expenseByCat.get(c.id) ?? 0
      return { id: c.id, name: c.name, color: c.color, budget, actual, rate: actual / budget }
    })
    .sort((a, b) => b.rate - a.rate)
    .slice(0, topN)
}

// 当月（year, month）に適用される固定費を集計する。
// 変動費は金額が未確定のため合計には含めず、件数のみ固定費／変動費に分けて返す。
export function sumApplicableFixedCosts(
  costs: FixedCost[],
  year: number,
  month: number,
): { total: number; fixedCount: number; variableCount: number } {
  const applicable = costs.filter(c => isApplicableThisMonth(c, year, month))
  const fixed = applicable.filter(c => !c.isVariable)
  const variable = applicable.filter(c => c.isVariable)
  const total = fixed.reduce((s, c) => s + c.amount, 0)
  return { total, fixedCount: fixed.length, variableCount: variable.length }
}

// 当年の月別収入・支出を 1〜12 月分の配列で返す（収支推移グラフ用）。
export function buildMonthlyTrend(
  monthData: Record<string, Transaction[]>,
  year: number,
): { labels: string[]; incomes: number[]; expenses: number[] } {
  const labels: string[] = []
  const incomes: number[] = []
  const expenses: number[] = []
  for (let m = 1; m <= 12; m++) {
    const ym = `${year}-${String(m).padStart(2, '0')}`
    const txs = monthData[ym] ?? []
    const { income, expense } = summarizeIncomeExpense(txs)
    labels.push(`${m}月`)
    incomes.push(income)
    expenses.push(expense)
  }
  return { labels, incomes, expenses }
}

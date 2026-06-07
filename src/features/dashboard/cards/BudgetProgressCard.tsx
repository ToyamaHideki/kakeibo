import { useMemo } from 'react'
import type { BudgetMap, Category, Transaction } from '../../../types'
import { buildBudgetRows } from '../dashboardUtils'
import DashboardCard from '../DashboardCard'

interface Props {
  transactions: Transaction[]
  budgets: BudgetMap
  categories: Category[]
  loading: boolean
  periodMonth: string
  className?: string
}

const yen = (n: number) => `¥${n.toLocaleString()}`

export default function BudgetProgressCard({ transactions, budgets, categories, loading, periodMonth, className = '' }: Props) {
  // 予算設定があるカテゴリを全件表示（消化率の高い順）。表示しきれない分は要素内スクロール。
  const rows = useMemo(
    () => buildBudgetRows(transactions, budgets, categories, Infinity),
    [transactions, budgets, categories],
  )

  return (
    <DashboardCard title="予算消化状況" to={`/budget/${periodMonth}`} className={className}>
      {loading ? (
        <div className="h-24 flex items-center justify-center text-gray-400 text-sm">読み込み中…</div>
      ) : rows.length === 0 ? (
        <div className="h-24 flex items-center justify-center text-gray-400 text-sm">予算が未設定です</div>
      ) : (
        <ul className="space-y-2 max-h-52 overflow-y-scroll pr-2 scrollbar-always">
          {rows.map(r => {
            const pct = Math.min(100, Math.round(r.rate * 100))
            const over = r.actual > r.budget
            return (
              <li key={r.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-700">{r.name}</span>
                  <span className={`tabular-nums ${over ? 'text-terracotta-500 font-semibold' : 'text-gray-500'}`}>
                    {yen(r.actual)} / {yen(r.budget)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${over ? 'bg-terracotta-400' : 'bg-sage-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </DashboardCard>
  )
}

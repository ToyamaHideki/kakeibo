import { useMemo } from 'react'
import type { Transaction } from '../../../types'
import { summarizeIncomeExpense } from '../dashboardUtils'
import DashboardCard from '../DashboardCard'

interface Props {
  transactions: Transaction[]
  loading: boolean
  periodMonth: string // "yyyy-MM"
  payDay: number | null
  onAdd: () => void
  className?: string
}

const yen = (n: number) => `¥${n.toLocaleString()}`

export default function IncomeExpenseSummaryCard({ transactions, loading, periodMonth, payDay, onAdd, className = '' }: Props) {
  const { income, expense, balance } = useMemo(
    () => summarizeIncomeExpense(transactions),
    [transactions],
  )

  return (
    <DashboardCard
      title="収支サマリー"
      titleNote={payDay ? `（給与日${payDay}日から起算）` : undefined}
      to={`/months/${periodMonth}`}
      className={className}
      headerAction={
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-sage-600 hover:bg-sage-700 text-white text-[11px] font-medium transition-colors"
          aria-label="収支を入力"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          入力
        </button>
      }
    >
      {loading ? (
        <div className="h-full flex items-center justify-center text-gray-400 text-sm">読み込み中…</div>
      ) : (
        <div className="h-full flex flex-col justify-center">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">収入</p>
              <p className="text-base font-bold text-sage-600 tabular-nums">{yen(income)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">支出</p>
              <p className="text-base font-bold text-terracotta-500 tabular-nums">{yen(expense)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">収支</p>
              <p className={`text-base font-bold tabular-nums ${balance >= 0 ? 'text-sage-600' : 'text-terracotta-500'}`}>
                {yen(balance)}
              </p>
            </div>
          </div>
        </div>
      )}
    </DashboardCard>
  )
}

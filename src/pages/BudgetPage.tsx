import { type FocusEvent, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCategories } from '../hooks/useCategories'
import { useMonthlyData } from '../hooks/useMonthlyData'
import { useBudget } from '../hooks/useBudget'
import { useHousehold } from '../hooks/useHousehold'
import { adjacentMonth, formatYearMonth, formatPayPeriodLabel } from '../utils/date'

function formatYen(n: number) {
  return `¥${n.toLocaleString()}`
}

export default function BudgetPage() {
  const { yearMonth = '' } = useParams<{ yearMonth: string }>()
  const navigate = useNavigate()
  const { payDay } = useHousehold()

  const { categories, loading: catLoading } = useCategories()
  const { transactions, loading: txLoading } = useMonthlyData(yearMonth, payDay ?? undefined)
  const { budgets, loading: budgetLoading, saveBudgetAmount } = useBudget(yearMonth)
  const periodLabel = payDay ? formatPayPeriodLabel(yearMonth, payDay) : formatYearMonth(yearMonth)

  // 入力中の値を管理（保存前の編集状態）
  const [editValues, setEditValues] = useState<Record<string, string>>({})

  const loading = catLoading || txLoading || budgetLoading
  const expenseCategories = categories.filter(c => c.type === 'expense').sort((a, b) => a.order - b.order)

  // カテゴリ別の実際の支出を集計
  const actualByCategory: Record<string, number> = {}
  for (const tx of transactions) {
    if (tx.type === 'expense') {
      actualByCategory[tx.categoryId] = (actualByCategory[tx.categoryId] ?? 0) + tx.amount
    }
  }

  function getBudgetInputValue(categoryId: string): string {
    if (editValues[categoryId] !== undefined) return editValues[categoryId]
    const v = budgets[categoryId]
    return v ? String(v) : ''
  }

  function handleInputChange(categoryId: string, value: string) {
    if (value === '' || /^\d+$/.test(value)) {
      setEditValues(prev => ({ ...prev, [categoryId]: value }))
    }
  }

  async function handleBlur(e: FocusEvent<HTMLInputElement>, categoryId: string) {
    const raw = e.target.value.trim()
    const amount = Number(raw)
    setEditValues(prev => {
      const next = { ...prev }
      delete next[categoryId]
      return next
    })
    if (raw === '' || amount <= 0) return
    await saveBudgetAmount(categoryId, amount)
  }

  // 合計
  const totalBudget = expenseCategories.reduce((sum, c) => sum + (budgets[c.id] ?? 0), 0)
  const totalActual = expenseCategories.reduce((sum, c) => sum + (actualByCategory[c.id] ?? 0), 0)
  const totalPct = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">読み込み中...</div>
    )
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <h2 className="text-xl font-bold text-gray-800">予算管理</h2>
      </div>

      {/* 月ナビゲーション */}
      <div className="flex items-center justify-center gap-8 mb-5 shrink-0">
        <button
          onClick={() => navigate(`/budget/${adjacentMonth(yearMonth, -1)}`)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-base font-semibold text-gray-800 w-28 text-center">{periodLabel}</span>
        <button
          onClick={() => navigate(`/budget/${adjacentMonth(yearMonth, 1)}`)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* 合計サマリー */}
      {totalBudget > 0 && (
        <div className="mb-4 px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">支出合計</span>
            <span className={`text-xs font-semibold ${totalPct !== null && totalPct > 100 ? 'text-red-500' : 'text-gray-600'}`}>
              {totalPct !== null ? `${totalPct}%` : ''}
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-800">{formatYen(totalActual)}</span>
            <span className="text-xs text-gray-500">/ {formatYen(totalBudget)}</span>
          </div>
          <ProgressBar pct={totalPct ?? 0} />
        </div>
      )}

      {/* カチE��リグリチE�� */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pb-2">
          {expenseCategories.map(cat => {
            const actual = actualByCategory[cat.id] ?? 0
            const budget = budgets[cat.id] ?? 0
            const pct = budget > 0 ? Math.round((actual / budget) * 100) : null
            const isOver = pct !== null && pct > 100

            return (
              <div key={cat.id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
                {/* カチE��リ吁E+ 予算�E劁E*/}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="flex-1 text-sm font-medium text-gray-800">{cat.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">予算</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={getBudgetInputValue(cat.id)}
                      onChange={e => handleInputChange(cat.id, e.target.value)}
                      onBlur={e => handleBlur(e, cat.id)}
                      placeholder="未設定"
                      className="w-24 px-2 py-1 text-right text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 text-gray-800"
                    />
                    <span className="text-xs text-gray-500">円</span>
                  </div>
                </div>

                {/* 実績 + パ�EセンチE*/}
                <div className="flex items-center justify-between mb-1.5 text-xs text-gray-500">
                  <span>
                    <span className={`font-medium ${isOver ? 'text-red-500' : 'text-gray-700'}`}>{formatYen(actual)}</span>
                    {budget > 0 && <span className="text-gray-500"> / {formatYen(budget)}</span>}
                  </span>
                  {pct !== null && (
                    <span className={`font-semibold ${isOver ? 'text-red-500' : pct >= 80 ? 'text-orange-500' : 'text-gray-600'}`}>
                      {pct}%
                    </span>
                  )}
                </div>

                {/* プログレスバ�E */}
                {budget > 0 ? (
                  <ProgressBar pct={pct ?? 0} />
                ) : (
                  <div className="h-1.5 rounded-full bg-gray-100" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 予算�E力�E説昁E*/}
      <p className="text-xs text-gray-500 text-center mt-3 shrink-0">
        予算欄に金額を入力してフォーカスを外すと自動保存されます
      </p>
    </div>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100)
  const isOver = pct > 100
  const color = isOver ? 'bg-red-400' : pct >= 80 ? 'bg-orange-400' : 'bg-sage-500'

  return (
    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useHousehold } from '../../hooks/useHousehold'
import {
  adjacentMonth,
  currentPayPeriodMonth,
  currentYearMonth,
  formatPayPeriodLabel,
  formatYearMonth,
  getPayPeriodRange,
} from '../../utils/date'
import { useMonthlyData } from '../../hooks/useMonthlyData'
import { useBudget } from '../../hooks/useBudget'
import { useAnnualData } from '../../hooks/useAnnualData'
import type { OutletContext } from '../../components/Layout'
import YearMonthPicker from '../../components/YearMonthPicker'
import GhostLoader from '../../components/GhostLoader'
import TransactionModal from '../TransactionModal'
import IncomeExpenseSummaryCard from './cards/IncomeExpenseSummaryCard'
import BudgetProgressCard from './cards/BudgetProgressCard'
import TrendChartCard from './cards/TrendChartCard'
import FixedCostSummaryCard from './cards/FixedCostSummaryCard'
import AssetSummaryCard from './cards/AssetSummaryCard'
import SavingsGoalCard from './cards/SavingsGoalCard'

export default function HouseholdDashboard() {
  const { payDay } = useHousehold()

  const [viewMonth, setViewMonth] = useState(() => currentPayPeriodMonth(payDay))
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const year = Number(viewMonth.split('-')[0])
  const month = Number(viewMonth.split('-')[1])
  const periodLabel = payDay ? formatPayPeriodLabel(viewMonth, payDay) : formatYearMonth(viewMonth)

  const {
    categories,
    paymentMethods,
    onCategoryAdded,
    onPaymentMethodAdded,
    onCategoryDeleted,
    onPaymentMethodDeleted,
    onCategoryUpdated,
  } = useOutletContext<OutletContext>()

  const { transactions, loading: txLoading, reload } = useMonthlyData(viewMonth, payDay ?? undefined)
  const { budgets, loading: budgetLoading } = useBudget(viewMonth)
  const { monthData, loading: annualLoading } = useAnnualData(year)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // 入力モーダルの初期日付：
  // 当月を表示中なら当日。過去/未来の月を表示中はその期間の初日
  // （給与日設定時は給与日、未設定時は月初）。
  const isCurrentPeriod = viewMonth === currentPayPeriodMonth(payDay)
  const addInitialDate = isCurrentPeriod
    ? undefined
    : payDay
      ? getPayPeriodRange(viewMonth, payDay).start
      : `${viewMonth}-01`

  return (
    <>
      {/* 月ナビゲーション */}
      <div className="flex items-center justify-center mb-5">
        <div className="inline-flex items-center bg-white/80 backdrop-blur rounded-2xl border border-gray-200/80 shadow-sm p-1">
          <button
            onClick={() => setViewMonth(adjacentMonth(viewMonth, -1))}
            aria-label="前の月"
            className="p-2 rounded-xl text-gray-400 hover:text-sage-700 hover:bg-sage-50 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={() => setIsPickerOpen(true)}
            aria-label="年月を選択"
            className="group flex items-center gap-2 px-4 py-1.5 rounded-xl hover:bg-sage-50 transition-colors"
          >
            <span className="text-lg font-bold text-gray-800 tracking-tight tabular-nums">{periodLabel}</span>
            <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-sage-600 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <button
            onClick={() => setViewMonth(adjacentMonth(viewMonth, 1))}
            aria-label="次の月"
            className="p-2 rounded-xl text-gray-400 hover:text-sage-700 hover:bg-sage-50 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      <YearMonthPicker
        yearMonth={viewMonth}
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onChange={setViewMonth}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[22fr_30fr_48fr] gap-4">
        {/* 第1カラム(22%)：今月の収支(3/5)＋当月の固定費(2/5)を縦2段 */}
        <div className="flex flex-col gap-4">
          <IncomeExpenseSummaryCard
            transactions={transactions}
            loading={txLoading}
            periodMonth={viewMonth}
            payDay={payDay}
            onAdd={() => setIsAddModalOpen(true)}
            className="flex-[3] min-h-0"
          />
          <FixedCostSummaryCard year={year} month={month} className="flex-[2] min-h-0" />
        </div>

        {/* 第2カラム(30%)：予算消化状況 */}
        <BudgetProgressCard
          transactions={transactions}
          budgets={budgets}
          categories={categories}
          loading={txLoading || budgetLoading}
          periodMonth={viewMonth}
        />

        {/* 第3カラム(48%)：収支推移 */}
        <TrendChartCard
          monthData={monthData}
          loading={annualLoading}
          year={year}
        />
      </div>

      {/* 下段：資産関連（左列は元の資産概要1枚分の幅で縦積み：資産概要(60%) → 貯蓄目標(40%)） */}
      <div className="grid grid-cols-1 lg:grid-cols-[26fr_74fr] gap-4 mt-4">
        <div className="grid grid-rows-[3fr_2fr] gap-4 h-[34rem]">
          <AssetSummaryCard className="min-h-0" />
          <SavingsGoalCard className="min-h-0" />
        </div>
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center h-[34rem]">
          <GhostLoader label="開発中" />
        </section>
      </div>

      <TransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaved={() => { setIsAddModalOpen(false); reload() }}
        onCategoryAdded={onCategoryAdded}
        onPaymentMethodAdded={onPaymentMethodAdded}
        onCategoryDeleted={onCategoryDeleted}
        onPaymentMethodDeleted={onPaymentMethodDeleted}
        onCategoryUpdated={onCategoryUpdated}
        categories={categories}
        paymentMethods={paymentMethods}
        yearMonth={currentYearMonth()}
        initialDate={addInitialDate}
      />
    </>
  )
}

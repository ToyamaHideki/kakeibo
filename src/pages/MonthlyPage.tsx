import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import TransactionList from '../features/TransactionList'
import TransactionModal from '../features/TransactionModal'
import TransactionAddPanel from '../features/TransactionAddPanel'
import MonthlyChart from '../features/MonthlyChart'
import MonthlyFixedCostsSection from '../features/MonthlyFixedCostsSection'
import { useMonthlyData } from '../hooks/useMonthlyData'
import { useFixedCosts } from '../hooks/useFixedCosts'
import { useHousehold } from '../hooks/useHousehold'
import { updateFixedCost } from '../firebase/firestore'
import { updateHouseholdSettings } from '../firebase/householdFirestore'
import GhostLoader from '../components/GhostLoader'
import type { FixedCost, Transaction, TransactionListDisplayMode } from '../types'
import { adjacentMonth, currentYearMonth, formatYearMonth, formatPayPeriodLabel } from '../utils/date'
import { getEffectiveDay } from '../utils/fixedCost'
import type { OutletContext } from '../components/Layout'
import YearMonthPicker from '../components/YearMonthPicker'
import SegmentedToggle from '../components/SegmentedToggle'

export default function MonthlyPage() {
  const { yearMonth = currentYearMonth() } = useParams<{ yearMonth: string }>()
  const navigate = useNavigate()
  const { categories, paymentMethods, onCategoryAdded, onPaymentMethodAdded, onCategoryDeleted, onPaymentMethodDeleted, onCategoryUpdated } = useOutletContext<OutletContext>()
  const { payDay, transactionListDisplayMode, householdId, isGuest, reloadHousehold } = useHousehold()
  const { transactions, loading, reload } = useMonthlyData(yearMonth, payDay ?? undefined)
  const { fixedCosts, reload: reloadFixedCosts } = useFixedCosts()
  const periodLabel = payDay ? formatPayPeriodLabel(yearMonth, payDay) : formatYearMonth(yearMonth)
  const [editTarget, setEditTarget] = useState<Transaction | undefined>()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'list' | 'chart'>('list')
  const [displayMode, setDisplayMode] = useState<TransactionListDisplayMode>(transactionListDisplayMode)
  const [prefill, setPrefill] = useState<{
    initialDate: string
    initialType: 'expense'
    initialAmount: number | undefined
    initialMemo: string
    initialPaymentMethodId: string | undefined
  } | undefined>()

  const [yearStr, monthStr] = yearMonth.split('-')
  const viewYear = Number(yearStr)
  const viewMonth = Number(monthStr)

  async function handleSkipFixedCost(cost: FixedCost) {
    if (!householdId) return
    const current = cost.skippedMonths ?? []
    if (current.includes(yearMonth)) return
    const next = [...current, yearMonth]
    await updateFixedCost(householdId, cost.id, { skippedMonths: next })
    reloadFixedCosts()
  }

  async function handleRestoreFixedCost(cost: FixedCost) {
    if (!householdId) return
    const current = cost.skippedMonths ?? []
    if (!current.includes(yearMonth)) return
    const next = current.filter(m => m !== yearMonth)
    await updateFixedCost(householdId, cost.id, { skippedMonths: next })
    reloadFixedCosts()
  }

  function handleClickFixedCost(cost: FixedCost) {
    const { effectiveDay, overflows } = getEffectiveDay(cost.dayOfMonth, viewYear, viewMonth)
    const day = overflows ? cost.dayOfMonth : effectiveDay
    const dateStr = `${yearStr}-${monthStr}-${String(day).padStart(2, '0')}`
    const pmId = cost.paymentMethod
      ? paymentMethods.find(pm => pm.name === cost.paymentMethod)?.id
      : undefined
    setPrefill({
      initialDate: dateStr,
      initialType: 'expense',
      initialAmount: cost.isVariable ? undefined : cost.amount,
      initialMemo: cost.name,
      initialPaymentMethodId: pmId,
    })
    setIsAddModalOpen(true)
  }

  useEffect(() => {
    setDisplayMode(transactionListDisplayMode)
  }, [transactionListDisplayMode])

  async function handleChangeDisplayMode(next: TransactionListDisplayMode) {
    setDisplayMode(next)
    if (!householdId || isGuest) return
    try {
      await updateHouseholdSettings(householdId, { transactionListDisplayMode: next })
      await reloadHousehold()
    } catch (err) {
      console.warn('[MonthlyPage] toggleDisplayMode failed:', err)
    }
  }

  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  const expense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  const balance = income - expense

  const incomeStr = `¥${income.toLocaleString()}`
  const expenseStr = `¥${expense.toLocaleString()}`
  const balanceStr = `${balance >= 0 ? '+' : ''}¥${balance.toLocaleString()}`
  const amtSize = (s: string) => s.length <= 6 ? 'text-lg' : s.length <= 9 ? 'text-sm' : 'text-xs'

  function handleEdit(transaction: Transaction) {
    setEditTarget(transaction)
    setIsEditModalOpen(true)
  }

  function handleEditClose() {
    setEditTarget(undefined)
    setIsEditModalOpen(false)
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-hidden">
      {/* 月ナビゲーション */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate(`/months/${adjacentMonth(yearMonth, -1)}`)}
          aria-label="前の月"
          className="p-2 rounded-lg text-gray-500 hover:bg-white hover:shadow-sm transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          onClick={() => setIsPickerOpen(true)}
          aria-label="年月を選択"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white hover:shadow-sm transition-all"
        >
          <span className="text-xl font-bold text-gray-800">{periodLabel}</span>
          <svg className="w-4 h-4 text-gray-500 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <button
          onClick={() => navigate(`/months/${adjacentMonth(yearMonth, 1)}`)}
          aria-label="次の月"
          className="p-2 rounded-lg text-gray-500 hover:bg-white hover:shadow-sm transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <YearMonthPicker
        yearMonth={yearMonth}
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onChange={ym => navigate(`/months/${ym}`)}
      />

      {/* 収支サマリー（モバイルのみ） */}
      <div className="grid grid-cols-3 gap-3 mb-5 md:hidden">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">収入</p>
          <p className={`${amtSize(incomeStr)} font-bold text-sage-600 tabular-nums`}>
            {incomeStr}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">支出</p>
          <p className={`${amtSize(expenseStr)} font-bold text-terracotta-500 tabular-nums`}>
            {expenseStr}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">収支</p>
          <p className={`${amtSize(balanceStr)} font-bold tabular-nums ${balance >= 0 ? 'text-sage-600' : 'text-terracotta-500'}`}>
            {balanceStr}
          </p>
        </div>
      </div>

      {/* タブバー（モバイルのみ）*/}
      <div className="mb-4 md:hidden">
        <SegmentedToggle
          ariaLabel="リスト・グラフ表示切替"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'list', label: 'リスト' },
            { value: 'chart', label: 'グラフ' },
          ]}
        />
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center"><GhostLoader label="読み込み中..." /></div>
      ) : (
        <>
          {/* モバイル: タブ切り替え */}
          <div className="md:hidden flex-1 flex flex-col min-h-0 overflow-hidden">
            {activeTab === 'list' ? (
              <div className="flex-1 overflow-y-auto min-h-0">
                <MonthlyFixedCostsSection
                  fixedCosts={fixedCosts}
                  year={viewYear}
                  month={viewMonth}
                  yearMonth={yearMonth}
                  onClickItem={handleClickFixedCost}
                  onSkip={handleSkipFixedCost}
                  onRestore={handleRestoreFixedCost}
                />
                <TransactionList
                  transactions={transactions}
                  categories={categories}
                  paymentMethods={paymentMethods}
                  onEdit={handleEdit}
                  onDeleted={reload}
                  displayMode={displayMode}
                  onChangeDisplayMode={handleChangeDisplayMode}
                />
              </div>
            ) : (
              <div className="overflow-y-auto">
                <MonthlyChart transactions={transactions} categories={categories} />
              </div>
            )}
          </div>

          {/* デスクトップ: 左カラム（収支・グラフ）中央（リスト）xl で右カラム（登録パネル）*/}
          <div className="hidden md:flex md:flex-1 md:min-h-0 gap-6">
            <div className="w-3/5 xl:w-2/5 shrink-0 flex flex-col gap-4 min-h-0">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">収入</p>
                  <p className={`${amtSize(incomeStr)} font-bold text-sage-600 tabular-nums`}>{incomeStr}</p>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">支出</p>
                  <p className={`${amtSize(expenseStr)} font-bold text-terracotta-500 tabular-nums`}>{expenseStr}</p>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">収支</p>
                  <p className={`${amtSize(balanceStr)} font-bold tabular-nums ${balance >= 0 ? 'text-sage-600' : 'text-terracotta-500'}`}>
                    {balanceStr}
                  </p>
                </div>
              </div>
              <MonthlyChart transactions={transactions} categories={categories} fillHeight />
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <MonthlyFixedCostsSection
                fixedCosts={fixedCosts}
                year={viewYear}
                month={viewMonth}
                yearMonth={yearMonth}
                onClickItem={handleClickFixedCost}
                onSkip={handleSkipFixedCost}
                onRestore={handleRestoreFixedCost}
              />
              <TransactionList
                transactions={transactions}
                categories={categories}
                paymentMethods={paymentMethods}
                onEdit={handleEdit}
                onDeleted={reload}
                displayMode={displayMode}
                onChangeDisplayMode={handleChangeDisplayMode}
              />
            </div>
            {/* xl 以上：右サイドパネル（収支登録） */}
            <aside className="hidden xl:flex xl:flex-col w-[340px] shrink-0 min-h-0">
              <div className="bg-white rounded-2xl border border-gray-200 flex flex-col flex-1 min-h-0">
                <h2 className="text-sm font-semibold text-gray-700 px-4 pt-4 pb-2 shrink-0">収支を登録</h2>
                <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
                  <TransactionAddPanel
                    categories={categories}
                    paymentMethods={paymentMethods}
                    onSaved={reload}
                    onCategoryAdded={onCategoryAdded}
                    onPaymentMethodAdded={onPaymentMethodAdded}
                    onCategoryDeleted={onCategoryDeleted}
                    onPaymentMethodDeleted={onPaymentMethodDeleted}
                    onCategoryUpdated={onCategoryUpdated}
                  />
                </div>
              </div>
            </aside>
          </div>
        </>
      )}

      {/* FAB（xl 未満のみ） */}
      <button
        onClick={() => { setPrefill(undefined); setIsAddModalOpen(true) }}
        aria-label="収支を登録"
        className="xl:hidden fixed right-4 fab-mobile md:bottom-6 z-20 w-14 h-14 bg-sage-600 hover:bg-sage-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
      >
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* 新規追加モーダル */}
      <TransactionModal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setPrefill(undefined) }}
        onSaved={() => { setIsAddModalOpen(false); setPrefill(undefined); reload() }}
        onCategoryAdded={onCategoryAdded}
        onPaymentMethodAdded={onPaymentMethodAdded}
        onCategoryDeleted={onCategoryDeleted}
        onPaymentMethodDeleted={onPaymentMethodDeleted}
        onCategoryUpdated={onCategoryUpdated}
        categories={categories}
        paymentMethods={paymentMethods}
        yearMonth={yearMonth}
        initialDate={prefill?.initialDate}
        initialType={prefill?.initialType}
        initialAmount={prefill?.initialAmount}
        initialMemo={prefill?.initialMemo}
        initialPaymentMethodId={prefill?.initialPaymentMethodId}
      />

      {/* 編集モーダル */}
      <TransactionModal
        isOpen={isEditModalOpen}
        onClose={handleEditClose}
        onSaved={reload}
        onCategoryAdded={onCategoryAdded}
        onPaymentMethodAdded={onPaymentMethodAdded}
        onCategoryDeleted={onCategoryDeleted}
        onPaymentMethodDeleted={onPaymentMethodDeleted}
        onCategoryUpdated={onCategoryUpdated}
        categories={categories}
        paymentMethods={paymentMethods}
        yearMonth={editTarget?.date.slice(0, 7) ?? yearMonth}
        editTarget={editTarget}
      />
    </div>
  )
}

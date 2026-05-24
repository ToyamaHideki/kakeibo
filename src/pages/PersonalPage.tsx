import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { User } from 'firebase/auth'
import TransactionList from '../features/TransactionList'
import TransactionModal from '../features/TransactionModal'
import MonthlyChart from '../features/MonthlyChart'
import { useHousehold } from '../hooks/useHousehold'
import { usePersonalMonthlyData } from '../hooks/usePersonalMonthlyData'
import { usePersonalCategories } from '../hooks/usePersonalCategories'
import { usePersonalPaymentMethods } from '../hooks/usePersonalPaymentMethods'
import {
  deletePersonalTransaction,
  savePersonalTransaction,
  updatePersonalTransaction,
  movePersonalTransaction,
  addPersonalCategory,
  deletePersonalCategory,
  addPersonalPaymentMethod,
  deletePersonalPaymentMethod,
} from '../firebase/personalFirestore'
import YearMonthPicker from '../components/YearMonthPicker'
import type { Transaction } from '../types'
import { adjacentMonth, currentYearMonth, formatYearMonth, formatPayPeriodLabel } from '../utils/date'

export default function PersonalPage() {
  const { user } = useHousehold()
  if (!user) return <PersonalGuestNotice />
  return <PersonalExpenseView user={user} />
}

function PersonalGuestNotice() {
  return (
    <div className="flex items-center justify-center h-full px-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-sage-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-3">個人収支について</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-2">
          個人収支は、世帯の月別収支とは別に自分だけの収支を管理する機能です。
        </p>
        <p className="text-sm text-gray-500 leading-relaxed">
          お小遣いの内訳、副収入、個人的な趣味の支出など、
          世帯全体とは分けて把握したいお金の管理にご利用いただけます。
        </p>
        <p className="text-xs text-gray-400 mt-5">
          ご利用にはGoogleアカウントでのログインが必要です。
        </p>
      </div>
    </div>
  )
}

function PersonalExpenseView({ user }: { user: User }) {
  const { yearMonth = currentYearMonth() } = useParams<{ yearMonth: string }>()
  const navigate = useNavigate()

  const { payDay } = useHousehold()
  const { categories, loading: catLoading, addCategoryLocally, removeCategoryLocally } = usePersonalCategories(user.uid)
  const { paymentMethods, loading: pmLoading, addPaymentMethodLocally, removePaymentMethodLocally } = usePersonalPaymentMethods(user.uid)
  const { transactions, loading: dataLoading, reload } = usePersonalMonthlyData(yearMonth, user.uid, payDay ?? undefined)
  const periodLabel = payDay ? formatPayPeriodLabel(yearMonth, payDay) : formatYearMonth(yearMonth)

  const [editTarget, setEditTarget] = useState<Transaction | undefined>()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'list' | 'chart'>('list')

  const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
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

  const loading = catLoading || pmLoading || dataLoading

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-hidden">
      {/* 月ナビゲーション */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate(`/personal/months/${adjacentMonth(yearMonth, -1)}`)}
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
          onClick={() => navigate(`/personal/months/${adjacentMonth(yearMonth, 1)}`)}
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
        onChange={ym => navigate(`/personal/months/${ym}`)}
      />

      {/* 収支サマリー（モバイルのみ）*/}
      <div className="grid grid-cols-3 gap-3 mb-5 md:hidden">
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

      {/* タブバー�E�モバイルのみ�E�E*/}
      <div className="flex border-b border-gray-200 mb-4 md:hidden">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'list' ? 'text-sage-600 border-b-2 border-sage-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          リスト
        </button>
        <button
          onClick={() => setActiveTab('chart')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'chart' ? 'text-sage-600 border-b-2 border-sage-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          グラフ
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">読み込み中...</div>
      ) : (
        <>
          {/* モバイル: タブ切り替え */}
          <div className="md:hidden flex-1 flex flex-col min-h-0 overflow-hidden">
            {activeTab === 'list' ? (
              <div className="flex-1 overflow-y-auto min-h-0">
                <TransactionList
                  transactions={transactions}
                  categories={categories}
                  paymentMethods={paymentMethods}
                  onEdit={handleEdit}
                  onDeleted={reload}
                  onDelete={(ym, id) => deletePersonalTransaction(user.uid, ym, id)}
                />
              </div>
            ) : (
              <div className="overflow-y-auto">
                <MonthlyChart transactions={transactions} categories={categories} />
              </div>
            )}
          </div>

          {/* デスクトップ: 左カラム（収支・グラフ）右カラム（リスト）*/}
          <div className="hidden md:flex md:flex-1 md:min-h-0 gap-6">
            <div className="w-3/5 shrink-0 flex flex-col gap-4 min-h-0">
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
              <TransactionList
                transactions={transactions}
                categories={categories}
                paymentMethods={paymentMethods}
                onEdit={handleEdit}
                onDeleted={reload}
                onDelete={(ym, id) => deletePersonalTransaction(user.uid, ym, id)}
              />
            </div>
          </div>
        </>
      )}

      {/* FAB */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        aria-label="収支を登録"
        className="fixed right-4 fab-mobile md:bottom-6 z-20 w-14 h-14 bg-terracotta-500 hover:bg-terracotta-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
      >
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* 新規追加モーダル */}
      <TransactionModal
        title="個人収支"
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaved={reload}
        onCategoryAdded={addCategoryLocally}
        onPaymentMethodAdded={addPaymentMethodLocally}
        onCategoryDeleted={removeCategoryLocally}
        onPaymentMethodDeleted={removePaymentMethodLocally}
        categories={categories}
        paymentMethods={paymentMethods}
        yearMonth={yearMonth}
        saveFn={(ym, tx) => savePersonalTransaction(user.uid, ym, tx)}
        updateFn={(ym, tx) => updatePersonalTransaction(user.uid, ym, tx)}
        moveFn={(from, to, tx) => movePersonalTransaction(user.uid, from, to, tx)}
        addCategoryFn={cat => addPersonalCategory(user.uid, cat)}
        deleteCategoryFn={id => deletePersonalCategory(user.uid, id)}
        addPaymentMethodFn={pm => addPersonalPaymentMethod(user.uid, pm)}
        deletePaymentMethodFn={id => deletePersonalPaymentMethod(user.uid, id)}
      />

      {/* 編集モーダル */}
      <TransactionModal
        title="個人収支"
        isOpen={isEditModalOpen}
        onClose={handleEditClose}
        onSaved={reload}
        onCategoryAdded={addCategoryLocally}
        onPaymentMethodAdded={addPaymentMethodLocally}
        onCategoryDeleted={removeCategoryLocally}
        onPaymentMethodDeleted={removePaymentMethodLocally}
        categories={categories}
        paymentMethods={paymentMethods}
        yearMonth={editTarget?.date.slice(0, 7) ?? yearMonth}
        editTarget={editTarget}
        saveFn={(ym, tx) => savePersonalTransaction(user.uid, ym, tx)}
        updateFn={(ym, tx) => updatePersonalTransaction(user.uid, ym, tx)}
        moveFn={(from, to, tx) => movePersonalTransaction(user.uid, from, to, tx)}
        addCategoryFn={cat => addPersonalCategory(user.uid, cat)}
        deleteCategoryFn={id => deletePersonalCategory(user.uid, id)}
        addPaymentMethodFn={pm => addPersonalPaymentMethod(user.uid, pm)}
        deletePaymentMethodFn={id => deletePersonalPaymentMethod(user.uid, id)}
      />
    </div>
  )
}

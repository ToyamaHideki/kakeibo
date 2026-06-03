import { type FormEvent, useEffect, useState } from 'react'
import { moveTransaction, saveTransaction, updateTransaction } from '../firebase/firestore'
import { useHousehold } from '../hooks/useHousehold'
import BottomSheetModal from '../components/BottomSheetModal'
import type { Category, PaymentMethod, Transaction, TransactionType } from '../types'
import CategoryAddModal from './CategoryAddModal'
import PaymentMethodAddModal from './PaymentMethodAddModal'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  onCategoryAdded: (category: Category) => void
  onPaymentMethodAdded: (paymentMethod: PaymentMethod) => void
  onCategoryDeleted: (id: string) => void
  onPaymentMethodDeleted: (id: string) => void
  categories: Category[]
  paymentMethods: PaymentMethod[]
  yearMonth: string
  editTarget?: Transaction | undefined
  // personal モード用オーバーライド（省略時は household 動作）
  title?: string | undefined
  saveFn?: ((yearMonth: string, tx: Transaction) => Promise<void>) | undefined
  updateFn?: ((yearMonth: string, tx: Transaction) => Promise<void>) | undefined
  moveFn?: ((fromYM: string, toYM: string, tx: Transaction) => Promise<void>) | undefined
  addCategoryFn?: ((cat: Omit<Category, 'id'>) => Promise<string>) | undefined
  deleteCategoryFn?: ((id: string) => Promise<void>) | undefined
  updateCategoryFn?: ((id: string, data: Partial<Omit<Category, 'id'>>) => Promise<void>) | undefined
  onCategoryUpdated?: ((category: Category) => void) | undefined
  addPaymentMethodFn?: ((pm: Omit<PaymentMethod, 'id'>) => Promise<string>) | undefined
  deletePaymentMethodFn?: ((id: string) => Promise<void>) | undefined
}

export default function TransactionModal({
  isOpen,
  onClose,
  onSaved,
  onCategoryAdded,
  onPaymentMethodAdded,
  onCategoryDeleted,
  onPaymentMethodDeleted,
  categories,
  paymentMethods,
  yearMonth,
  editTarget,
  title = '収支',
  saveFn,
  updateFn,
  moveFn,
  addCategoryFn,
  deleteCategoryFn,
  updateCategoryFn,
  onCategoryUpdated,
  addPaymentMethodFn,
  deletePaymentMethodFn,
}: Props) {
  const { householdId } = useHousehold()
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [date, setDate] = useState('')
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (editTarget) {
      setType(editTarget.type)
      setAmount(String(editTarget.amount))
      setCategoryId(editTarget.categoryId)
      setPaymentMethodId(editTarget.paymentMethodId ?? '')
      setDate(editTarget.date)
      setMemo(editTarget.memo)
    } else {
      setType('expense')
      setAmount('')
      setCategoryId('')
      setPaymentMethodId('')
      setMemo('')
      setDate(new Date().toISOString().slice(0, 10))
    }
  }, [isOpen, editTarget, yearMonth])

  // タイプ切替時にカテゴリをリセット（編集時は維持）
  useEffect(() => {
    if (!editTarget) setCategoryId('')
  }, [type, editTarget])

  const filteredCategories = categories
    .filter(c => c.type === type)
    .sort((a, b) => a.order - b.order)

  const nextCategoryOrder = Math.max(0, ...filteredCategories.map(c => c.order)) + 1
  const nextPaymentMethodOrder = Math.max(0, ...paymentMethods.map(pm => pm.order)) + 1

  function handleCategoryAdded(category: Category) {
    onCategoryAdded(category)
    setCategoryId(category.id)
  }

  function handleCategoryDeleted(id: string) {
    onCategoryDeleted(id)
    if (categoryId === id) setCategoryId('')
  }

  function handlePaymentMethodAdded(paymentMethod: PaymentMethod) {
    onPaymentMethodAdded(paymentMethod)
    setPaymentMethodId(paymentMethod.id)
  }

  function handlePaymentMethodDeleted(id: string) {
    onPaymentMethodDeleted(id)
    if (paymentMethodId === id) setPaymentMethodId('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!amount || !categoryId || !paymentMethodId || !date) return

    setSaving(true)
    try {
      const transaction: Transaction = {
        id: editTarget?.id ?? crypto.randomUUID(),
        type,
        amount: Number(amount),
        categoryId,
        paymentMethodId,
        date,
        memo,
      }
      const newYearMonth = date.slice(0, 7)

      if (editTarget) {
        if (yearMonth !== newYearMonth) {
          await (moveFn ?? ((from, to, tx) => moveTransaction(householdId!, from, to, tx)))(yearMonth, newYearMonth, transaction)
        } else {
          await (updateFn ?? ((ym, tx) => updateTransaction(householdId!, ym, tx)))(yearMonth, transaction)
        }
      } else {
        await (saveFn ?? ((ym, tx) => saveTransaction(householdId!, ym, tx)))(newYearMonth, transaction)
      }

      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <BottomSheetModal isOpen={isOpen} onClose={onClose} title={editTarget ? `${title}を編集` : `${title}を登録`}>
          <div className="px-5 py-5 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 収入 / 支出 切替 */}
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                    type === 'expense'
                      ? 'bg-terracotta-500 text-white'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  支出
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                    type === 'income'
                      ? 'bg-sage-500 text-white'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  収入
                </button>
              </div>

              {/* 金額 */}
              <div>
                <label htmlFor="transaction-amount" className="block text-xs font-medium text-gray-500 mb-1.5">金額</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    ¥
                  </span>
                  <input
                    id="transaction-amount"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    required
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg text-gray-800 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                  />
                </div>
              </div>

              {/* カテゴリ */}
              <div>
                <label htmlFor="transaction-category" className="block text-xs font-medium text-gray-500 mb-1.5">カテゴリ</label>
                <select
                  id="transaction-category"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                >
                  <option value="">選択してください</option>
                  {filteredCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="mt-1.5 text-xs text-sage-500 hover:text-sage-700 flex items-center gap-1 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  カテゴリを管理する
                </button>
              </div>

              {/* 支払い方法 */}
              <div>
                <label htmlFor="transaction-payment-method" className="block text-xs font-medium text-gray-500 mb-1.5">支払い方法</label>
                <select
                  id="transaction-payment-method"
                  value={paymentMethodId}
                  onChange={e => setPaymentMethodId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                >
                  <option value="">選択してください</option>
                  {paymentMethods.map(pm => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsPaymentMethodModalOpen(true)}
                  className="mt-1.5 text-xs text-sage-500 hover:text-sage-700 flex items-center gap-1 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  支払い方法を管理する
                </button>
              </div>

              {/* 日付 */}
              <div>
                <label htmlFor="transaction-date" className="block text-xs font-medium text-gray-500 mb-1.5">日付</label>
                <input
                  id="transaction-date"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                />
              </div>

              {/* メモ */}
              <div>
                <label htmlFor="transaction-memo" className="block text-xs font-medium text-gray-500 mb-1.5">
                  メモ（任意）
                </label>
                <input
                  id="transaction-memo"
                  type="text"
                  value={memo}
                  onChange={e => setMemo(e.target.value)}
                  placeholder="メモを入力"
                  maxLength={100}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white font-semibold rounded-lg transition-colors mt-2"
              >
                {saving ? '保存中...' : editTarget ? '更新する' : '登録する'}
              </button>
            </form>
          </div>
      </BottomSheetModal>

      <CategoryAddModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onAdded={handleCategoryAdded}
        onDeleted={handleCategoryDeleted}
        onUpdated={onCategoryUpdated ?? (() => {})}
        type={type}
        nextOrder={nextCategoryOrder}
        categories={filteredCategories}
        addCategoryFn={addCategoryFn}
        deleteCategoryFn={deleteCategoryFn}
        updateCategoryFn={updateCategoryFn}
      />

      <PaymentMethodAddModal
        isOpen={isPaymentMethodModalOpen}
        onClose={() => setIsPaymentMethodModalOpen(false)}
        onAdded={handlePaymentMethodAdded}
        onDeleted={handlePaymentMethodDeleted}
        nextOrder={nextPaymentMethodOrder}
        paymentMethods={paymentMethods}
        addPaymentMethodFn={addPaymentMethodFn}
        deletePaymentMethodFn={deletePaymentMethodFn}
      />
    </>
  )
}

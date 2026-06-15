import { type FormEvent, useState } from 'react'
import { saveTransaction } from '../firebase/firestore'
import { useHousehold } from '../hooks/useHousehold'
import type { Category, PaymentMethod, Transaction, TransactionType } from '../types'
import CategoryAddModal from './CategoryAddModal'
import PaymentMethodAddModal from './PaymentMethodAddModal'

interface Props {
  categories: Category[]
  paymentMethods: PaymentMethod[]
  /** 登録完了後に呼ばれる（リスト再読込など） */
  onSaved: () => void
  onCategoryAdded: (category: Category) => void
  onPaymentMethodAdded: (paymentMethod: PaymentMethod) => void
  onCategoryDeleted: (id: string) => void
  onPaymentMethodDeleted: (id: string) => void
  onCategoryUpdated?: ((category: Category) => void) | undefined
  /** personal モード等で挿入先を切り替えるためのオーバーライド */
  saveFn?: ((yearMonth: string, tx: Transaction) => Promise<void>) | undefined
  addCategoryFn?: ((cat: Omit<Category, 'id'>) => Promise<string>) | undefined
  deleteCategoryFn?: ((id: string) => Promise<void>) | undefined
  updateCategoryFn?: ((id: string, data: Partial<Omit<Category, 'id'>>) => Promise<void>) | undefined
  addPaymentMethodFn?: ((pm: Omit<PaymentMethod, 'id'>) => Promise<string>) | undefined
  deletePaymentMethodFn?: ((id: string) => Promise<void>) | undefined
  title?: string | undefined
}

// 収支登録用サイドパネル（PC 常時表示）。編集は TransactionModal が担当。
// 内容は TransactionModal の追加モードと同じ動作。
export default function TransactionAddPanel({
  categories,
  paymentMethods,
  onSaved,
  onCategoryAdded,
  onPaymentMethodAdded,
  onCategoryDeleted,
  onPaymentMethodDeleted,
  onCategoryUpdated,
  saveFn,
  addCategoryFn,
  deleteCategoryFn,
  updateCategoryFn,
  addPaymentMethodFn,
  deletePaymentMethodFn,
}: Props) {
  const { householdId } = useHousehold()
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false)

  const filteredCategories = categories
    .filter(c => c.type === type)
    .sort((a, b) => a.order - b.order)

  const nextCategoryOrder = Math.max(0, ...filteredCategories.map(c => c.order)) + 1
  const nextPaymentMethodOrder = Math.max(0, ...paymentMethods.map(pm => pm.order)) + 1

  function reset() {
    setAmount('')
    setCategoryId('')
    setPaymentMethodId('')
    setMemo('')
    // 日付は保持しない（連続登録時に同じ日付を使うことが多いため）
  }

  function handleCategoryAdded(category: Category) {
    onCategoryAdded(category)
    setCategoryId(category.id)
  }
  function handleCategoryDeleted(id: string) {
    onCategoryDeleted(id)
    if (categoryId === id) setCategoryId('')
  }
  function handlePaymentMethodAdded(pm: PaymentMethod) {
    onPaymentMethodAdded(pm)
    setPaymentMethodId(pm.id)
  }
  function handlePaymentMethodDeleted(id: string) {
    onPaymentMethodDeleted(id)
    if (paymentMethodId === id) setPaymentMethodId('')
  }

  // type 切替時にカテゴリをリセット
  function handleTypeChange(next: TransactionType) {
    setType(next)
    setCategoryId('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!amount || !categoryId || !paymentMethodId || !date) return
    setSaving(true)
    try {
      const transaction: Transaction = {
        id: crypto.randomUUID(),
        type,
        amount: Number(amount),
        categoryId,
        paymentMethodId,
        date,
        memo,
      }
      const newYearMonth = date.slice(0, 7)
      await (saveFn ?? ((ym, tx) => saveTransaction(householdId!, ym, tx)))(newYearMonth, transaction)
      onSaved()
      reset()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 収入 / 支出 切替 */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
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
            onClick={() => handleTypeChange('income')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              type === 'income'
                ? 'bg-sage-500 text-white'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            収入
          </button>
        </div>

        <div>
          <label htmlFor="tx-add-amount" className="block text-xs font-medium text-gray-500 mb-1.5">金額</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">¥</span>
            <input
              id="tx-add-amount"
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

        <div>
          <label htmlFor="tx-add-category" className="block text-xs font-medium text-gray-500 mb-1.5">カテゴリ</label>
          <select
            id="tx-add-category"
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
          >
            <option value="">選択してください</option>
            {filteredCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
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

        <div>
          <label htmlFor="tx-add-payment" className="block text-xs font-medium text-gray-500 mb-1.5">支払い方法</label>
          <select
            id="tx-add-payment"
            value={paymentMethodId}
            onChange={e => setPaymentMethodId(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
          >
            <option value="">選択してください</option>
            {paymentMethods.map(pm => (
              <option key={pm.id} value={pm.id}>{pm.name}</option>
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

        <div>
          <label htmlFor="tx-add-date" className="block text-xs font-medium text-gray-500 mb-1.5">日付</label>
          <input
            id="tx-add-date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
          />
        </div>

        <div>
          <label htmlFor="tx-add-memo" className="block text-xs font-medium text-gray-500 mb-1.5">メモ（任意）</label>
          <input
            id="tx-add-memo"
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
          {saving ? '保存中...' : '登録する'}
        </button>
      </form>

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

import { deleteTransaction } from '../firebase/firestore'
import { useHousehold } from '../hooks/useHousehold'
import { useConfirm } from '../hooks/useConfirm'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Category, PaymentMethod, Transaction } from '../types'

interface Props {
  transactions: Transaction[]
  categories: Category[]
  paymentMethods: PaymentMethod[]
  onEdit: (transaction: Transaction) => void
  onDeleted: () => void
  onDelete?: (yearMonth: string, transactionId: string) => Promise<void>
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function formatDateLabel(dateStr: string): string {
  const parts = dateStr.split('-').map(Number)
  const year = parts[0]!
  const month = parts[1]!
  const day = parts[2]!
  const date = new Date(year, month - 1, day)
  return `${month}月${day}日（${WEEKDAYS[date.getDay()]}）`
}

export default function TransactionList({
  transactions,
  categories,
  paymentMethods,
  onEdit,
  onDeleted,
  onDelete,
}: Props) {
  const { householdId } = useHousehold()
  const { confirm, dialogProps } = useConfirm()
  const categoryMap = new Map(categories.map(c => [c.id, c]))
  const paymentMethodMap = new Map(paymentMethods.map(pm => [pm.id, pm]))

  const grouped = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .reduce<Record<string, Transaction[]>>((acc, t) => {
      const list = acc[t.date] ?? []
      list.push(t)
      acc[t.date] = list
      return acc
    }, {})

  async function handleDelete(transaction: Transaction) {
    if (!await confirm('この収支を削除しますか？')) return
    const ym = transaction.date.slice(0, 7)
    const deleteFn = onDelete ?? ((ym: string, tid: string) => deleteTransaction(householdId!, ym, tid))
    await deleteFn(ym, transaction.id)
    onDeleted()
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
        <p className="text-gray-500 text-sm">収支データがありません</p>
        <p className="text-gray-500 text-xs mt-1">＋ボタンから収支を登録してください</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([date, items]) => (
        <div
          key={date}
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500">{formatDateLabel(date)}</span>
          </div>

          {items.map((t, idx) => {
            const category = categoryMap.get(t.categoryId)
            const paymentMethod = t.paymentMethodId ? paymentMethodMap.get(t.paymentMethodId) : undefined
            return (
              <div
                key={t.id}
                className={`flex items-center px-4 py-3 gap-3 ${
                  idx < items.length - 1 ? 'border-b border-gray-50' : ''
                }`}
              >
                <div
                  className="w-1 h-8 rounded-full shrink-0"
                  style={{ backgroundColor: category?.color ?? '#9ca3af' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">{category?.name ?? '不明'}</p>
                  {paymentMethod && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{paymentMethod.name}</p>
                  )}
                  {t.memo && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{t.memo}</p>
                  )}
                </div>
                <span
                  className={`text-base font-bold tabular-nums shrink-0 ${
                    t.type === 'income' ? 'text-sage-600' : 'text-terracotta-500'
                  }`}
                >
                  {t.type === 'income' ? '+' : '-'}¥{t.amount.toLocaleString()}
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => onEdit(t)}
                    aria-label="編集"
                    className="p-1.5 text-gray-300 hover:text-sage-500 rounded transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    aria-label="削除"
                    className="p-1.5 text-gray-300 hover:text-terracotta-500 rounded transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ))}
      <ConfirmDialog {...dialogProps} />
    </div>
  )
}

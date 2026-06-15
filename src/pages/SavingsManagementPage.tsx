import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { deleteField } from 'firebase/firestore'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSavingsAccounts } from '../hooks/useSavingsAccounts'
import { useHousehold } from '../hooks/useHousehold'
import { useConfirm } from '../hooks/useConfirm'
import ConfirmDialog from '../components/ConfirmDialog'
import GhostLoader from '../components/GhostLoader'
import { fetchAllSecuritiesAccountsForUser } from '../firebase/privateSecuritiesFirestore'
import type { SavingsAccount, SecuritiesAccount } from '../types'

const PRESET_COLORS = [
  '#6b9080', '#84a98c', '#52796f', '#a8c5b5',
  '#457b9d', '#5b8db8', '#7b68ee', '#9b59b6',
  '#e76f51', '#f4a261', '#e9c46a', '#94a3b8',
]

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatLastUpdated(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length < 3) return dateStr
  return `${parseInt(parts[1]!)}月${parseInt(parts[2]!)}日更新`
}

export default function SavingsManagementPage() {
  const { householdId, user } = useHousehold()
  const { accounts, loading: accountsLoading, addAccount, updateAccount, deleteAccount, reorderAccounts } = useSavingsAccounts()
  const { confirm, dialogProps } = useConfirm()
  const [securities, setSecurities] = useState<SecuritiesAccount[]>([])
  const [secLoading, setSecLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SavingsAccount | null>(null)
  const [name, setName] = useState('')
  const [owner, setOwner] = useState('')
  const [amount, setAmount] = useState('')
  const [lastUpdated, setLastUpdated] = useState(todayStr())
  const [color, setColor] = useState(PRESET_COLORS[0]!)
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!householdId) return
    fetchAllSecuritiesAccountsForUser(householdId, user?.uid ?? null)
      .then(data => setSecurities(data.sort((a, b) => a.order - b.order)))
      .finally(() => setSecLoading(false))
  }, [householdId, user?.uid])

  const bankTotal = accounts.reduce((s, a) => s + a.currentAmount, 0)
  const secTotal = securities.reduce((s, a) => s + a.currentValue, 0)
  const grandTotal = bankTotal + secTotal

  function openAdd() {
    setEditTarget(null)
    setName('')
    setOwner('')
    setAmount('')
    setLastUpdated(todayStr())
    setColor(PRESET_COLORS[0]!)
    setMemo('')
    setModalOpen(true)
  }

  function openEdit(acc: SavingsAccount) {
    setEditTarget(acc)
    setName(acc.name)
    setOwner(acc.owner ?? '')
    setAmount(String(acc.currentAmount))
    setLastUpdated(acc.lastUpdated)
    setColor(acc.color)
    setMemo(acc.memo ?? '')
    setModalOpen(true)
  }

  async function handleDelete(id: string) {
    if (!await confirm('この口座を削除しますか？')) return
    await deleteAccount(id)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !amount) return
    setSaving(true)
    try {
      const trimmedOwner = owner.trim()
      const trimmedMemo = memo.trim()
      if (editTarget) {
        // 編集時: 空にしたフィールドは deleteField() で Firestore から削除
        await updateAccount(editTarget.id, {
          name: name.trim(),
          color,
          currentAmount: Number(amount),
          lastUpdated,
          owner: trimmedOwner || deleteField(),
          memo: trimmedMemo || deleteField(),
        } as Partial<Omit<SavingsAccount, 'id'>>)
      } else {
        // 追加時： undefined をフィールドに含めない
        const data: Omit<SavingsAccount, 'id'> = {
          name: name.trim(),
          color,
          order: accounts.length > 0 ? Math.max(...accounts.map(a => a.order)) + 1 : 1,
          currentAmount: Number(amount),
          lastUpdated,
        }
        if (trimmedOwner) (data as Record<string, unknown>).owner = trimmedOwner
        if (trimmedMemo) (data as Record<string, unknown>).memo = trimmedMemo
        await addAccount(data)
      }
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const loading = accountsLoading || secLoading

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = accounts.findIndex(a => a.id === active.id)
    const newIdx = accounts.findIndex(a => a.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    reorderAccounts(arrayMove(accounts, oldIdx, newIdx))
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-4 md:py-6 pb-24 md:pb-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">貯蓄管理</h1>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-2 bg-sage-600 hover:bg-sage-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            口座追加
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48"><GhostLoader label="読み込み中..." /></div>
        ) : (
          <>
            {/* 全資産合計カード */}
            <div className="bg-gradient-to-br from-sage-600 to-sage-800 rounded-2xl p-5 text-white mb-5 shadow-md">
              <div className="text-sm font-medium opacity-75 mb-1">全資産合計</div>
              <div className="text-3xl font-bold tracking-tight mb-3">
                ¥{grandTotal.toLocaleString()}
              </div>
              <div className="flex gap-5 text-sm">
                <div>
                  <span className="opacity-60">銀行・その他</span>
                  <div className="font-semibold">¥{bankTotal.toLocaleString()}</div>
                </div>
                <div className="w-px bg-white/20" />
                <div>
                  <span className="opacity-60">証券評価額</span>
                  <div className="font-semibold">¥{secTotal.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* 銀行・その他口座 */}
            <section className="mb-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
                銀行・その他
              </h2>
              {accounts.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-10 text-center">
                  <p className="text-gray-500 text-sm mb-3">口座が登録されていません</p>
                  <button
                    onClick={openAdd}
                    className="text-sage-600 text-sm font-medium hover:text-sage-700"
                  >
                    + 口座を追加する
                  </button>
                </div>
              ) : (
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={accounts.map(a => a.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {accounts.map(acc => (
                        <SortableSavingsAccountItem
                          key={acc.id}
                          account={acc}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </section>

            {/* 証券口座（読み取り専用） */}
            <section>
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  証券口座
                </h2>
                <Link
                  to="/securities"
                  className="text-xs text-sage-600 hover:text-sage-700 flex items-center gap-0.5 transition-colors"
                >
                  管理する
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </div>
              {securities.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-8 text-center">
                  <p className="text-gray-500 text-sm mb-2">証券口座が登録されていません</p>
                  <Link to="/securities" className="text-sage-600 text-sm font-medium hover:text-sage-700">
                    証券口座を追加する →
                  </Link>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {securities.map(sec => (
                      <div key={sec.id} className="flex items-center gap-3 px-4 py-3">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: sec.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">{sec.name}</div>
                            {sec.owner && (
                              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-sage-50 text-sage-600 font-medium">
                                {sec.owner}
                              </span>
                            )}
                          </div>
                          {sec.broker && (
                            <div className="text-xs text-gray-500">{sec.broker}</div>
                          )}
                        </div>
                        <div className="shrink-0 text-sm font-semibold text-gray-700">
                          ¥{sec.currentValue.toLocaleString()}
                        </div>
                        <svg className="w-3.5 h-3.5 text-gray-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 bg-gray-50/80 border-t border-gray-100">
                    <p className="text-xs text-gray-500">証券口座の編集は「証券口座」画面から行えます</p>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* 追加・編集モーダル */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center"
          role="presentation"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white w-full md:max-w-md md:rounded-xl rounded-t-2xl shadow-xl flex flex-col max-h-[92vh] md:max-h-[85vh]"
            role="presentation"
            onClick={e => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold text-gray-800">
                {editTarget ? '口座を編集' : '口座を追加'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-5 overflow-y-auto space-y-4">
              {/* 口座名 */}
              <div>
                <label htmlFor="savings-account-name" className="block text-xs font-medium text-gray-500 mb-1.5">口座名</label>
                <input
                  id="savings-account-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="例：三菱UFJ普通預金"
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
                />
              </div>

              {/* 名義人 */}
              <div>
                <label htmlFor="savings-account-owner" className="block text-xs font-medium text-gray-500 mb-1.5">名義人（任意）</label>
                <input
                  id="savings-account-owner"
                  type="text"
                  value={owner}
                  onChange={e => setOwner(e.target.value)}
                  placeholder="例：夫、妻、子供"
                  maxLength={20}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
                />
              </div>

              {/* 残高 */}
              <div>
                <label htmlFor="savings-account-amount" className="block text-xs font-medium text-gray-500 mb-1.5">残高</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">¥</span>
                  <input
                    id="savings-account-amount"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    required
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg text-gray-800 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-sage-300"
                  />
                </div>
              </div>

              {/* 更新日 */}
              <div>
                <label htmlFor="savings-account-last-updated" className="block text-xs font-medium text-gray-500 mb-1.5">残高確認日</label>
                <input
                  id="savings-account-last-updated"
                  type="date"
                  value={lastUpdated}
                  onChange={e => setLastUpdated(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
                />
              </div>

              {/* カラー */}
              <div>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- カラーピッカーボタングループのラベルはhtmlForで関連付け不可 */}
                <label className="block text-xs font-medium text-gray-500 mb-2">カラー</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* メモ */}
              <div>
                <label htmlFor="savings-account-memo" className="block text-xs font-medium text-gray-500 mb-1.5">メモ（任意）</label>
                <input
                  id="savings-account-memo"
                  type="text"
                  value={memo}
                  onChange={e => setMemo(e.target.value)}
                  placeholder="メモを入力"
                  maxLength={100}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white font-semibold rounded-lg transition-colors mt-2"
              >
                {saving ? '保存中...' : editTarget ? '更新する' : '追加する'}
              </button>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog {...dialogProps} />
    </div>
  )
}

function SortableSavingsAccountItem({
  account: acc,
  onEdit,
  onDelete,
}: {
  account: SavingsAccount
  onEdit: (acc: SavingsAccount) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: acc.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 touch-none"
        tabIndex={-1}
        aria-label="並び替え"
      >
        <svg viewBox="0 0 8 14" width="10" height="14" fill="currentColor">
          <circle cx="2" cy="2"  r="1.2" /><circle cx="6" cy="2"  r="1.2" />
          <circle cx="2" cy="7"  r="1.2" /><circle cx="6" cy="7"  r="1.2" />
          <circle cx="2" cy="12" r="1.2" /><circle cx="6" cy="12" r="1.2" />
        </svg>
      </button>
      <div
        className="w-3 h-10 rounded-full shrink-0"
        style={{ backgroundColor: acc.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="text-sm font-semibold text-gray-800 truncate">{acc.name}</div>
          {acc.owner && (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-sage-50 text-sage-600 font-medium">
              {acc.owner}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">{formatLastUpdated(acc.lastUpdated)}</div>
        {acc.memo && <div className="text-xs text-gray-500 truncate">{acc.memo}</div>}
      </div>
      <div className="shrink-0 text-right mr-1">
        <div className="text-base font-bold text-gray-800">
          ¥{acc.currentAmount.toLocaleString()}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onEdit(acc)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(acc.id)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-terracotta-50 hover:text-terracotta-500 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

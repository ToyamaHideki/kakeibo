import { useCallback, useState } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useContracts } from '../hooks/useContracts'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useConfirm } from '../hooks/useConfirm'
import { useHousehold } from '../hooks/useHousehold'
import { useMemberProfiles } from '../hooks/useMemberProfiles'
import ConfirmDialog from '../components/ConfirmDialog'
import GhostLoader from '../components/GhostLoader'
import type { Contract, ContractScope, PaymentFrequency } from '../types'

// ─── ユーティリティ ────────────────────────────────────────────────────────────

const FREQUENCY_LABEL: Record<PaymentFrequency, string> = {
  monthly: '月',
  yearly: '年',
}

const today = new Date().toISOString().slice(0, 10)

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))
}

function renewalBadge(renewalDate: string) {
  const days = daysUntil(renewalDate)
  if (days < 0)  return { label: '期限切れ', cls: 'bg-red-100 text-red-600 border-red-200' }
  if (days === 0) return { label: '今日', cls: 'bg-red-100 text-red-600 border-red-200' }
  if (days <= 7)  return { label: `${days}日後`, cls: 'bg-red-100 text-red-600 border-red-200' }
  if (days <= 30) return { label: `${days}日後`, cls: 'bg-orange-100 text-orange-600 border-orange-200' }
  return null
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${y}/${Number(m)}/${Number(d)}`
}

function calcStats(c: Contract): { durationText: string; totalPaid: number } | null {
  if (!c.startDate) return null
  const start = new Date(c.startDate)
  const now = new Date()
  if (start > now) return null

  const totalMonths =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())

  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  let durationText = ''
  if (years > 0 && months > 0) durationText = `${years}年${months}ヶ月`
  else if (years > 0) durationText = `${years}年`
  else if (months > 0) durationText = `${months}ヶ月`
  else durationText = '1ヶ月未満'

  const paymentCount =
    c.frequency === 'monthly'
      ? totalMonths + 1
      : Math.floor(totalMonths / 12) + 1
  const totalPaid = Math.max(1, paymentCount) * c.amount

  return { durationText, totalPaid }
}

// ─── フォーム ──────────────────────────────────────────────────────────────────

type FormState = {
  name: string
  amount: string
  frequency: PaymentFrequency
  renewalDate: string
  paymentMethod: string
  startDate: string
  isAutoRenew: boolean
  memo: string
  scope: ContractScope
}

const defaultForm: FormState = {
  name: '',
  amount: '',
  frequency: 'monthly',
  renewalDate: '',
  paymentMethod: '',
  startDate: '',
  isAutoRenew: true,
  memo: '',
  scope: 'shared',
}

function contractToForm(c: Contract): FormState {
  return {
    name: c.name,
    amount: String(c.amount),
    frequency: c.frequency,
    renewalDate: c.renewalDate ?? '',
    paymentMethod: c.paymentMethod ?? '',
    startDate: c.startDate ?? '',
    isAutoRenew: c.isAutoRenew,
    memo: c.memo ?? '',
    scope: c.scope ?? 'shared',
  }
}

// ─── コンポーネント ────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const { contracts: allContracts, loading, addContract, updateContract, deleteContract, reorderContracts } = useContracts()
  const { user } = useHousehold()
  const memberNames = useMemberProfiles()
  const subscriptions = allContracts.filter(c => c.contractType === 'subscription')
  const nonSubscriptions = allContracts.filter(c => c.contractType !== 'subscription')
  const { confirm, dialogProps } = useConfirm()
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Contract | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)

  function openAdd() {
    setEditTarget(null)
    setForm(defaultForm)
    setShowModal(true)
  }

  function openEdit(contract: Contract) {
    setEditTarget(contract)
    setForm(contractToForm(contract))
    setShowModal(true)
  }

  const closeModal = useCallback(() => {
    setShowModal(false)
    setEditTarget(null)
    setForm(defaultForm)
  }, [])

  useEscapeKey(closeModal, showModal)

  async function handleSubmit() {
    const trimmed = form.name.trim()
    if (!trimmed) return
    const amount = Number(form.amount)
    if (isNaN(amount) || amount < 0) return

    const data: Omit<Contract, 'id' | 'order'> = {
      name: trimmed,
      contractType: 'subscription',
      amount,
      frequency: form.frequency,
      isAutoRenew: form.isAutoRenew,
      scope: form.scope,
    }
    // 個人の持ち主は「既存は元のownerを維持／新規は作成者」。編集で他人のものを奪わない
    const resolvedOwner = editTarget?.owner ?? user?.uid
    if (form.scope === 'personal' && resolvedOwner) data.owner = resolvedOwner
    if (form.renewalDate) data.renewalDate = form.renewalDate
    if (form.paymentMethod.trim()) data.paymentMethod = form.paymentMethod.trim()
    if (form.startDate) data.startDate = form.startDate
    if (form.memo.trim()) data.memo = form.memo.trim()

    if (editTarget) {
      await updateContract(editTarget.id, data)
    } else {
      await addContract(data)
    }
    closeModal()
  }

  async function handleDelete() {
    if (!editTarget) return
    if (!await confirm(`「${editTarget.name}」を削除しますか？`)) return
    await deleteContract(editTarget.id)
    closeModal()
  }

  const monthlyTotal = subscriptions.filter(c => c.frequency === 'monthly').reduce((s, c) => s + c.amount, 0)
  const yearlyTotal = subscriptions.filter(c => c.frequency === 'yearly').reduce((s, c) => s + c.amount, 0)

  const upcoming = subscriptions
    .filter(c => c.renewalDate && daysUntil(c.renewalDate) <= 30)
    .sort((a, b) => (a.renewalDate ?? '').localeCompare(b.renewalDate ?? ''))

  // order フィールド順（D&D対応）
  const rest = subscriptions.filter(c => !c.renewalDate || daysUntil(c.renewalDate) > 30)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = rest.findIndex(c => c.id === active.id)
    const newIdx = rest.findIndex(c => c.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    reorderContracts([...nonSubscriptions, ...upcoming, ...arrayMove(rest, oldIdx, newIdx)])
  }

  if (loading) {
    return <div className="flex items-center justify-center h-48"><GhostLoader label="読み込み中..." /></div>
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto h-full flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-xl font-bold text-gray-800">サブスク管理</h2>
        <span className="text-xs text-gray-500">{subscriptions.length}件</span>
      </div>

      {/* コストサマリー */}
      {subscriptions.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
          <div className="bg-blue-50 rounded-xl px-4 py-3">
            <p className="text-xs text-blue-500 font-medium">月払い合計</p>
            <p className="text-lg font-bold text-blue-700 mt-0.5">¥{monthlyTotal.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500 font-medium">年払い合計</p>
            <p className="text-lg font-bold text-gray-700 mt-0.5">¥{yearlyTotal.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {subscriptions.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            <p className="text-sm">サブスクがありません</p>
            <p className="text-xs mt-1">右下のボタンから追加してください</p>
          </div>
        )}

        {upcoming.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-500 mb-2 flex items-center gap-1">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm.93-9.412l-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 110-2 1 1 0 010 2z"/>
              </svg>
              まもなく更新
            </p>
            <div className="space-y-2">
              {upcoming.map(c => <SubscriptionCard key={c.id} contract={c} onEdit={openEdit} memberNames={memberNames} />)}
            </div>
          </div>
        )}

        {rest.length > 0 && (
          <div>
            {upcoming.length > 0 && (
              <p className="text-xs font-semibold text-gray-500 mb-2">すべてのサブスク</p>
            )}
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={rest.map(c => c.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {rest.map(c => (
                    <SortableSubscriptionCard key={c.id} contract={c} onEdit={openEdit} memberNames={memberNames} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed fab-mobile right-4 md:bottom-6 md:right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-10"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* 追加・編集モーダル */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md max-h-[90svh] flex flex-col shadow-xl"
            role="presentation"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
              <h3 className="text-base font-bold text-gray-800">
                {editTarget ? 'サブスクを編集' : 'サブスクを追加'}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-600">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4 space-y-4">
              {/* 名前 */}
              <div>
                <label htmlFor="subscription-name" className="block text-xs font-medium text-gray-600 mb-1">サービス名 <span className="text-red-400">*</span></label>
                <input
                  id="subscription-name"
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="例：Netflix、Spotify"
                  autoFocus
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>

              {/* 金額・周期 */}
              <div>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- 金額入力と支払い周期ボタンの複合コントロールのラベル */}
                <label className="block text-xs font-medium text-gray-600 mb-1">料金</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">¥</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={form.amount}
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      placeholder="0"
                      className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    />
                  </div>
                  <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                    {(['monthly', 'yearly'] as PaymentFrequency[]).map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setForm(s => ({ ...s, frequency: f }))}
                        className={`px-3 py-2 text-xs font-medium transition-colors ${
                          form.frequency === f
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {FREQUENCY_LABEL[f]}払い
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 次回更新日 */}
              <div>
                <label htmlFor="subscription-renewal-date" className="block text-xs font-medium text-gray-600 mb-1">次回更新日（任意）</label>
                <input
                  id="subscription-renewal-date"
                  type="date"
                  value={form.renewalDate}
                  onChange={e => setForm(f => ({ ...f, renewalDate: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  区分が「共有」かつ次回更新日を設定すると、<br />
                  固定費一覧に表示され、月の合計にも反映されます。
                </p>
              </div>

              {/* 支払い方法 */}
              <div>
                <label htmlFor="subscription-payment-method" className="block text-xs font-medium text-gray-600 mb-1">支払い方法（任意）</label>
                <input
                  id="subscription-payment-method"
                  type="text"
                  value={form.paymentMethod}
                  onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                  placeholder="例：クレカ・Apple Pay"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>

              {/* 契約開始日 */}
              <div>
                <label htmlFor="subscription-start-date" className="block text-xs font-medium text-gray-600 mb-1">契約開始日（任意）</label>
                <input
                  id="subscription-start-date"
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>

              {/* 共有/個人 */}
              <div>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- 共有/個人の選択ボタン群のラベル */}
                <label className="block text-xs font-medium text-gray-600 mb-1">区分</label>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                  {(['shared', 'personal'] as ContractScope[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, scope: s }))}
                      className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                        form.scope === s ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {s === 'shared' ? '共有' : '個人'}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  共有は世帯の固定費一覧に表示されます。個人は設定で表示を切り替えできます。
                </p>
              </div>

              {/* 自動更新 */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isAutoRenew}
                    onChange={e => setForm(f => ({ ...f, isAutoRenew: e.target.checked }))}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                  <span className="text-sm text-gray-700">自動更新あり</span>
                </label>
              </div>

              {/* メモ */}
              <div>
                <label htmlFor="subscription-memo" className="block text-xs font-medium text-gray-600 mb-1">メモ（任意）</label>
                <textarea
                  id="subscription-memo"
                  value={form.memo}
                  onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
                  placeholder="例：スタンダードプラン、家族で利用"
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 resize-none"
                />
              </div>

              {/* ボタン */}
              <div className="space-y-2 pb-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!form.name.trim()}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-200 text-white rounded-xl font-medium text-sm transition-colors"
                >
                  {editTarget ? '保存する' : '追加する'}
                </button>
                {editTarget && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="w-full py-3 bg-white hover:bg-red-50 text-red-400 hover:text-red-500 border border-red-200 rounded-xl font-medium text-sm transition-colors"
                  >
                    削除する
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog {...dialogProps} />
    </div>
  )
}

// ─── SubscriptionCard / SortableSubscriptionCard ──────────────────────────────

function SortableSubscriptionCard({ contract: c, onEdit, memberNames }: { contract: Contract; onEdit: (c: Contract) => void; memberNames: Record<string, string> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: c.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch gap-1">
      <button
        {...attributes}
        {...listeners}
        className="flex items-center px-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none shrink-0"
        tabIndex={-1}
        aria-label="並び替え"
      >
        <svg viewBox="0 0 8 14" width="10" height="14" fill="currentColor">
          <circle cx="2" cy="2"  r="1.2" /><circle cx="6" cy="2"  r="1.2" />
          <circle cx="2" cy="7"  r="1.2" /><circle cx="6" cy="7"  r="1.2" />
          <circle cx="2" cy="12" r="1.2" /><circle cx="6" cy="12" r="1.2" />
        </svg>
      </button>
      <div className="flex-1 min-w-0">
        <SubscriptionCard contract={c} onEdit={onEdit} memberNames={memberNames} />
      </div>
    </div>
  )
}

function SubscriptionCard({ contract: c, onEdit, memberNames }: { contract: Contract; onEdit: (c: Contract) => void; memberNames: Record<string, string> }) {
  const badge = c.renewalDate ? renewalBadge(c.renewalDate) : null
  const stats = calcStats(c)
  const ownerLabel = c.scope === 'personal' ? (c.owner ? memberNames[c.owner] ?? 'メンバー' : '個人') : null

  return (
    <button
      onClick={() => onEdit(c)}
      className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 hover:border-blue-200 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-gray-800 truncate">{c.name}</span>
            {ownerLabel && (
              <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">個人・{ownerLabel}</span>
            )}
            {c.isAutoRenew && (
              <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor" className="text-blue-300 shrink-0">
                <path fillRule="evenodd" d="M8 3a5 5 0 104.546 2.914.5.5 0 000-.986A4 4 0 118 4.25v-.75a.5.5 0 00-.854-.354L5.646 4.646a.5.5 0 000 .708l1.5 1.5a.5.5 0 10.708-.708L7.207 5.5H8V3z"/>
              </svg>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
            {c.paymentMethod && <span>{c.paymentMethod}</span>}
            {c.renewalDate && (
              <span className="text-gray-500">更新 {formatDate(c.renewalDate)}</span>
            )}
            {badge && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border font-medium ${badge.cls}`}>
                {badge.label}
              </span>
            )}
          </div>
          {c.memo && <p className="text-[10px] text-gray-500 mt-0.5 truncate">{c.memo}</p>}
          {stats && (
            <p className="text-[10px] text-blue-400 mt-1">
              {stats.durationText}継続中 · 累計：¥{stats.totalPaid.toLocaleString()}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-blue-600">
            ¥{c.amount.toLocaleString()}
            <span className="text-xs font-normal text-gray-500">/{c.frequency === 'monthly' ? '月' : '年'}</span>
          </p>
        </div>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 shrink-0">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </button>
  )
}

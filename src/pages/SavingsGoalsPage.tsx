import { useCallback, useState } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSavingsGoals } from '../hooks/useSavingsGoals'
import { appendCfLifeEvent } from '../firebase/firestore'
import { useHousehold } from '../hooks/useHousehold'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useConfirm } from '../hooks/useConfirm'
import ConfirmDialog from '../components/ConfirmDialog'
import { currentYearMonth } from '../utils/date'
import { formatYenCompact as formatYen } from '../utils/format'
import type { SavingsGoal } from '../types'

// ─── 定数 ─────────────────────────────────────────────────────────────────────

const GOAL_COLORS = [
  '#4a7c59', '#3b82f6', '#8b5cf6', '#f97316',
  '#ec4899', '#14b8a6', '#eab308', '#ef4444',
]

function remainingMonths(targetYear: number): number {
  const now = new Date()
  const endMonth = targetYear * 12 + 12  // その年の12月末
  const nowMonth = now.getFullYear() * 12 + now.getMonth() + 1
  return Math.max(1, endMonth - nowMonth)
}

function monthlyNeeded(goal: SavingsGoal): number | null {
  if (!goal.targetYear) return null
  const remaining = goal.targetAmount - goal.currentAmount
  if (remaining <= 0) return 0
  return Math.ceil(remaining / remainingMonths(goal.targetYear))
}

// ─── フォーム型 ────────────────────────────────────────────────────────────────

type FormState = {
  name: string
  targetAmount: string
  targetYear: string
  currentAmount: string
  color: string
  memo: string
  syncToCf: boolean
}

const defaultForm: FormState = {
  name: '',
  targetAmount: '',
  targetYear: '',
  currentAmount: '0',
  color: GOAL_COLORS[0],
  memo: '',
  syncToCf: false,
}

function goalToForm(g: SavingsGoal): FormState {
  return {
    name: g.name,
    targetAmount: String(g.targetAmount),
    targetYear: g.targetYear ? String(g.targetYear) : '',
    currentAmount: String(g.currentAmount),
    color: g.color,
    memo: g.memo ?? '',
    syncToCf: false,
  }
}

// ─── ページ ────────────────────────────────────────────────────────────────────

export default function SavingsGoalsPage() {
  const { householdId } = useHousehold()
  const { goals, loading, addGoal, updateGoal, deleteGoal, logContribution, reorderGoals } = useSavingsGoals()
  const { confirm, dialogProps } = useConfirm()
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<SavingsGoal | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [contributionInput, setContributionInput] = useState('')
  const [activeTab, setActiveTab] = useState<'settings' | 'contribution'>('settings')

  const closeModal = useCallback(() => {
    setShowModal(false)
    setEditTarget(null)
    setForm(defaultForm)
    setContributionInput('')
    setActiveTab('settings')
  }, [])

  useEscapeKey(closeModal, showModal)

  function openAdd() {
    setEditTarget(null)
    setForm(defaultForm)
    setActiveTab('settings')
    setShowModal(true)
  }

  function openEdit(goal: SavingsGoal) {
    setEditTarget(goal)
    setForm(goalToForm(goal))
    setActiveTab('settings')
    setContributionInput('')
    setShowModal(true)
  }

  async function handleSave() {
    const name = form.name.trim()
    if (!name) return
    const targetAmount = Number(form.targetAmount)
    if (!targetAmount || targetAmount <= 0) return
    const currentAmount = Number(form.currentAmount) || 0
    const targetYear = form.targetYear ? Number(form.targetYear) : undefined

    const data: Omit<SavingsGoal, 'id' | 'order'> = {
      name,
      targetAmount,
      currentAmount,
      color: form.color,
      contributions: editTarget?.contributions ?? {},
    }
    if (targetYear) data.targetYear = targetYear
    if (form.memo.trim()) data.memo = form.memo.trim()

    if (editTarget) {
      await updateGoal(editTarget.id, data)
    } else {
      await addGoal(data)
    }

    if (form.syncToCf && targetYear) {
      if (householdId) await appendCfLifeEvent(householdId, targetYear, name)
    }

    closeModal()
  }

  async function handleDelete() {
    if (!editTarget) return
    if (!await confirm(`「${editTarget.name}」を削除しますか？`)) return
    await deleteGoal(editTarget.id)
    closeModal()
  }

  async function handleLogContribution() {
    if (!editTarget) return
    const amount = Number(contributionInput)
    if (!amount || amount <= 0) return
    await logContribution(editTarget.id, currentYearMonth(), amount)
    setContributionInput('')
    // ローカルの editTarget を最新に同期
    setEditTarget(prev => prev ? { ...prev, currentAmount: prev.currentAmount + amount } : null)
  }

  const totalCurrent = goals.reduce((s, g) => s + g.currentAmount, 0)
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = goals.findIndex(g => g.id === active.id)
    const newIdx = goals.findIndex(g => g.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    reorderGoals(arrayMove(goals, oldIdx, newIdx))
  }

  if (loading) {
    return <div className="flex items-center justify-center h-48 text-gray-500 text-sm">読み込み中...</div>
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <h2 className="text-xl font-bold text-gray-800">貯蓄目標</h2>
        {goals.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-500">総残高</p>
            <p className="text-sm font-bold text-gray-800">{formatYen(totalCurrent)}<span className="text-xs text-gray-500 font-normal"> / {formatYen(totalTarget)}</span></p>
          </div>
        )}
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto">
        {goals.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              <path d="M12 6v6l4 2" />
            </svg>
            <p className="text-sm">目標がありません</p>
            <p className="text-xs mt-1">右下のボタンから目標を追加してください</p>
          </div>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={goals.map(g => g.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pb-2">
                {goals.map(goal => <SortableGoalCard key={goal.id} goal={goal} onEdit={openEdit} />)}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed fab-mobile right-4 md:bottom-6 md:right-6 w-14 h-14 bg-sage-600 hover:bg-sage-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-10"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* モーダル */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90svh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
              <h3 className="text-base font-bold text-gray-800">{editTarget ? '目標を編集' : '目標を追加'}</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-600">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* タブ（編集時のみ） */}
            {editTarget && (
              <div className="flex gap-1 px-4 pt-3 shrink-0">
                {(['settings', 'contribution'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === tab ? 'bg-sage-600 text-white' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {tab === 'settings' ? '基本設定' : '積立を記録'}
                  </button>
                ))}
              </div>
            )}

            {/* 基本設定タブ */}
            {activeTab === 'settings' && (
              <div className="overflow-y-auto px-5 py-4 space-y-4">
                {/* 名前 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">目標名 <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="例：マイホーム頭金"
                    autoFocus={!editTarget}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                  />
                </div>

                {/* 目標金額 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">目標金額 <span className="text-red-400">*</span></label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-500">¥</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={form.targetAmount}
                      onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))}
                      placeholder="1000000"
                      className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                    />
                    <span className="text-sm text-gray-500">円</span>
                  </div>
                </div>

                {/* 現在の残高 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">現在の残高</label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-500">¥</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={form.currentAmount}
                      onChange={e => setForm(f => ({ ...f, currentAmount: e.target.value }))}
                      className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                    />
                    <span className="text-sm text-gray-500">円</span>
                  </div>
                </div>

                {/* 目標年 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">目標達成年（任意）</label>
                  <input
                    type="number"
                    min={new Date().getFullYear()}
                    max="2100"
                    inputMode="numeric"
                    value={form.targetYear}
                    onChange={e => setForm(f => ({ ...f, targetYear: e.target.value, syncToCf: false }))}
                    placeholder={String(new Date().getFullYear() + 5)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                  />
                </div>

                {/* CF表連携 */}
                {form.targetYear && (
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.syncToCf}
                        onChange={e => setForm(f => ({ ...f, syncToCf: e.target.checked }))}
                        className="w-4 h-4 rounded accent-sage-600"
                      />
                      <span className="text-sm text-gray-700">CF表の{form.targetYear}年ライフイベントに追記する</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-0.5 ml-6">チェック時、保存と同時に1回だけ追記されます</p>
                  </div>
                )}

                {/* カラー */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">カラー</label>
                  <div className="flex gap-2 flex-wrap">
                    {GOAL_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, color: c }))}
                        className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* メモ */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">メモ（任意）</label>
                  <textarea
                    value={form.memo}
                    onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 resize-none"
                  />
                </div>

                {/* ボタン */}
                <div className="space-y-2 pb-2">
                  <button
                    onClick={handleSave}
                    disabled={!form.name.trim() || !form.targetAmount}
                    className="w-full py-3 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-xl font-medium text-sm transition-colors"
                  >
                    {editTarget ? '保存する' : '追加する'}
                  </button>
                  {editTarget && (
                    <button
                      onClick={handleDelete}
                      className="w-full py-3 bg-white hover:bg-red-50 text-red-400 hover:text-red-500 border border-red-200 rounded-xl font-medium text-sm transition-colors"
                    >
                      削除する
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 積立記録タブ */}
            {activeTab === 'contribution' && editTarget && (
              <ContributionTab
                goal={goals.find(g => g.id === editTarget.id) ?? editTarget}
                contributionInput={contributionInput}
                onInputChange={setContributionInput}
                onLog={handleLogContribution}
              />
            )}
          </div>
        </div>
      )}
      <ConfirmDialog {...dialogProps} />
    </div>
  )
}

// ─── SortableGoalCard / GoalCard ──────────────────────────────────────────────

function SortableGoalCard({ goal, onEdit }: { goal: SavingsGoal; onEdit: (g: SavingsGoal) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: goal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <GoalCard goal={goal} onEdit={onEdit} />
      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none p-1"
        tabIndex={-1}
        aria-label="並び替え"
      >
        <svg viewBox="0 0 8 14" width="10" height="14" fill="currentColor">
          <circle cx="2" cy="2"  r="1.2" /><circle cx="6" cy="2"  r="1.2" />
          <circle cx="2" cy="7"  r="1.2" /><circle cx="6" cy="7"  r="1.2" />
          <circle cx="2" cy="12" r="1.2" /><circle cx="6" cy="12" r="1.2" />
        </svg>
      </button>
    </div>
  )
}

function GoalCard({ goal, onEdit }: { goal: SavingsGoal; onEdit: (g: SavingsGoal) => void }) {
  const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0
  const needed = monthlyNeeded(goal)
  const isDone = goal.currentAmount >= goal.targetAmount
  const remaining = remainingMonths(goal.targetYear ?? 0)

  return (
    <button
      onClick={() => onEdit(goal)}
      className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:border-gray-200 transition-colors"
    >
      {/* カラーバー */}
      <div className="h-1.5 w-full" style={{ backgroundColor: goal.color }} />

      <div className="px-4 py-3">
        {/* 名前 + 達成バッジ */}
        <div className="flex items-center gap-2 mb-2">
          <span className="flex-1 text-sm font-semibold text-gray-800 truncate">{goal.name}</span>
          {isDone && (
            <span className="shrink-0 text-[10px] bg-sage-100 text-sage-600 px-1.5 py-0.5 rounded font-medium">達成</span>
          )}
        </div>

        {/* 金額 */}
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-base font-bold text-gray-800">{formatYen(goal.currentAmount)}</span>
          <span className="text-xs text-gray-500">/ {formatYen(goal.targetAmount)}</span>
        </div>

        {/* プログレスバー */}
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: goal.color }}
          />
        </div>

        {/* 下段情報 */}
        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <span className="font-medium" style={{ color: goal.color }}>{pct}%</span>
          {goal.targetYear && !isDone && (
            <span>{goal.targetYear}年 あと{remaining}ヶ月</span>
          )}
          {goal.targetYear && isDone && (
            <span>{goal.targetYear}年 目標達成</span>
          )}
        </div>

        {/* 月額積立目安 */}
        {needed !== null && needed > 0 && (
          <div className="mt-1.5 text-[11px] text-gray-500">
            月額<span className="font-semibold text-gray-700">{formatYen(needed)}</span> の積立で達成
          </div>
        )}
      </div>
    </button>
  )
}

// ─── ContributionTab ──────────────────────────────────────────────────────────

function ContributionTab({
  goal,
  contributionInput,
  onInputChange,
  onLog,
}: {
  goal: SavingsGoal
  contributionInput: string
  onInputChange: (v: string) => void
  onLog: () => void
}) {
  const ym = currentYearMonth()
  const [y, m] = ym.split('-')
  const needed = monthlyNeeded(goal)

  const sortedContribs = Object.entries(goal.contributions ?? {})
    .sort(([a], [b]) => b.localeCompare(a))

  return (
    <div className="overflow-y-auto px-5 py-4 space-y-4">
      {/* 月額必要積立額 */}
      {needed !== null && (
        <div className="bg-sage-50 rounded-xl px-4 py-3 text-sm">
          <span className="text-gray-500">現在の月額必要積立額</span>
          <span className="font-bold text-sage-700 ml-1">
            {needed === 0 ? '目標達成！' : `${formatYen(needed)}/月`}
          </span>
        </div>
      )}

      {/* 今月の積立を記録 */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {`${y}年${Number(m)}月の積立を記録`}
        </label>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-1">
            <span className="text-sm text-gray-500">¥</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={contributionInput}
              onChange={e => onInputChange(e.target.value)}
              placeholder="50000"
              autoFocus
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
            />
          </div>
          <button
            onClick={onLog}
            disabled={!contributionInput || Number(contributionInput) <= 0}
            className="px-4 py-2.5 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-xl text-sm font-medium transition-colors"
          >
            記録
          </button>
        </div>
      </div>

      {/* 積立履歴 */}
      {sortedContribs.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">積立履歴</p>
          <div className="space-y-1.5">
            {sortedContribs.map(([month, amount]) => {
              const [cy, cm] = month.split('-')
              return (
                <div key={month} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{cy}年{Number(cm)}月</span>
                  <span className="font-medium text-gray-700">{formatYen(amount)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

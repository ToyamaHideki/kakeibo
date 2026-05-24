import { useEffect, useState } from 'react'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { currentYearMonth } from '../utils/date'
import { formatYenCompact as formatYen } from '../utils/format'
import { monthlyNeeded } from '../utils/savingsGoal'
import type { SavingsGoal } from '../types'

const GOAL_COLORS = [
  '#4a7c59', '#3b82f6', '#8b5cf6', '#f97316',
  '#ec4899', '#14b8a6', '#eab308', '#ef4444',
]

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
  color: GOAL_COLORS[0]!,
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

interface Props {
  isOpen: boolean
  goal: SavingsGoal | null  // null = 追加モード
  onSave: (data: Omit<SavingsGoal, 'id' | 'order'>, syncToCf: boolean) => Promise<void>
  onDelete: () => Promise<void>
  onLogContribution: (amount: number) => Promise<void>
  onClose: () => void
}

export default function SavingsGoalModal({ isOpen, goal, onSave, onDelete, onLogContribution, onClose }: Props) {
  const [form, setForm] = useState<FormState>(defaultForm)
  const [contributionInput, setContributionInput] = useState('')
  const [activeTab, setActiveTab] = useState<'settings' | 'contribution'>('settings')

  // モーダルを開いた／編集対象が変わったときだけフォームを初期化する。
  // 積立記録で goal.currentAmount が更新されてもフォームをリセットしないよう id で判定する。
  useEffect(() => {
    if (isOpen) {
      setForm(goal ? goalToForm(goal) : defaultForm)
      setContributionInput('')
      setActiveTab('settings')
    }
  }, [isOpen, goal?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEscapeKey(onClose, isOpen)

  if (!isOpen) return null

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
      contributions: goal?.contributions ?? {},
    }
    if (targetYear) data.targetYear = targetYear
    if (form.memo.trim()) data.memo = form.memo.trim()

    await onSave(data, form.syncToCf)
    onClose()
  }

  async function handleLog() {
    const amount = Number(contributionInput)
    if (!amount || amount <= 0) return
    await onLogContribution(amount)
    setContributionInput('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" role="presentation" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90svh] flex flex-col shadow-xl" role="presentation" onClick={e => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <h3 className="text-base font-bold text-gray-800">{goal ? '目標を編集' : '目標を追加'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* タブ（編集時のみ） */}
        {goal && (
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
              <label htmlFor="savings-goal-name" className="block text-xs font-medium text-gray-600 mb-1">目標名 <span className="text-red-400">*</span></label>
              <input
                id="savings-goal-name"
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="例：マイホーム頭金"
                autoFocus={!goal}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
              />
            </div>

            {/* 目標金額 */}
            <div>
              <label htmlFor="savings-goal-target-amount" className="block text-xs font-medium text-gray-600 mb-1">目標金額 <span className="text-red-400">*</span></label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">¥</span>
                <input
                  id="savings-goal-target-amount"
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
              <label htmlFor="savings-goal-current-amount" className="block text-xs font-medium text-gray-600 mb-1">現在の残高</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">¥</span>
                <input
                  id="savings-goal-current-amount"
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
              <label htmlFor="savings-goal-target-year" className="block text-xs font-medium text-gray-600 mb-1">目標達成年（任意）</label>
              <input
                id="savings-goal-target-year"
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
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- カラーピッカーボタングループのラベルはhtmlForで関連付け不可 */}
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
              <label htmlFor="savings-goal-memo" className="block text-xs font-medium text-gray-600 mb-1">メモ（任意）</label>
              <textarea
                id="savings-goal-memo"
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
                {goal ? '保存する' : '追加する'}
              </button>
              {goal && (
                <button
                  onClick={onDelete}
                  className="w-full py-3 bg-white hover:bg-red-50 text-red-400 hover:text-red-500 border border-red-200 rounded-xl font-medium text-sm transition-colors"
                >
                  削除する
                </button>
              )}
            </div>
          </div>
        )}

        {/* 積立記録タブ */}
        {activeTab === 'contribution' && goal && (
          <ContributionTab
            goal={goal}
            contributionInput={contributionInput}
            onInputChange={setContributionInput}
            onLog={handleLog}
          />
        )}
      </div>
    </div>
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

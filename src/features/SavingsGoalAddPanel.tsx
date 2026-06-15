import { useState } from 'react'
import type { SavingsGoal } from '../types'

const GOAL_COLORS = [
  '#4a7c59', '#3b82f6', '#8b5cf6', '#f97316',
  '#ec4899', '#14b8a6', '#eab308', '#ef4444',
]

interface Props {
  onSave: (data: Omit<SavingsGoal, 'id' | 'order'>, syncToCf: boolean) => Promise<void>
}

// 貯蓄目標の新規追加フォーム（サイドパネル用）。
// 編集 / 積立記録は SavingsGoalModal のままで、本パネルは追加専用。
export default function SavingsGoalAddPanel({ onSave }: Props) {
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('0')
  const [targetYear, setTargetYear] = useState('')
  const [syncToCf, setSyncToCf] = useState(false)
  const [color, setColor] = useState<string>(GOAL_COLORS[0]!)
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)

  function reset() {
    setName('')
    setTargetAmount('')
    setCurrentAmount('0')
    setTargetYear('')
    setSyncToCf(false)
    setColor(GOAL_COLORS[0]!)
    setMemo('')
  }

  async function handleSave() {
    if (saving) return
    const trimmedName = name.trim()
    if (!trimmedName) return
    const targetNum = Number(targetAmount)
    if (!targetNum || targetNum <= 0) return
    const currentNum = Number(currentAmount) || 0
    const targetYearNum = targetYear ? Number(targetYear) : undefined

    const data: Omit<SavingsGoal, 'id' | 'order'> = {
      name: trimmedName,
      targetAmount: targetNum,
      currentAmount: currentNum,
      color,
      contributions: {},
    }
    if (targetYearNum) data.targetYear = targetYearNum
    if (memo.trim()) data.memo = memo.trim()

    setSaving(true)
    try {
      await onSave(data, syncToCf)
      reset()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="sg-add-name" className="block text-xs font-medium text-gray-600 mb-1">目標名 <span className="text-red-400">*</span></label>
        <input
          id="sg-add-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="例：マイホーム頭金"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
        />
      </div>

      <div>
        <label htmlFor="sg-add-target" className="block text-xs font-medium text-gray-600 mb-1">目標金額 <span className="text-red-400">*</span></label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-500">¥</span>
          <input
            id="sg-add-target"
            type="number"
            min="0"
            inputMode="numeric"
            value={targetAmount}
            onChange={e => setTargetAmount(e.target.value)}
            placeholder="1000000"
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
          />
          <span className="text-sm text-gray-500">円</span>
        </div>
      </div>

      <div>
        <label htmlFor="sg-add-current" className="block text-xs font-medium text-gray-600 mb-1">現在の残高</label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-500">¥</span>
          <input
            id="sg-add-current"
            type="number"
            min="0"
            inputMode="numeric"
            value={currentAmount}
            onChange={e => setCurrentAmount(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
          />
          <span className="text-sm text-gray-500">円</span>
        </div>
      </div>

      <div>
        <label htmlFor="sg-add-year" className="block text-xs font-medium text-gray-600 mb-1">目標達成年（任意）</label>
        <input
          id="sg-add-year"
          type="number"
          min={new Date().getFullYear()}
          max="2100"
          inputMode="numeric"
          value={targetYear}
          onChange={e => { setTargetYear(e.target.value); setSyncToCf(false) }}
          placeholder={String(new Date().getFullYear() + 5)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
        />
      </div>

      {targetYear && (
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={syncToCf}
              onChange={e => setSyncToCf(e.target.checked)}
              className="w-4 h-4 rounded accent-sage-600"
            />
            <span className="text-sm text-gray-700">CF表の{targetYear}年ライフイベントに追記する</span>
          </label>
          <p className="text-xs text-gray-500 mt-0.5 ml-6">チェック時、追加と同時に1回だけ追記されます</p>
        </div>
      )}

      <div>
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- カラーピッカー */}
        <label className="block text-xs font-medium text-gray-600 mb-2">カラー</label>
        <div className="flex gap-2 flex-wrap">
          {GOAL_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`色 ${c}`}
              className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="sg-add-memo" className="block text-xs font-medium text-gray-600 mb-1">メモ（任意）</label>
        <textarea
          id="sg-add-memo"
          value={memo}
          onChange={e => setMemo(e.target.value)}
          rows={2}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 resize-none"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !name.trim() || !targetAmount}
        className="w-full py-3 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-xl font-medium text-sm transition-colors"
      >
        追加する
      </button>
    </div>
  )
}

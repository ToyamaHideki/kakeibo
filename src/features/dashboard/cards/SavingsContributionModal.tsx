import { useEffect, useState } from 'react'
import { useEscapeKey } from '../../../hooks/useEscapeKey'
import { currentYearMonth } from '../../../utils/date'
import { formatYenCompact } from '../../../utils/format'
import { monthlyNeeded } from '../../../utils/savingsGoal'
import type { SavingsGoal } from '../../../types'

interface Props {
  isOpen: boolean
  goal: SavingsGoal | null
  onLogContribution: (amount: number) => Promise<void>
  onClose: () => void
}

export default function SavingsContributionModal({ isOpen, goal, onLogContribution, onClose }: Props) {
  const [input, setInput] = useState('')

  useEffect(() => {
    if (isOpen) setInput('')
  }, [isOpen, goal?.id])

  useEscapeKey(onClose, isOpen)

  if (!isOpen || !goal) return null

  const ym = currentYearMonth()
  const [y, m] = ym.split('-')
  const needed = monthlyNeeded(goal)

  const sortedContribs = Object.entries(goal.contributions ?? {})
    .sort(([a], [b]) => b.localeCompare(a))

  async function handleLog() {
    const amount = Number(input)
    if (!amount || amount <= 0) return
    await onLogContribution(amount)
    setInput('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" role="presentation" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90svh] flex flex-col shadow-xl" role="presentation" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-800 truncate">{goal.name}</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">積立を記録</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600 shrink-0 ml-2">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {needed !== null && (
            <div className="bg-sage-50 rounded-xl px-4 py-3 text-sm">
              <span className="text-gray-500">現在の月額必要積立額</span>
              <span className="font-bold text-sage-700 ml-1">
                {needed === 0 ? '目標達成！' : `${formatYenCompact(needed)}/月`}
              </span>
            </div>
          )}

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
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="50000"
                  autoFocus
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                />
              </div>
              <button
                onClick={handleLog}
                disabled={!input || Number(input) <= 0}
                className="px-4 py-2.5 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-xl text-sm font-medium transition-colors"
              >
                記録
              </button>
            </div>
          </div>

          {sortedContribs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">積立履歴</p>
              <div className="space-y-1.5">
                {sortedContribs.map(([month, amount]) => {
                  const [cy, cm] = month.split('-')
                  return (
                    <div key={month} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{cy}年{Number(cm)}月</span>
                      <span className="font-medium text-gray-700">{formatYenCompact(amount)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

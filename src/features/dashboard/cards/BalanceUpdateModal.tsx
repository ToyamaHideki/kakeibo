import { useEffect, useState } from 'react'
import { useEscapeKey } from '../../../hooks/useEscapeKey'
import { currentYearMonth } from '../../../utils/date'
import { formatYenCompact } from '../../../utils/format'
import type { SavingsAccount, SecuritiesAccount } from '../../../types'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

type SavingsTarget = {
  type: 'savings'
  account: SavingsAccount
  onSave: (currentAmount: number, lastUpdated: string) => Promise<void>
}

type SecuritiesTarget = {
  type: 'securities'
  account: SecuritiesAccount
  onSave: (yearMonth: string, value: number) => Promise<void>
}

export type BalanceUpdateTarget = SavingsTarget | SecuritiesTarget

interface Props {
  target: BalanceUpdateTarget | null
  onClose: () => void
}

export default function BalanceUpdateModal({ target, onClose }: Props) {
  const [input, setInput] = useState('')
  const [dateInput, setDateInput] = useState(todayStr())

  useEffect(() => {
    if (!target) return
    if (target.type === 'savings') {
      setInput(String(target.account.currentAmount))
      setDateInput(target.account.lastUpdated || todayStr())
    } else {
      const ym = currentYearMonth()
      setInput(String(target.account.monthlyValues[ym] ?? target.account.currentValue))
      setDateInput(ym)
    }
  }, [target])

  useEscapeKey(onClose, target !== null)

  if (!target) return null

  async function handleSave() {
    if (!target) return
    const value = Number(input)
    if (Number.isNaN(value) || value < 0) return
    if (target.type === 'savings') {
      await target.onSave(value, dateInput)
    } else {
      await target.onSave(dateInput, value)
    }
    onClose()
  }

  const account = target.account
  const title = account.name
  const subtitle = target.type === 'savings' ? '残高を更新' : '月次評価額を記録'
  const currentLabel = target.type === 'savings' ? '現在の残高' : '当月の評価額'
  const dateLabel = target.type === 'savings' ? '残高確認日' : '記録月'
  const currentValue = target.type === 'savings' ? target.account.currentAmount : target.account.currentValue

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" role="presentation" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90svh] flex flex-col shadow-xl" role="presentation" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <div className="min-w-0 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: account.color }} />
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-800 truncate">{title}</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600 shrink-0 ml-2">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
            <span className="text-gray-500">直近の登録額</span>
            <span className="font-bold text-gray-700 tabular-nums">{formatYenCompact(currentValue)}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{currentLabel}</label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">¥</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={input}
                onChange={e => setInput(e.target.value)}
                autoFocus
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
              />
              <span className="text-sm text-gray-500">円</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{dateLabel}</label>
            <input
              type={target.type === 'savings' ? 'date' : 'month'}
              value={dateInput}
              onChange={e => setDateInput(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={input === '' || Number(input) < 0}
            className="w-full py-3 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-xl font-medium text-sm transition-colors"
          >
            更新する
          </button>
        </div>
      </div>
    </div>
  )
}

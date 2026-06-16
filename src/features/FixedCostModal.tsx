import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEscapeKey } from '../hooks/useEscapeKey'
import type { FixedCost, FixedCostFrequency } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  cost: FixedCost | null
  onSave: (data: Omit<FixedCost, 'id' | 'order'>) => Promise<void>
}

const FREQ_OPTIONS: { value: FixedCostFrequency; label: string }[] = [
  { value: 'monthly', label: '毎月' },
  { value: 'yearly', label: '毎年' },
  { value: 'every2years', label: '隔年' },
  { value: 'every3years', label: '3年毎' },
]

// 指定月の日数。うるう年でも 28 として扱う（毎年発生する固定費の安全側に倒す）。
function daysInMonth(m: number): number {
  if (m === 2) return 28
  if (m === 4 || m === 6 || m === 9 || m === 11) return 30
  return 31
}

export default function FixedCostModal({ isOpen, onClose, cost, onSave }: Props) {
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState<FixedCostFrequency>('monthly')
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [baseYear, setBaseYear] = useState(() => new Date().getFullYear())
  const [amount, setAmount] = useState(0)
  const [isVariable, setIsVariable] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const today = new Date()
      if (cost) {
        setName(cost.name)
        setFrequency(cost.frequency ?? 'monthly')
        setDayOfMonth(cost.dayOfMonth)
        setMonth(cost.month ?? today.getMonth() + 1)
        setBaseYear(cost.baseYear ?? today.getFullYear())
        setAmount(cost.amount)
        setIsVariable(cost.isVariable ?? false)
        setPaymentMethod(cost.paymentMethod)
        setMemo(cost.memo ?? '')
      } else {
        setName('')
        setFrequency('monthly')
        setDayOfMonth(1)
        setMonth(today.getMonth() + 1)
        setBaseYear(today.getFullYear())
        setAmount(0)
        setIsVariable(false)
        setPaymentMethod('')
        setMemo('')
      }
    }
  }, [isOpen, cost])

  useEscapeKey(onClose, isOpen)

  // 月／頻度の変更で日の上限を超えるなら自動で末日に丸める（毎月は 31 まで許容）
  useEffect(() => {
    const max = frequency === 'monthly' ? 31 : daysInMonth(month)
    if (dayOfMonth > max) setDayOfMonth(max)
  }, [month, frequency, dayOfMonth])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const data: Parameters<typeof onSave>[0] = {
        name: name.trim(),
        frequency,
        dayOfMonth,
        amount: isVariable ? 0 : amount,
        paymentMethod: paymentMethod.trim(),
      }
      if (frequency !== 'monthly') {
        data.month = month
      }
      if (frequency === 'every2years' || frequency === 'every3years') {
        data.baseYear = baseYear
      }
      if (isVariable) data.isVariable = true
      if (memo.trim()) data.memo = memo.trim()
      await onSave(data)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="bg-white w-full md:max-w-md md:rounded-xl rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col"
        role="presentation"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">
            {cost ? '固定費を編集' : '固定費を追加'}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* 費目吁E*/}
          <div>
            <label htmlFor="fixed-cost-name" className="block text-xs font-medium text-gray-500 mb-1.5">費目名</label>
            <input
              id="fixed-cost-name"
              type="text"
              placeholder="例：自動車税、車検、家賃"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
            />
          </div>

          {/* 頻度 */}
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- ボタングループのラベルはhtmlForで関連付け不可 */}
            <label className="block text-xs font-medium text-gray-500 mb-1.5">頻度</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {FREQ_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFrequency(opt.value)}
                  className={`flex-1 py-2 transition-colors text-center ${
                    frequency === opt.value
                      ? 'bg-sage-600 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 発生日 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              {frequency === 'monthly' ? '引き落とし日' : '発生日'}
            </label>
            <div className="flex items-center gap-2">
              {frequency !== 'monthly' && (
                <div className="flex items-center gap-1">
                  <select
                    value={month}
                    onChange={e => setMonth(Number(e.target.value))}
                    aria-label="発生月"
                    className="px-2 py-2.5 border border-gray-200 rounded-lg text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-500 shrink-0">月</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <select
                  value={dayOfMonth}
                  onChange={e => setDayOfMonth(Number(e.target.value))}
                  aria-label={frequency === 'monthly' ? '引き落とし日' : '発生日'}
                  className="px-2 py-2.5 border border-gray-200 rounded-lg text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                >
                  {Array.from(
                    { length: frequency === 'monthly' ? 31 : daysInMonth(month) },
                    (_, i) => i + 1,
                  ).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-500 shrink-0">日</span>
              </div>
            </div>
          </div>

          {/* 基準年�E�隔年・3年毎�Eみ�E�E*/}
          {(frequency === 'every2years' || frequency === 'every3years') && (
            <div>
              <label htmlFor="fixed-cost-base-year" className="block text-xs font-medium text-gray-500 mb-1.5">基準年</label>
              <div className="flex items-center gap-2">
                <input
                  id="fixed-cost-base-year"
                  type="number"
                  min={2000}
                  max={2100}
                  value={baseYear}
                  onChange={e => setBaseYear(Number(e.target.value))}
                  className="w-24 px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                />
                <span className="text-sm text-gray-500 shrink-0">年</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ※ 発生する年の1つを入力（例：車検なら直近の実施年）
              </p>
            </div>
          )}

          {/* 金顁E*/}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- 固定/変動ボタンと入力フィールドの複合コントロールのラベル */}
              <label className="text-xs font-medium text-gray-500">金額（円）</label>
              <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setIsVariable(false)}
                  className={`px-2.5 py-1 transition-colors ${
                    !isVariable
                      ? 'bg-sage-600 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  固定
                </button>
                <button
                  type="button"
                  onClick={() => setIsVariable(true)}
                  className={`px-2.5 py-1 transition-colors ${
                    isVariable
                      ? 'bg-amber-500 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  変動
                </button>
              </div>
            </div>
            {isVariable ? (
              <div className="w-full px-3 py-2.5 border border-amber-200 rounded-lg bg-amber-50 text-amber-600 text-sm font-medium">
                変動（毎回変わる）
              </div>
            ) : (
              <input
                type="number"
                min={0}
                value={amount}
                onChange={e => setAmount(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
              />
            )}
          </div>

          {/* 支払い方況E*/}
          <div>
            <label htmlFor="fixed-cost-payment-method" className="block text-xs font-medium text-gray-500 mb-1.5">支払い方法／口座</label>
            <input
              id="fixed-cost-payment-method"
              type="text"
              placeholder="例：○○銀行、△△カード"
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
            />
          </div>

          {/* メモ */}
          <div>
            <label htmlFor="fixed-cost-memo" className="block text-xs font-medium text-gray-500 mb-1.5">メモ</label>
            <input
              id="fixed-cost-memo"
              type="text"
              placeholder="備考など"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full py-2.5 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

import { useState } from 'react'
import type { SecuritiesAccount, SecuritiesAccountType, SecuritiesVisibility } from '../types'
import { currentYearMonth } from '../utils/date'
import { ACCOUNT_COLORS, ACCOUNT_TYPE_OPTIONS } from './securitiesUtils'

interface Props {
  onAdd: (data: Omit<SecuritiesAccount, 'id' | 'order'>) => Promise<void>
}

// 証券口座追加用サイドパネル（編集 / 保有商品 / 記録は既存モーダルが担当）。
export default function SecuritiesAccountAddPanel({ onAdd }: Props) {
  const [name, setName] = useState('')
  const [owner, setOwner] = useState('')
  const [broker, setBroker] = useState('')
  const [accountType, setAccountType] = useState<SecuritiesAccountType | ''>('')
  const [color, setColor] = useState<string>(ACCOUNT_COLORS[0]!)
  const [memo, setMemo] = useState('')
  const [initialValue, setInitialValue] = useState('')
  const [unrealizedPnL, setUnrealizedPnL] = useState('')
  const [visibility, setVisibility] = useState<SecuritiesVisibility>('shared')
  const [saving, setSaving] = useState(false)

  function reset() {
    setName('')
    setOwner('')
    setBroker('')
    setAccountType('')
    setColor(ACCOUNT_COLORS[0]!)
    setMemo('')
    setInitialValue('')
    setUnrealizedPnL('')
    setVisibility('shared')
  }

  async function handleSubmit() {
    if (saving) return
    const trimmed = name.trim()
    if (!trimmed) return
    const initial = Number(initialValue) || 0
    if (initial < 0) return
    const pnlStr = unrealizedPnL.trim()
    const pnl = pnlStr === '' ? undefined : Number(pnlStr)
    if (pnl !== undefined && Number.isNaN(pnl)) return

    const ym = currentYearMonth()
    const data: Omit<SecuritiesAccount, 'id' | 'order'> = {
      name: trimmed,
      color,
      currentValue: initial,
      monthlyValues: initial > 0 ? { [ym]: initial } : {},
      visibility,
    }
    if (owner.trim()) data.owner = owner.trim()
    if (broker.trim()) data.broker = broker.trim()
    if (accountType) data.accountType = accountType
    if (memo.trim()) data.memo = memo.trim()
    if (pnl !== undefined) data.unrealizedPnL = pnl

    setSaving(true)
    try {
      await onAdd(data)
      reset()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="sec-add-name" className="block text-xs font-medium text-gray-600 mb-1">口座名 <span className="text-red-400">*</span></label>
        <input
          id="sec-add-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="例：SBI証券 NISA"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="sec-add-owner" className="block text-xs font-medium text-gray-600 mb-1">名義人</label>
          <input
            id="sec-add-owner"
            type="text"
            value={owner}
            onChange={e => setOwner(e.target.value)}
            placeholder="本人"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
          />
        </div>
        <div>
          <label htmlFor="sec-add-broker" className="block text-xs font-medium text-gray-600 mb-1">証券会社</label>
          <input
            id="sec-add-broker"
            type="text"
            value={broker}
            onChange={e => setBroker(e.target.value)}
            placeholder="例：SBI証券"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
          />
        </div>
      </div>

      <div>
        <label htmlFor="sec-add-type" className="block text-xs font-medium text-gray-600 mb-1">口座種別</label>
        <select
          id="sec-add-type"
          value={accountType}
          onChange={e => setAccountType(e.target.value as SecuritiesAccountType | '')}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
        >
          <option value="">未設定</option>
          {ACCOUNT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="sec-add-value" className="block text-xs font-medium text-gray-600 mb-1">現在の評価額</label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-500">¥</span>
          <input
            id="sec-add-value"
            type="number"
            min="0"
            inputMode="numeric"
            value={initialValue}
            onChange={e => setInitialValue(e.target.value)}
            placeholder="1000000"
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
          />
        </div>
      </div>

      <div>
        <label htmlFor="sec-add-pnl" className="block text-xs font-medium text-gray-600 mb-1">評価損益（任意）</label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-500">¥</span>
          <input
            id="sec-add-pnl"
            type="number"
            inputMode="decimal"
            value={unrealizedPnL}
            onChange={e => setUnrealizedPnL(e.target.value)}
            placeholder="50000"
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
          />
        </div>
      </div>

      <div>
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label className="block text-xs font-medium text-gray-600 mb-1">公開範囲</label>
        <div className="grid grid-cols-2 gap-2">
          {(['shared', 'private'] as const).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setVisibility(v)}
              className={`py-2 px-3 rounded-xl text-xs font-medium transition-colors border ${
                visibility === v
                  ? 'bg-sage-600 border-sage-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {v === 'shared' ? '世帯共有' : '本人のみ'}
            </button>
          ))}
        </div>
      </div>

      <div>
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label className="block text-xs font-medium text-gray-600 mb-2">カラー</label>
        <div className="flex gap-2 flex-wrap">
          {ACCOUNT_COLORS.map(c => (
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
        <label htmlFor="sec-add-memo" className="block text-xs font-medium text-gray-600 mb-1">メモ（任意）</label>
        <textarea
          id="sec-add-memo"
          value={memo}
          onChange={e => setMemo(e.target.value)}
          rows={2}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 resize-none"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving || !name.trim()}
        className="w-full py-3 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-xl font-medium text-sm transition-colors"
      >
        追加する
      </button>
    </div>
  )
}

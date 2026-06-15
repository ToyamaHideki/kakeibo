import { useState } from 'react'
import type { Contract, ContractScope, ContractType, PaymentFrequency } from '../types'

const CONTRACT_TYPE_OPTIONS: { value: ContractType; label: string }[] = [
  { value: 'insurance', label: '保険' },
  { value: 'loan',      label: 'ローン' },
  { value: 'other',     label: 'その他' },
]

const FREQUENCY_LABEL: Record<PaymentFrequency, string> = {
  monthly: '月',
  yearly: '年',
}

interface Props {
  onAdd: (data: Omit<Contract, 'id' | 'order'>) => Promise<void>
  defaultOwner?: string | undefined
}

// 保険・ローン等の契約を追加するサイドパネル（編集は既存モーダル）。
// サブスクはこのパネル経由では追加しない（SubscriptionsPage で別管理）。
export default function ContractAddPanel({ onAdd, defaultOwner }: Props) {
  const [name, setName] = useState('')
  const [contractType, setContractType] = useState<ContractType>('insurance')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<PaymentFrequency>('monthly')
  const [renewalDate, setRenewalDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [startDate, setStartDate] = useState('')
  const [isAutoRenew, setIsAutoRenew] = useState(true)
  const [memo, setMemo] = useState('')
  const [scope, setScope] = useState<ContractScope>('shared')
  const [saving, setSaving] = useState(false)

  function reset() {
    setName('')
    setContractType('insurance')
    setAmount('')
    setFrequency('monthly')
    setRenewalDate('')
    setPaymentMethod('')
    setStartDate('')
    setIsAutoRenew(true)
    setMemo('')
    setScope('shared')
  }

  async function handleSubmit() {
    if (saving) return
    const trimmed = name.trim()
    if (!trimmed) return
    const amountNum = Number(amount)
    if (isNaN(amountNum) || amountNum < 0) return

    const data: Omit<Contract, 'id' | 'order'> = {
      name: trimmed,
      contractType,
      amount: amountNum,
      frequency,
      isAutoRenew,
      scope,
    }
    if (scope === 'personal' && defaultOwner) data.owner = defaultOwner
    if (renewalDate) data.renewalDate = renewalDate
    if (paymentMethod.trim()) data.paymentMethod = paymentMethod.trim()
    if (startDate) data.startDate = startDate
    if (memo.trim()) data.memo = memo.trim()

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
        <label htmlFor="ct-add-name" className="block text-xs font-medium text-gray-600 mb-1">名前 <span className="text-red-400">*</span></label>
        <input
          id="ct-add-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="例：自動車保険"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
        />
      </div>

      <div>
        <label htmlFor="ct-add-type" className="block text-xs font-medium text-gray-600 mb-1">種別</label>
        <select
          id="ct-add-type"
          value={contractType}
          onChange={e => setContractType(e.target.value as ContractType)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
        >
          {CONTRACT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label className="block text-xs font-medium text-gray-600 mb-1">料金</label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">¥</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
            />
          </div>
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            {(['monthly', 'yearly'] as PaymentFrequency[]).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFrequency(f)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  frequency === f ? 'bg-sage-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {FREQUENCY_LABEL[f]}払い
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="ct-add-renewal" className="block text-xs font-medium text-gray-600 mb-1">次回更新日（任意）</label>
        <input
          id="ct-add-renewal"
          type="date"
          value={renewalDate}
          onChange={e => setRenewalDate(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
        />
      </div>

      <div>
        <label htmlFor="ct-add-payment" className="block text-xs font-medium text-gray-600 mb-1">支払い方法（任意）</label>
        <input
          id="ct-add-payment"
          type="text"
          value={paymentMethod}
          onChange={e => setPaymentMethod(e.target.value)}
          placeholder="例：口座振替"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
        />
      </div>

      <div>
        <label htmlFor="ct-add-start" className="block text-xs font-medium text-gray-600 mb-1">契約開始日（任意）</label>
        <input
          id="ct-add-start"
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
        />
      </div>

      <div>
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label className="block text-xs font-medium text-gray-600 mb-1">区分</label>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden">
          {(['shared', 'personal'] as ContractScope[]).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                scope === s ? 'bg-sage-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'shared' ? '共有' : '個人'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isAutoRenew}
            onChange={e => setIsAutoRenew(e.target.checked)}
            className="w-4 h-4 rounded accent-sage-600"
          />
          <span className="text-sm text-gray-700">自動更新あり</span>
        </label>
      </div>

      <div>
        <label htmlFor="ct-add-memo" className="block text-xs font-medium text-gray-600 mb-1">メモ（任意）</label>
        <textarea
          id="ct-add-memo"
          value={memo}
          onChange={e => setMemo(e.target.value)}
          rows={2}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 resize-none"
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

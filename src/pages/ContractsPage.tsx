import { useCallback, useState } from 'react'
import { useContracts } from '../hooks/useContracts'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useConfirm } from '../hooks/useConfirm'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatYen } from '../utils/format'
import type { Contract, ContractType, PaymentFrequency } from '../types'

// ─── 定数・ユーティリティ ──────────────────────────────────────────────────────

const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  subscription: 'サブスク',
  insurance: '保険',
  loan: 'ローン',
  other: 'その他',
}

const CONTRACT_TYPE_COLOR: Record<ContractType, string> = {
  subscription: 'bg-blue-100 text-blue-600',
  insurance: 'bg-green-100 text-green-600',
  loan: 'bg-purple-100 text-purple-600',
  other: 'bg-gray-100 text-gray-600',
}

const FREQUENCY_LABEL: Record<PaymentFrequency, string> = {
  monthly: '月',
  yearly: '年',
}

const today = new Date().toISOString().split('T')[0]

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - new Date(today).getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function renewalBadge(renewalDate: string) {
  const days = daysUntil(renewalDate)
  if (days < 0) {
    return { label: '期限切れ', cls: 'bg-red-100 text-red-600 border-red-200' }
  }
  if (days === 0) {
    return { label: '今日', cls: 'bg-red-100 text-red-600 border-red-200' }
  }
  if (days <= 7) {
    return { label: `${days}日後`, cls: 'bg-red-100 text-red-600 border-red-200' }
  }
  if (days <= 30) {
    return { label: `${days}日後`, cls: 'bg-orange-100 text-orange-600 border-orange-200' }
  }
  return null
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${y}/${Number(m)}/${Number(d)}`
}

// ─── 入力フォームの型 ──────────────────────────────────────────────────────────

type FormState = {
  name: string
  contractType: ContractType
  amount: string
  frequency: PaymentFrequency
  renewalDate: string
  paymentMethod: string
  startDate: string
  isAutoRenew: boolean
  memo: string
}

const defaultForm: FormState = {
  name: '',
  contractType: 'insurance',
  amount: '',
  frequency: 'monthly',
  renewalDate: '',
  paymentMethod: '',
  startDate: '',
  isAutoRenew: true,
  memo: '',
}

function contractToForm(c: Contract): FormState {
  return {
    name: c.name,
    contractType: c.contractType,
    amount: String(c.amount),
    frequency: c.frequency,
    renewalDate: c.renewalDate ?? '',
    paymentMethod: c.paymentMethod ?? '',
    startDate: c.startDate ?? '',
    isAutoRenew: c.isAutoRenew,
    memo: c.memo ?? '',
  }
}

// ─── コンポーネント ────────────────────────────────────────────────────────────

export default function ContractsPage() {
  const { contracts: allContracts, loading, addContract, updateContract, deleteContract } = useContracts()
  const contracts = allContracts.filter(c => c.contractType !== 'subscription')
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

    // Firestoreはundefinedを受け付けないため、値がある場合のみフィールドを追加する
    const data: Omit<Contract, 'id' | 'order'> = {
      name: trimmed,
      contractType: form.contractType,
      amount,
      frequency: form.frequency,
      isAutoRenew: form.isAutoRenew,
    }
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

  // 更新が近い契約（30日以内）
  const upcoming = contracts
    .filter(c => c.renewalDate && daysUntil(c.renewalDate) <= 30)
    .sort((a, b) => (a.renewalDate ?? '').localeCompare(b.renewalDate ?? ''))

  // 通常の一覧（種別でグループ化して表示）
  const rest = contracts.filter(c => !c.renewalDate || daysUntil(c.renewalDate) > 30)

  // 月額換算合計
  const monthlyTotal = contracts.reduce((sum, c) => {
    const m = c.frequency === 'monthly' ? c.amount : Math.round(c.amount / 12)
    return sum + m
  }, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">読み込み中...</div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto h-full flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-xl font-bold text-gray-800">保険・ローン管理</h2>
        {contracts.length > 0 && (
          <span className="text-xs text-gray-500">月額換算：<span className="font-semibold text-gray-700">{formatYen(monthlyTotal)}</span></span>
        )}
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {contracts.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">契約がありません</p>
            <p className="text-xs mt-1">右下のボタンから保険・ローンを追加してください</p>
          </div>
        )}

        {/* まもなく更新セクション */}
        {upcoming.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-500 mb-2 flex items-center gap-1">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm.93-9.412l-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 110-2 1 1 0 010 2z"/>
              </svg>
              まもなく更新
            </p>
            <div className="space-y-2">
              {upcoming.map(c => <ContractCard key={c.id} contract={c} onEdit={openEdit} />)}
            </div>
          </div>
        )}

        {/* 通常の契約一覧 */}
        {rest.length > 0 && (
          <div>
            {upcoming.length > 0 && (
              <p className="text-xs font-semibold text-gray-500 mb-2">すべての契約</p>
            )}
            <div className="space-y-2">
              {rest
                .sort((a, b) => (a.renewalDate ?? '9999').localeCompare(b.renewalDate ?? '9999'))
                .map(c => <ContractCard key={c.id} contract={c} onEdit={openEdit} />)}
            </div>
          </div>
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

      {/* 追加・編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90svh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
              <h3 className="text-base font-bold text-gray-800">
                {editTarget ? '契約を編集' : '契約を追加'}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-600">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* フォーム */}
            <div className="overflow-y-auto px-5 py-4 space-y-4">
              {/* 名前 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">名前 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="例：Netflix"
                  autoFocus
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                />
              </div>

              {/* 種別 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">種別</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['insurance', 'loan', 'other'] as ContractType[]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, contractType: type }))}
                      className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        form.contractType === type
                          ? 'bg-sage-600 text-white border-sage-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-sage-300'
                      }`}
                    >
                      {CONTRACT_TYPE_LABEL[type]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 金額・周期 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">金額</label>
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
                      className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
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
                            ? 'bg-sage-600 text-white'
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
                <label className="block text-xs font-medium text-gray-600 mb-1">次回更新日（任意）</label>
                <input
                  type="date"
                  value={form.renewalDate}
                  onChange={e => setForm(f => ({ ...f, renewalDate: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                />
              </div>

              {/* 支払い方法 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">支払い方法（任意）</label>
                <input
                  type="text"
                  value={form.paymentMethod}
                  onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                  placeholder="例：クレカ / 口座振替"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                />
              </div>

              {/* 契約開始日 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">契約開始日（任意）</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                />
              </div>

              {/* 自動更新 */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isAutoRenew}
                    onChange={e => setForm(f => ({ ...f, isAutoRenew: e.target.checked }))}
                    className="w-4 h-4 rounded accent-sage-600"
                  />
                  <span className="text-sm text-gray-700">自動更新あり</span>
                </label>
              </div>

              {/* メモ */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">メモ（任意）</label>
                <textarea
                  value={form.memo}
                  onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
                  placeholder="例：スタンダードプラン"
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 resize-none"
                />
              </div>

              {/* ボタン */}
              <div className="space-y-2 pb-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!form.name.trim()}
                  className="w-full py-3 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-xl font-medium text-sm transition-colors"
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

// ─── ContractCard ─────────────────────────────────────────────────────────────

function ContractCard({ contract: c, onEdit }: { contract: Contract; onEdit: (c: Contract) => void }) {
  const badge = c.renewalDate ? renewalBadge(c.renewalDate) : null

  return (
    <button
      onClick={() => onEdit(c)}
      className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 hover:border-sage-200 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${CONTRACT_TYPE_COLOR[c.contractType]}`}>
              {CONTRACT_TYPE_LABEL[c.contractType]}
            </span>
            <span className="text-sm font-medium text-gray-800 truncate">{c.name}</span>
            {c.isAutoRenew && (
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" className="text-sage-400 shrink-0">
                <path fillRule="evenodd" d="M8 3a5 5 0 104.546 2.914.5.5 0 000-.986A4 4 0 118 4.25v-.75a.5.5 0 00-.854-.354L5.646 4.646a.5.5 0 000 .708l1.5 1.5a.5.5 0 10.708-.708L7.207 5.5H8V3z"/>
              </svg>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
            <span className="font-medium text-gray-700">
              {formatYen(c.amount)}<span className="text-gray-500 font-normal">/{FREQUENCY_LABEL[c.frequency]}</span>
            </span>
            {c.paymentMethod && <span className="text-gray-500">{c.paymentMethod}</span>}
          </div>
          {c.renewalDate && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[10px] text-gray-500">更新日 {formatDate(c.renewalDate)}</span>
              {badge && (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border font-medium ${badge.cls}`}>
                  {badge.label}
                </span>
              )}
            </div>
          )}
          {c.memo && <p className="text-[10px] text-gray-500 mt-0.5 truncate">{c.memo}</p>}
        </div>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 shrink-0 mt-0.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </button>
  )
}

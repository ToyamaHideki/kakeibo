import type { Dispatch, SetStateAction } from 'react'
import type { SecuritiesAccount, SecuritiesAccountType, SecuritiesHolding, SecuritiesVisibility } from '../types'
import { ACCOUNT_COLORS, ACCOUNT_TYPE_OPTIONS, computePrincipal, formatYen, type FormState } from './securitiesUtils'
import { SecuritiesRecordTab } from './SecuritiesRecordTab'
import { SecuritiesHoldingsTab } from './SecuritiesHoldingsTab'

type Tab = 'settings' | 'holdings' | 'record'

interface Props {
  showModal: boolean
  editTarget: SecuritiesAccount | null
  accounts: SecuritiesAccount[]
  form: FormState
  setForm: Dispatch<SetStateAction<FormState>>
  activeTab: Tab
  setActiveTab: Dispatch<SetStateAction<Tab>>
  holdings: SecuritiesHolding[]
  onHoldingsChange: (holdings: SecuritiesHolding[]) => void
  onClose: () => void
  onSave: () => Promise<void>
  onDelete: () => Promise<void>
  onRecordAccount: (yearMonth: string, value: number) => Promise<void>
  onRecordHoldings: (yearMonth: string, valuesById: Record<string, number>) => Promise<void>
  onDeleteRecord: (ym: string) => Promise<void>
}

const TAB_LABELS: Record<Tab, string> = {
  settings: '基本設定',
  holdings: '保有商品',
  record: '評価額を記録',
}

export function SecuritiesAccountModal({
  showModal,
  editTarget,
  accounts,
  form,
  setForm,
  activeTab,
  setActiveTab,
  holdings,
  onHoldingsChange,
  onClose,
  onSave,
  onDelete,
  onRecordAccount,
  onRecordHoldings,
  onDeleteRecord,
}: Props) {
  if (!showModal) return null

  // 基本設定の評価額・評価損益は常に手入力（保有商品との auto-calc は廃止）
  const currentValue = Number(form.initialValue) || 0
  const pnlStr = form.unrealizedPnL.trim()
  const pnl = pnlStr === '' ? undefined : Number(pnlStr)
  const principal = computePrincipal(currentValue, pnl)
  const pnlRate = principal && principal > 0 && pnl !== undefined ? (pnl / principal) * 100 : null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" role="presentation" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90svh] flex flex-col shadow-xl" role="presentation" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <h3 className="text-base font-bold text-gray-800">{editTarget ? '口座を編集' : '口座を追加'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {editTarget && (
          <div className="flex gap-1 px-4 pt-3 shrink-0">
            {(['settings', 'holdings', 'record'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === tab ? 'bg-sage-600 text-white' : 'bg-gray-100 text-gray-500'}`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="overflow-y-auto px-5 py-4 space-y-4">
            <div>
              <label htmlFor="securities-account-name" className="block text-xs font-medium text-gray-600 mb-1">口座名 <span className="text-red-400">*</span></label>
              <input
                id="securities-account-name"
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="例：楽天証券 NISA"
                autoFocus={!editTarget}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
              />
            </div>

            <div>
              <label htmlFor="securities-account-owner" className="block text-xs font-medium text-gray-600 mb-1">名義人（任意）</label>
              <input
                id="securities-account-owner"
                type="text"
                value={form.owner}
                onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                placeholder="例：夫、妻"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
              />
            </div>

            <div>
              <label htmlFor="securities-account-broker" className="block text-xs font-medium text-gray-600 mb-1">証券会社（任意）</label>
              <input
                id="securities-account-broker"
                type="text"
                value={form.broker}
                onChange={e => setForm(f => ({ ...f, broker: e.target.value }))}
                placeholder="例：楽天証券"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
              />
            </div>

            <div>
              <label htmlFor="securities-account-type" className="block text-xs font-medium text-gray-600 mb-1">口座種別（任意）</label>
              <select
                id="securities-account-type"
                value={form.accountType}
                onChange={e => setForm(f => ({ ...f, accountType: e.target.value as SecuritiesAccountType | '' }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
              >
                <option value="">未設定</option>
                {ACCOUNT_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* 公開範囲 */}
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- ラジオグループのラベル */}
              <label className="block text-xs font-medium text-gray-600 mb-1.5">公開範囲</label>
              <div className="grid grid-cols-2 gap-2">
                {(['shared', 'private'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, visibility: v as SecuritiesVisibility }))}
                    className={`py-2 px-3 rounded-xl text-xs font-medium transition-colors border ${
                      form.visibility === v
                        ? 'bg-sage-600 border-sage-600 text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {v === 'shared' ? '世帯で共有' : '本人のみ表示'}
                  </button>
                ))}
              </div>
              {form.visibility === 'private' && (
                <p className="text-[11px] text-gray-500 mt-1.5">この口座と保有商品は作成者本人にのみ表示されます</p>
              )}
            </div>

            {/* 現在の評価額（手入力） */}
            <div>
              <label htmlFor="securities-account-initial-value" className="block text-xs font-medium text-gray-600 mb-1">
                現在の評価額
              </label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">¥</span>
                <input
                  id="securities-account-initial-value"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.initialValue}
                  onChange={e => setForm(f => ({ ...f, initialValue: e.target.value }))}
                  placeholder="1000000"
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                />
                <span className="text-sm text-gray-500">円</span>
              </div>
              {!editTarget && (
                <p className="text-[11px] text-gray-500 mt-1">0より大きい値を入力すると今月の記録として保存されます</p>
              )}
            </div>

            {/* 評価損益と元本（手入力） */}
            <div>
              <label htmlFor="securities-account-pnl" className="block text-xs font-medium text-gray-600 mb-1">
                評価損益（任意）
              </label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">¥</span>
                <input
                  id="securities-account-pnl"
                  type="number"
                  inputMode="numeric"
                  value={form.unrealizedPnL}
                  onChange={e => setForm(f => ({ ...f, unrealizedPnL: e.target.value }))}
                  placeholder="符号付き（例: 50000 / -20000）"
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                />
                <span className="text-sm text-gray-500">円</span>
              </div>
              {principal !== null && (
                <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                  <span className="text-gray-500">元本（自動計算）</span>
                  <span className="font-bold text-gray-700 tabular-nums">
                    {formatYen(principal)}
                    {pnlRate !== null && (
                      <span className={`ml-2 text-[11px] font-medium ${pnl! >= 0 ? 'text-sage-600' : 'text-red-500'}`}>
                        ({pnl! >= 0 ? '+' : ''}{pnlRate.toFixed(2)}%)
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- カラーピッカーボタングループのラベルはhtmlForで関連付け不可 */}
              <label className="block text-xs font-medium text-gray-600 mb-2">カラー</label>
              <div className="flex gap-2 flex-wrap">
                {ACCOUNT_COLORS.map(c => (
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

            <div>
              <label htmlFor="securities-account-memo" className="block text-xs font-medium text-gray-600 mb-1">メモ（任意）</label>
              <textarea
                id="securities-account-memo"
                value={form.memo}
                onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 resize-none"
              />
            </div>

            <div className="space-y-2 pb-2">
              <button
                onClick={onSave}
                disabled={!form.name.trim()}
                className="w-full py-3 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-xl font-medium text-sm transition-colors"
              >
                {editTarget ? '保存する' : '追加する'}
              </button>
              {editTarget && (
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

        {activeTab === 'holdings' && editTarget && (
          <SecuritiesHoldingsTab
            holdings={holdings}
            onChange={onHoldingsChange}
          />
        )}

        {activeTab === 'record' && editTarget && (
          <SecuritiesRecordTab
            account={accounts.find(a => a.id === editTarget.id) ?? editTarget}
            onRecordAccount={onRecordAccount}
            onRecordHoldings={onRecordHoldings}
            onDeleteRecord={onDeleteRecord}
          />
        )}
      </div>
    </div>
  )
}

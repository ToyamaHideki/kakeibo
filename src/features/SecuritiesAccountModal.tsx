import type { Dispatch, SetStateAction } from 'react'
import type { SecuritiesAccount, SecuritiesAccountType } from '../types'
import { ACCOUNT_COLORS, ACCOUNT_TYPE_OPTIONS, type FormState } from './securitiesUtils'
import { SecuritiesRecordTab } from './SecuritiesRecordTab'

interface Props {
  showModal: boolean
  editTarget: SecuritiesAccount | null
  accounts: SecuritiesAccount[]
  form: FormState
  setForm: Dispatch<SetStateAction<FormState>>
  activeTab: 'settings' | 'record'
  setActiveTab: Dispatch<SetStateAction<'settings' | 'record'>>
  recordMonth: string
  setRecordMonth: Dispatch<SetStateAction<string>>
  recordInput: string
  setRecordInput: Dispatch<SetStateAction<string>>
  onClose: () => void
  onSave: () => Promise<void>
  onDelete: () => Promise<void>
  onRecord: () => Promise<void>
  onDeleteRecord: (ym: string) => Promise<void>
}

export function SecuritiesAccountModal({
  showModal,
  editTarget,
  accounts,
  form,
  setForm,
  activeTab,
  setActiveTab,
  recordMonth,
  setRecordMonth,
  recordInput,
  setRecordInput,
  onClose,
  onSave,
  onDelete,
  onRecord,
  onDeleteRecord,
}: Props) {
  if (!showModal) return null

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
            {(['settings', 'record'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === tab ? 'bg-sage-600 text-white' : 'bg-gray-100 text-gray-500'}`}
              >
                {tab === 'settings' ? '基本設定' : '評価額を記録'}
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

            {!editTarget && (
              <div>
                <label htmlFor="securities-account-initial-value" className="block text-xs font-medium text-gray-600 mb-1">現在の評価額（初回登録）</label>
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
                <p className="text-[11px] text-gray-500 mt-1">0より大きい値を入力すると今月の記録として保存されます</p>
              </div>
            )}

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

        {activeTab === 'record' && editTarget && (
          <SecuritiesRecordTab
            account={accounts.find(a => a.id === editTarget.id) ?? editTarget}
            recordMonth={recordMonth}
            recordInput={recordInput}
            onMonthChange={ym => {
              setRecordMonth(ym)
              const acc = accounts.find(a => a.id === editTarget.id) ?? editTarget
              setRecordInput(acc.monthlyValues[ym] !== undefined ? String(acc.monthlyValues[ym]) : '')
            }}
            onInputChange={setRecordInput}
            onRecord={onRecord}
            onDeleteRecord={onDeleteRecord}
          />
        )}
      </div>
    </div>
  )
}

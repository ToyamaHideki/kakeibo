import { useState } from 'react'
import type { SecuritiesHolding, SecuritiesHoldingCategory } from '../types'
import { HOLDING_CATEGORY_OPTIONS, formatYen } from './securitiesUtils'

interface Props {
  holdings: SecuritiesHolding[]
  onChange: (holdings: SecuritiesHolding[]) => void
}

interface FormState {
  name: string
  category: SecuritiesHoldingCategory
  memo: string
}

const emptyForm: FormState = {
  name: '',
  category: 'mutual_fund',
  memo: '',
}

function holdingToForm(h: SecuritiesHolding): FormState {
  return {
    name: h.name,
    category: h.category,
    memo: h.memo ?? '',
  }
}

// 商品の現在評価額は monthlyValues の最新月から派生（無ければ null）
function deriveLatestValue(h: SecuritiesHolding): number | null {
  if (!h.monthlyValues) return null
  const months = Object.keys(h.monthlyValues).sort()
  const latest = months[months.length - 1]
  if (!latest) return null
  return h.monthlyValues[latest] ?? null
}

export function SecuritiesHoldingsTab({ holdings, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null) // null=非編集, 'new'=新規, それ以外=既存ID
  const [form, setForm] = useState<FormState>(emptyForm)

  function openAdd() {
    setEditingId('new')
    setForm(emptyForm)
  }

  function openEdit(h: SecuritiesHolding) {
    setEditingId(h.id)
    setForm(holdingToForm(h))
  }

  function cancel() {
    setEditingId(null)
    setForm(emptyForm)
  }

  function save() {
    const name = form.name.trim()
    if (!name) return
    const memo = form.memo.trim() || undefined

    if (editingId === 'new') {
      const newHolding: SecuritiesHolding = {
        id: crypto.randomUUID(),
        name,
        category: form.category,
        order: holdings.length > 0 ? Math.max(...holdings.map(h => h.order)) + 1 : 1,
        ...(memo && { memo }),
      }
      onChange([...holdings, newHolding])
    } else if (editingId) {
      onChange(holdings.map(h => {
        if (h.id !== editingId) return h
        const updated: SecuritiesHolding = {
          id: h.id,
          order: h.order,
          name,
          category: form.category,
          ...(memo && { memo }),
          ...(h.monthlyValues && { monthlyValues: h.monthlyValues }),
        }
        return updated
      }))
    }
    cancel()
  }

  function remove(id: string) {
    onChange(holdings.filter(h => h.id !== id))
    if (editingId === id) cancel()
  }

  return (
    <div className="overflow-y-auto px-5 py-4 space-y-4">
      {/* 既存商品リスト */}
      {holdings.length === 0 && editingId !== 'new' && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded-xl px-4 py-4 leading-relaxed">
          <p className="font-medium text-gray-700 mb-1.5">商品の登録は任意です</p>
          <p className="mb-1">
            商品名・カテゴリだけ登録するシンプルな構成です。
          </p>
          <p>
            商品を1件でも登録すると「評価額を記録」タブで <span className="font-medium text-gray-700">「口座全体で記録」 / 「商品ごとに記録」</span> を選べるようになります。
          </p>
        </div>
      )}

      {holdings.map(h => {
        const categoryLabel = HOLDING_CATEGORY_OPTIONS.find(o => o.value === h.category)?.label
        const latestValue = deriveLatestValue(h)
        const isEditing = editingId === h.id
        return (
          <div key={h.id} className="rounded-xl border border-gray-200 p-3">
            {!isEditing ? (
              <button onClick={() => openEdit(h)} className="w-full text-left">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="font-medium text-sm text-gray-800 truncate flex-1">{h.name}</span>
                  <span className="shrink-0 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{categoryLabel}</span>
                </div>
                {h.memo && (
                  <p className="text-[11px] text-gray-500 truncate">{h.memo}</p>
                )}
                {latestValue !== null && (
                  <div className="flex items-baseline justify-between text-xs mt-1">
                    <span className="text-gray-500">直近の記録</span>
                    <span className="font-bold text-gray-700 tabular-nums">{formatYen(latestValue)}</span>
                  </div>
                )}
              </button>
            ) : (
              <HoldingForm form={form} setForm={setForm} onSave={save} onCancel={cancel} onDelete={() => remove(h.id)} isNew={false} />
            )}
          </div>
        )
      })}

      {/* 新規追加フォーム */}
      {editingId === 'new' && (
        <div className="rounded-xl border border-sage-200 bg-sage-50/40 p-3">
          <HoldingForm form={form} setForm={setForm} onSave={save} onCancel={cancel} isNew={true} />
        </div>
      )}

      {/* 追加ボタン */}
      {editingId === null && (
        <button
          onClick={openAdd}
          className="w-full py-2 bg-white border border-dashed border-gray-300 hover:border-sage-400 hover:bg-sage-50/40 text-sage-600 text-sm font-medium rounded-xl transition-colors"
        >
          + 商品を追加
        </button>
      )}
    </div>
  )
}

// ─── 商品追加・編集フォーム ─────────────────────────────────────────────────

interface HoldingFormProps {
  form: FormState
  setForm: (updater: (f: FormState) => FormState) => void
  onSave: () => void
  onCancel: () => void
  onDelete?: () => void
  isNew: boolean
}

function HoldingForm({ form, setForm, onSave, onCancel, onDelete, isNew }: HoldingFormProps) {
  return (
    <div className="space-y-2.5">
      <div>
        <label className="block text-[11px] font-medium text-gray-600 mb-1">商品名 <span className="text-red-400">*</span></label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="例：eMAXIS Slim 全世界株式"
          autoFocus
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-600 mb-1">カテゴリ</label>
        <select
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value as SecuritiesHoldingCategory }))}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
        >
          {HOLDING_CATEGORY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-600 mb-1">メモ（任意）</label>
        <input
          type="text"
          value={form.memo}
          onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={!form.name.trim()}
          className="flex-1 py-2 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-lg text-xs font-medium transition-colors"
        >
          {isNew ? '追加' : '保存'}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-medium transition-colors"
        >
          キャンセル
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="px-3 py-2 bg-white border border-red-200 text-red-400 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors"
          >
            削除
          </button>
        )}
      </div>
    </div>
  )
}

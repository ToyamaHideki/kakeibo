import { useEffect, useState } from 'react'
import type { HealthMetric, HealthVisibility } from '../types'

const COLOR_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#64748b', '#a855f7',
]

const UNIT_SUGGESTIONS = ['kg', '%', 'cm', '歳', 'kcal', 'cm³', 'bpm', 'mg/dL', 'mmHg']

export interface MetricFormValues {
  name: string
  unit: string
  decimalPlaces: number
  color: string
  visibility: HealthVisibility
  memo: string
}

function emptyDraft(): MetricFormValues {
  return { name: '', unit: 'kg', decimalPlaces: 1, color: COLOR_PALETTE[0]!, visibility: 'shared', memo: '' }
}

function toDraft(m: HealthMetric): MetricFormValues {
  return {
    name: m.name,
    unit: m.unit,
    decimalPlaces: m.decimalPlaces,
    color: m.color,
    visibility: m.visibility,
    memo: m.memo ?? '',
  }
}

interface Props {
  isOpen: boolean
  editTarget: HealthMetric | null
  onClose: () => void
  onSave: (values: MetricFormValues, editingTarget: HealthMetric | null) => Promise<void>
  onDelete?: ((metric: HealthMetric) => Promise<void>) | undefined
}

export function HealthMetricFormModal({ isOpen, editTarget, onClose, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<MetricFormValues>(emptyDraft())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setDraft(editTarget ? toDraft(editTarget) : emptyDraft())
  }, [isOpen, editTarget])

  if (!isOpen) return null

  async function handleSave() {
    if (saving) return
    const trimmedName = draft.name.trim()
    if (!trimmedName) return

    if (editTarget && draft.visibility !== editTarget.visibility) {
      const ok = window.confirm(
        draft.visibility === 'private'
          ? 'この項目を「本人のみ」に変更します。過去の記録も本人のみのストレージへ移動します。よろしいですか？'
          : 'この項目を「世帯共有」に変更します。過去の記録も世帯共有のストレージへ移動します。よろしいですか？',
      )
      if (!ok) return
    }

    setSaving(true)
    try {
      await onSave({ ...draft, name: trimmedName, unit: draft.unit.trim() || '' }, editTarget)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editTarget || !onDelete) return
    const ok = window.confirm(`「${editTarget.name}」を削除します。過去の記録からもこの項目の値が削除されます。よろしいですか？`)
    if (!ok) return
    setSaving(true)
    try {
      await onDelete(editTarget)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    // モーダルは「記録モーダル」の上に重ねるため z-index を高めに設定
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[90svh] flex flex-col shadow-xl"
        role="presentation"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <h3 className="text-base font-bold text-gray-800">
            {editTarget ? '項目を編集' : '項目を追加'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600" aria-label="閉じる">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-3">
          <div>
            <label htmlFor="hm-name" className="block text-xs font-medium text-gray-600 mb-1">項目名</label>
            <input
              id="hm-name"
              type="text"
              value={draft.name}
              onChange={e => setDraft({ ...draft, name: e.target.value })}
              placeholder="体重 / 体脂肪率 / 筋肉量 ..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="hm-unit" className="block text-xs font-medium text-gray-600 mb-1">単位</label>
              <input
                id="hm-unit"
                type="text"
                list="hm-unit-suggestions"
                value={draft.unit}
                onChange={e => setDraft({ ...draft, unit: e.target.value })}
                placeholder="kg"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
              />
              <datalist id="hm-unit-suggestions">
                {UNIT_SUGGESTIONS.map(u => <option key={u} value={u} />)}
              </datalist>
            </div>
            <div>
              <label htmlFor="hm-decimals" className="block text-xs font-medium text-gray-600 mb-1">小数桁数</label>
              <select
                id="hm-decimals"
                value={draft.decimalPlaces}
                onChange={e => setDraft({ ...draft, decimalPlaces: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
              >
                <option value={0}>0（整数）</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </div>
          </div>

          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- カラーパレット用のラベル */}
            <label className="block text-xs font-medium text-gray-600 mb-1">色</label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PALETTE.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDraft({ ...draft, color: c })}
                  aria-label={`色 ${c}`}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${draft.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- セグメンテッドトグルのラベル */}
            <label className="block text-xs font-medium text-gray-600 mb-1">公開範囲</label>
            <div className="grid grid-cols-2 gap-2">
              {(['shared', 'private'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDraft({ ...draft, visibility: v })}
                  className={`py-2 px-3 rounded-xl text-xs font-medium transition-colors border ${
                    draft.visibility === v
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
            <label htmlFor="hm-memo" className="block text-xs font-medium text-gray-600 mb-1">メモ（任意）</label>
            <input
              id="hm-memo"
              type="text"
              value={draft.memo}
              onChange={e => setDraft({ ...draft, memo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 py-3 border-t border-gray-100 shrink-0">
          {editTarget && onDelete && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="px-3 py-2 text-xs font-medium text-red-500 hover:text-red-600 disabled:text-gray-300 transition-colors"
            >
              削除
            </button>
          )}
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving || draft.name.trim() === ''}
            className="flex-1 px-4 py-2 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-xl text-sm font-medium transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

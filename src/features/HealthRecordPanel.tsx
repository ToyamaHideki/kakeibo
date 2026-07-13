import { useEffect, useMemo, useState } from 'react'
import type { HealthMetric } from '../types'
import { todayLocalIso as todayIso } from '../utils/date'

function formatValue(v: number | undefined, decimals: number): string {
  if (v === undefined) return '—'
  return v.toFixed(decimals)
}

interface Props {
  metrics: HealthMetric[]
  recordForDate: (date: string) => Record<string, number>
  onSave: (date: string, valuesByMetricId: Record<string, number>) => Promise<void>
  onAddMetric: () => void
  onEditMetric: (metric: HealthMetric) => void
  /** モーダル等で保存後に閉じるためのコールバック。サイドパネル常時表示時は未指定 */
  onSaved?: (() => void) | undefined
  /** キャンセルボタンを出す場合のハンドラ。サイドパネルでは未指定 */
  onCancel?: (() => void) | undefined
  /** 親が状態リセットを要求するときに変更する key（モーダルの再オープン時に使用） */
  resetKey?: number | undefined
}

// 健康記録の入力フォーム本体。モーダル / サイドパネルの双方から利用される。
export function HealthRecordPanel({
  metrics,
  recordForDate,
  onSave,
  onAddMetric,
  onEditMetric,
  onSaved,
  onCancel,
  resetKey,
}: Props) {
  const [date, setDate] = useState(todayIso())
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // resetKey が変化したら今日 + 空入力にリセット
  useEffect(() => {
    setDate(todayIso())
    setInputs({})
  }, [resetKey])

  const sortedMetrics = useMemo(
    () => [...metrics].sort((a, b) => a.order - b.order),
    [metrics],
  )

  const existing = useMemo(() => recordForDate(date), [date, recordForDate])

  async function handleSave() {
    if (saving) return
    const valuesByMetricId: Record<string, number> = {}
    for (const [mid, raw] of Object.entries(inputs)) {
      if (raw.trim() === '') continue
      const num = Number(raw)
      if (Number.isNaN(num) || num < 0) continue
      valuesByMetricId[mid] = num
    }
    if (Object.keys(valuesByMetricId).length === 0) return
    setSaving(true)
    try {
      await onSave(date, valuesByMetricId)
      // 記録成功 → 入力欄をクリア（サイドパネルでも連続入力しやすいように）
      setInputs({})
      onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  const canSave = Object.values(inputs).some(
    v => v.trim() !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0,
  )

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor="hr-date" className="block text-xs font-medium text-gray-600 mb-1">記録する日</label>
        <input
          id="hr-date"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          max={todayIso()}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
        />
      </div>

      {sortedMetrics.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-xl px-4 py-5 text-center text-xs text-gray-500">
          測定項目がまだありません。<br />
          下の「+ 項目を追加」から登録してください。
        </div>
      ) : (
        <div className="space-y-2">
          {sortedMetrics.map(m => {
            const prev = existing[m.id]
            return (
              <div key={m.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: m.color }}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium text-gray-800 flex-1 truncate">{m.name}</span>
                  {m.visibility === 'private' && (
                    <span className="shrink-0 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium" title="本人のみ表示">
                      本人のみ
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onEditMetric(m)}
                    className="shrink-0 text-gray-400 hover:text-sage-600 transition-colors p-0.5"
                    aria-label={`${m.name} を編集`}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step={m.decimalPlaces > 0 ? `0.${'0'.repeat(m.decimalPlaces - 1)}1` : '1'}
                    min="0"
                    inputMode="decimal"
                    value={inputs[m.id] ?? ''}
                    onChange={e => setInputs(prev => ({ ...prev, [m.id]: e.target.value }))}
                    placeholder={prev !== undefined ? String(prev) : '0'}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                  />
                  <span className="text-xs text-gray-500 w-10 shrink-0">{m.unit}</span>
                </div>
                {prev !== undefined && (
                  <p className="text-[10px] text-gray-500 mt-1">既存: {formatValue(prev, m.decimalPlaces)} {m.unit}（上書きされます）</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <button
        type="button"
        onClick={onAddMetric}
        className="w-full py-2 border-2 border-dashed border-gray-300 hover:border-sage-400 hover:text-sage-600 text-gray-500 rounded-xl text-xs font-medium transition-colors"
      >
        + 項目を追加
      </button>

      <div className="flex gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          className="flex-1 px-4 py-2 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-xl text-sm font-medium transition-colors"
        >
          記録
        </button>
      </div>
    </div>
  )
}

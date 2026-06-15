import { useEffect, useState } from 'react'
import type { HealthMetric } from '../types'
import { HealthRecordPanel } from './HealthRecordPanel'

interface Props {
  isOpen: boolean
  metrics: HealthMetric[]
  recordForDate: (date: string) => Record<string, number>
  onClose: () => void
  onSave: (date: string, valuesByMetricId: Record<string, number>) => Promise<void>
  onAddMetric: () => void
  onEditMetric: (metric: HealthMetric) => void
}

// 健康記録モーダル。中身は HealthRecordPanel と共通（モーダル枠 + 開いた際のリセット）。
export function HealthRecordModal({
  isOpen,
  metrics,
  recordForDate,
  onClose,
  onSave,
  onAddMetric,
  onEditMetric,
}: Props) {
  // モーダルを開くたびに HealthRecordPanel の入力欄をリセットする
  const [resetKey, setResetKey] = useState(0)
  useEffect(() => {
    if (isOpen) setResetKey(k => k + 1)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[90svh] flex flex-col shadow-xl"
        role="presentation"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <h3 className="text-base font-bold text-gray-800">体重測定</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600" aria-label="閉じる">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <HealthRecordPanel
            metrics={metrics}
            recordForDate={recordForDate}
            onSave={onSave}
            onAddMetric={onAddMetric}
            onEditMetric={onEditMetric}
            onSaved={onClose}
            onCancel={onClose}
            resetKey={resetKey}
          />
        </div>
      </div>
    </div>
  )
}

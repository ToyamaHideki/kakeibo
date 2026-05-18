import type { SecuritiesAccount } from '../types'
import { currentYearMonth } from '../utils/date'
import { formatYen } from './securitiesUtils'

interface Props {
  account: SecuritiesAccount
  recordMonth: string
  recordInput: string
  onMonthChange: (ym: string) => void
  onInputChange: (v: string) => void
  onRecord: () => void
  onDeleteRecord: (ym: string) => void
}

export function SecuritiesRecordTab({
  account,
  recordMonth,
  recordInput,
  onMonthChange,
  onInputChange,
  onRecord,
  onDeleteRecord,
}: Props) {
  const sortedRecords = Object.entries(account.monthlyValues ?? {})
    .sort(([a], [b]) => b.localeCompare(a))

  const existing = account.monthlyValues[recordMonth]

  return (
    <div className="overflow-y-auto px-5 py-4 space-y-4">
      <div className="bg-sage-50 rounded-xl px-4 py-3 text-sm">
        <span className="text-gray-500">最新評価額：</span>
        <span className="font-bold text-sage-700 ml-1">{formatYen(account.currentValue)}</span>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">記録する月</label>
        <input
          type="month"
          value={recordMonth}
          onChange={e => onMonthChange(e.target.value)}
          max={currentYearMonth()}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          評価額 {existing !== undefined && <span className="text-[10px] text-gray-500 ml-1">（上書きされます）</span>}
        </label>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-1">
            <span className="text-sm text-gray-500">¥</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={recordInput}
              onChange={e => onInputChange(e.target.value)}
              placeholder="1000000"
              autoFocus
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
            />
          </div>
          <button
            onClick={onRecord}
            disabled={recordInput === '' || Number(recordInput) < 0}
            className="px-4 py-2.5 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-xl text-sm font-medium transition-colors"
          >
            記録
          </button>
        </div>
      </div>

      {sortedRecords.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">記録履歴</p>
          <div className="space-y-1">
            {sortedRecords.map(([month, value]) => {
              const [cy, cm] = month.split('-')
              return (
                <div key={month} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500">{cy}年{Number(cm)}月</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">{formatYen(value)}</span>
                    <button
                      onClick={() => onDeleteRecord(month)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                      aria-label="この月の記録を削除"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import type { FixedCost } from '../types'
import { getOccurrenceInPeriod, FREQ_LABEL } from '../utils/fixedCost'

interface Props {
  fixedCosts: FixedCost[]
  periodStart: string       // "yyyy-MM-dd" — 給与日期間の開始（通常は yyyy-MM-01）
  periodEnd: string         // "yyyy-MM-dd" — 給与日期間の終了（通常は yyyy-MM-末日）
  skipKey: string           // "yyyy-MM" — skippedMonths への保存キー
  onClickItem: (cost: FixedCost, occurrenceDate: string) => void
  onSkip: (cost: FixedCost) => void
  onRestore: (cost: FixedCost) => void
}

export default function MonthlyFixedCostsSection({
  fixedCosts,
  periodStart,
  periodEnd,
  skipKey,
  onClickItem,
  onSkip,
  onRestore,
}: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [skippedOpen, setSkippedOpen] = useState(false)

  const { active, skipped } = useMemo(() => {
    const a: Array<{ cost: FixedCost; date: string; effectiveDay: number; isShifted: boolean }> = []
    const s: FixedCost[] = []
    for (const cost of fixedCosts) {
      const occ = getOccurrenceInPeriod(cost, periodStart, periodEnd)
      if (!occ) continue
      if (cost.skippedMonths?.includes(skipKey)) {
        s.push(cost)
      } else {
        a.push({ cost, date: occ.date, effectiveDay: occ.effectiveDay, isShifted: occ.isShifted })
      }
    }
    a.sort((x, y) => x.date.localeCompare(y.date))
    return { active: a, skipped: s }
  }, [fixedCosts, periodStart, periodEnd, skipKey])

  const plannedTotal = active
    .filter(x => !x.cost.isVariable)
    .reduce((sum, x) => sum + x.cost.amount, 0)
  const variableCount = active.filter(x => x.cost.isVariable).length

  if (active.length === 0 && skipped.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-90'}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="text-sm font-semibold text-gray-700">今月予定の固定費</span>
          <span className="text-xs text-gray-400">({active.length}件)</span>
        </div>
        <div className="text-xs text-gray-500 tabular-nums">
          予定 ¥{plannedTotal.toLocaleString()}
          {variableCount > 0 && (
            <span className="ml-1 text-amber-600">+ 変動{variableCount}件</span>
          )}
        </div>
      </button>

      {!collapsed && (
        <div className="divide-y divide-gray-100 border-t border-gray-100">
          {active.map(({ cost, date, effectiveDay, isShifted }) => {
            const freq = cost.frequency ?? 'monthly'
            const freqLabel = FREQ_LABEL[freq]
            const [, mStr] = date.split('-')
            return (
              <div key={cost.id} className="group relative flex items-stretch hover:bg-sage-50 transition-colors">
                <button
                  type="button"
                  onClick={() => onClickItem(cost, date)}
                  className="flex-1 flex items-center gap-3 px-4 py-2.5 text-left min-w-0"
                >
                  <div className="w-12 shrink-0 text-center">
                    <span className="text-[10px] text-gray-400 block leading-none">{Number(mStr)}月</span>
                    <span className={`text-sm font-bold ${isShifted ? 'text-amber-600' : 'text-sage-600'}`}>
                      {effectiveDay}
                    </span>
                    <span className="text-xs text-gray-500 block leading-none">
                      {isShifted ? '振替' : '日'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{cost.name}</div>
                      {freqLabel && (
                        <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600">
                          {freqLabel}
                        </span>
                      )}
                    </div>
                    {cost.paymentMethod && (
                      <div className="text-xs text-gray-500 truncate">{cost.paymentMethod}</div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    {cost.isVariable ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        金額未確定
                      </span>
                    ) : (
                      <div className="text-sm font-semibold text-gray-800 tabular-nums">
                        ¥{cost.amount.toLocaleString()}
                      </div>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onSkip(cost)}
                  className="shrink-0 w-9 flex items-center justify-center text-gray-300 hover:text-terracotta-500 hover:bg-terracotta-50 transition-colors"
                  aria-label={`${cost.name}を今月スキップ`}
                  title="今月はスキップ（一覧から除外）"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="18" y1="6" x2="6" y2="18" />
                  </svg>
                </button>
              </div>
            )
          })}
          {active.length > 0 && (
            <div className="px-4 py-2 text-[11px] text-gray-400 bg-gray-50">
              ※ クリックで入力フォームを開きます。収支サマリーには加算されません。
            </div>
          )}

          {skipped.length > 0 && (
            <div className="bg-gray-50">
              <button
                type="button"
                onClick={() => setSkippedOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <span>今月スキップ済み: {skipped.length}件</span>
                <span className="text-gray-400">{skippedOpen ? '閉じる' : '展開'}</span>
              </button>
              {skippedOpen && (
                <div className="divide-y divide-gray-100 border-t border-gray-100">
                  {skipped.map(cost => (
                    <div key={cost.id} className="flex items-center gap-3 px-4 py-2 text-xs text-gray-500">
                      <div className="flex-1 min-w-0 truncate line-through">{cost.name}</div>
                      <button
                        type="button"
                        onClick={() => onRestore(cost)}
                        className="shrink-0 px-2 py-1 text-xs font-medium text-sage-600 hover:bg-sage-50 rounded transition-colors"
                      >
                        復元
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { getDaysInMonth, getFirstDayOfWeek, dotColor } from '../utils/fixedCost'
import type { FixedCost } from '../types'

interface Props {
  viewYear: number
  viewMonth: number
  costsByDay: Map<number, FixedCost[]>
  today: Date
  onDayClick: (day: number) => void
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function FixedCostCalendar({ viewYear, viewMonth, costsByDay, today, onDayClick }: Props) {
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDow = getFirstDayOfWeek(viewYear, viewMonth)
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden shrink-0">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`py-1.5 text-center text-xs font-medium ${
              i === 0 ? 'text-terracotta-400' : i === 6 ? 'text-teal-500' : 'text-gray-500'
            }`}
          >
            {d}
          </div>
        ))}
      </div>
      {/* 日付セル */}
      <div className="grid grid-cols-7">
        {Array.from({ length: totalCells }).map((_, idx) => {
          const day = idx - firstDow + 1
          const isValid = day >= 1 && day <= daysInMonth
          const dow = idx % 7
          const dayCosts = isValid ? (costsByDay.get(day) ?? []) : []
          const hasCosts = dayCosts.length > 0
          const isToday =
            isValid &&
            day === today.getDate() &&
            viewYear === today.getFullYear() &&
            viewMonth === today.getMonth() + 1

          return (
            <div
              key={idx}
              onClick={() => { if (isValid && hasCosts) onDayClick(day) }}
              className={`h-[50px] md:h-auto md:min-h-[90px] p-1 border-t border-r border-gray-100 last:border-r-0 ${
                !isValid ? 'bg-gray-50' : ''
              } ${isValid && hasCosts ? 'cursor-pointer active:bg-sage-50/60 md:cursor-default md:active:bg-transparent' : ''}`}
            >
              {isValid && (
                <>
                  <div
                    className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-sage-600 text-white'
                        : dow === 0
                        ? 'text-terracotta-400'
                        : dow === 6
                        ? 'text-teal-500'
                        : 'text-gray-600'
                    }`}
                  >
                    {day}
                  </div>

                  {/* モバイル: カラードット */}
                  {hasCosts && (
                    <div className="md:hidden flex flex-wrap gap-0.5 justify-center mt-1">
                      {dayCosts.slice(0, 4).map(c => (
                        <span key={c.id} className={`w-1.5 h-1.5 rounded-full ${dotColor(c)}`} />
                      ))}
                      {dayCosts.length > 4 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      )}
                    </div>
                  )}

                  {/* デスクトップ: テキスト */}
                  <div className="hidden md:flex flex-col gap-0.5 mt-0.5">
                    {dayCosts.map(c => (
                      <span
                        key={c.id}
                        className={`block text-[10px] leading-tight rounded px-1 py-0.5 truncate ${
                          c.isVariable
                            ? 'bg-amber-50 text-amber-700'
                            : (c.frequency ?? 'monthly') === 'monthly'
                            ? 'bg-sage-50 text-sage-700'
                            : 'bg-teal-50 text-teal-700'
                        }`}
                        title={c.name}
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

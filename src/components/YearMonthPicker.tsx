import { useEffect, useState } from 'react'
import { currentYearMonth } from '../utils/date'

interface Props {
  yearMonth: string
  isOpen: boolean
  onClose: () => void
  onChange: (yearMonth: string) => void
}

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export default function YearMonthPicker({ yearMonth, isOpen, onClose, onChange }: Props) {
  const [pickerYear, setPickerYear] = useState(Number(yearMonth.split('-')[0]))

  const selectedYear = Number(yearMonth.split('-')[0])
  const selectedMonth = Number(yearMonth.split('-')[1])

  const today = currentYearMonth()
  const todayYear = Number(today.split('-')[0])
  const todayMonth = Number(today.split('-')[1])

  // 開くたびに表示年を現在の閲覧月に合わせる
  useEffect(() => {
    if (isOpen) setPickerYear(selectedYear)
  }, [isOpen, selectedYear])

  function handleMonthSelect(month: number) {
    onChange(`${pickerYear}-${String(month).padStart(2, '0')}`)
    onClose()
  }

  function handleGoToToday() {
    onChange(today)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-5 w-72 mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* 年選択 */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setPickerYear(y => y - 1)}
            aria-label="前の年"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-lg font-bold text-gray-800">{pickerYear}年</span>
          <button
            onClick={() => setPickerYear(y => y + 1)}
            aria-label="次の年"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* 月グリッド */}
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((label, i) => {
            const month = i + 1
            const isSelected = pickerYear === selectedYear && month === selectedMonth
            const isToday = pickerYear === todayYear && month === todayMonth

            return (
              <button
                key={month}
                onClick={() => handleMonthSelect(month)}
                className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-sage-600 text-white'
                    : isToday
                    ? 'border border-sage-400 text-sage-600 hover:bg-sage-50'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* 今月へ */}
        <button
          onClick={handleGoToToday}
          className="mt-4 w-full py-2 text-sm text-sage-600 font-medium border border-sage-200 rounded-lg hover:bg-sage-50 transition-colors"
        >
          今月へ
        </button>
      </div>
    </div>
  )
}

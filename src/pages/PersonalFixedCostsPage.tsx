import { useMemo, useState } from 'react'
import type { User } from 'firebase/auth'
import { useHousehold } from '../hooks/useHousehold'
import { useContracts } from '../hooks/useContracts'
import FixedCostCalendar from '../features/FixedCostCalendar'
import FixedCostDayModal from '../features/FixedCostDayModal'
import ContractRow from '../features/ContractRow'
import { getDaysInMonth, getEffectiveDay, isApplicableThisMonth } from '../utils/fixedCost'
import { buildPersonalContractItems, type FixedItem } from '../utils/fixedItem'

const noop = () => {}

export default function PersonalFixedCostsPage() {
  const { user } = useHousehold()
  if (!user) return <PersonalFixedGuestNotice />
  return <PersonalFixedCostsView user={user} />
}

function PersonalFixedGuestNotice() {
  return (
    <div className="flex items-center justify-center h-full px-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-sage-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-3">個人の固定費について</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-2">
          自分が「個人」で登録したサブスク・保険・ローン等を、世帯の固定費とは分けて一覧表示する機能です。
        </p>
        <p className="text-sm text-gray-500 leading-relaxed">
          個人の口座から引き落とす契約など、自分だけで把握したい固定費の管理にご利用いただけます。
        </p>
        <p className="text-xs text-gray-400 mt-5">
          ご利用にはGoogleアカウントでのログインが必要です。
        </p>
      </div>
    </div>
  )
}

function PersonalFixedCostsView({ user }: { user: User }) {
  const { contracts, loading } = useContracts()
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [dayModalOpen, setDayModalOpen] = useState(false)

  // 自分の個人契約のみ（renewalDate あり）
  const items = useMemo(
    () => buildPersonalContractItems(contracts, user.uid),
    [contracts, user.uid],
  )
  const sortedItems = [...items].sort((a, b) => a.dayOfMonth - b.dayOfMonth)

  function prevMonth() {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)

  const costsByDay = new Map<number, FixedItem[]>()
  for (const item of items) {
    if (!isApplicableThisMonth(item, viewYear, viewMonth)) continue
    const { effectiveDay, overflows } = getEffectiveDay(item.dayOfMonth, viewYear, viewMonth)
    if (!overflows) {
      const arr = costsByDay.get(effectiveDay) ?? []
      arr.push(item)
      costsByDay.set(effectiveDay, arr)
    }
  }

  const applicableItems = items.filter(it =>
    it.frequency === 'monthly' ? it.dayOfMonth <= daysInMonth : isApplicableThisMonth(it, viewYear, viewMonth),
  )
  const monthlyTotal = applicableItems.reduce((sum, it) => sum + it.amount, 0)

  if (loading) {
    return <div className="flex items-center justify-center h-48 text-gray-500 text-sm">読み込み中...</div>
  }

  const dayModalCosts = selectedDay !== null ? (costsByDay.get(selectedDay) ?? []) : []

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-lg font-bold text-gray-800">個人の固定費一覧</h2>
      </div>

      <p className="text-xs text-gray-500 mb-3 shrink-0">
        自分が「個人」で登録したサブスク・保険・ローン等を表示します（編集は各管理ページから）。
      </p>

      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4 mb-3 shrink-0">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-700">{viewYear}年{viewMonth}月</span>
        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden md:flex md:gap-6">
        {/* 左カラム: カレンダー + 合計 */}
        <div className="md:w-3/5 md:shrink-0 md:flex md:flex-col md:gap-4 md:overflow-y-auto flex flex-col gap-3">
          <FixedCostCalendar
            viewYear={viewYear}
            viewMonth={viewMonth}
            costsByDay={costsByDay}
            today={today}
            onDayClick={day => { setSelectedDay(day); setDayModalOpen(true) }}
          />

          <div className="px-4 py-3 bg-blue-50 rounded-xl shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">{viewYear}年{viewMonth}月の個人固定費合計</span>
              <span className="text-base font-bold text-blue-700">¥{monthlyTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 右カラム: リスト（デスクトップのみ・参照） */}
        <div className="hidden md:block md:flex-1 md:overflow-y-auto md:min-h-0">
          {sortedItems.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">個人の契約が登録されていません</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
              {sortedItems.map(item => (
                <ContractRow key={item.id} item={item} viewYear={viewYear} viewMonth={viewMonth} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 日別モーダル（モバイルのみ・参照） */}
      {dayModalOpen && selectedDay !== null && (
        <FixedCostDayModal
          day={selectedDay}
          month={viewMonth}
          year={viewYear}
          costs={dayModalCosts}
          onEdit={noop}
          onDelete={noop}
          onClose={() => setDayModalOpen(false)}
        />
      )}
    </div>
  )
}

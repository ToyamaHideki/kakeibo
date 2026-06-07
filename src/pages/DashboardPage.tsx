import { useMemo } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useHousehold } from '../hooks/useHousehold'
import { currentPayPeriodMonth } from '../utils/date'
import { isDesktopViewport } from '../utils/homePreference'
import type { DashboardView } from '../types'
import HouseholdDashboard from '../features/dashboard/HouseholdDashboard'

interface TabDef {
  value: DashboardView
  label: string
  ready: boolean
}

const TABS: TabDef[] = [
  { value: 'household', label: '家計', ready: true },
  { value: 'assets', label: '資産', ready: false },
  { value: 'living', label: '生活', ready: false },
  { value: 'lifeplan', label: 'ライフプラン', ready: false },
]

export default function DashboardPage() {
  const { payDay } = useHousehold()
  const [searchParams, setSearchParams] = useSearchParams()

  const view = useMemo<DashboardView>(() => {
    const v = searchParams.get('view')
    const found = TABS.find(t => t.value === v && t.ready)
    return found ? found.value : 'household'
  }, [searchParams])

  // モバイルからの直アクセスは月別収支へ（PC 専用機能）
  if (!isDesktopViewport()) {
    return <Navigate to={`/months/${currentPayPeriodMonth(payDay)}`} replace />
  }

  function selectView(next: DashboardView) {
    setSearchParams({ view: next }, { replace: true })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-screen-2xl mx-auto px-4 py-4 md:py-6">
        <h1 className="text-xl font-bold text-gray-800 mb-4">ダッシュボード</h1>

        {/* 管理切替タブ */}
        <div className="flex gap-2 mb-5 border-b border-gray-200" role="tablist" aria-label="管理切替">
          {TABS.map(tab => {
            const selected = tab.value === view
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-disabled={!tab.ready}
                disabled={!tab.ready}
                onClick={() => tab.ready && selectView(tab.value)}
                className={`px-4 py-2 text-sm font-semibold -mb-px border-b-2 transition-colors ${
                  selected
                    ? 'border-sage-600 text-sage-700'
                    : tab.ready
                      ? 'border-transparent text-gray-500 hover:text-gray-700'
                      : 'border-transparent text-gray-300 cursor-not-allowed'
                }`}
              >
                {tab.label}
                {!tab.ready && <span className="ml-1 text-[10px] text-gray-300">準備中</span>}
              </button>
            )
          })}
        </div>

        {/* 本体（MVP は household のみ） */}
        {view === 'household' && <HouseholdDashboard />}
      </div>
    </div>
  )
}

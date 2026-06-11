import { Navigate } from 'react-router-dom'
import { useHousehold } from '../hooks/useHousehold'
import { currentPayPeriodMonth } from '../utils/date'
import { isDesktopViewport } from '../utils/homePreference'
import HouseholdDashboard from '../features/dashboard/HouseholdDashboard'

export default function DashboardPage() {
  const { payDay } = useHousehold()

  // モバイルからの直アクセスは月別収支へ（PC 専用機能）
  if (!isDesktopViewport()) {
    return <Navigate to={`/months/${currentPayPeriodMonth(payDay)}`} replace />
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-screen-2xl mx-auto px-4 py-4 md:py-6">
        <h1 className="text-xl font-bold text-gray-800 mb-4">ダッシュボード</h1>
        <HouseholdDashboard />
      </div>
    </div>
  )
}

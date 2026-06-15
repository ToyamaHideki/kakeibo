import { Link, useLocation } from 'react-router-dom'
import { currentPayPeriodMonth, monthFromPath } from '../utils/date'
import { useAuth } from '../hooks/useAuth'
import { useHousehold } from '../hooks/useHousehold'
import { signOut } from '../firebase/auth'
import { APP_VERSION_LABEL } from '../constants/version'

export default function Sidebar() {
  const location = useLocation()
  const { user } = useAuth()
  const { payDay } = useHousehold()
  // 月を持つ画面を閲覧中はその月を、それ以外は給与日起算の当月分を引き継ぐ
  const periodMonth = monthFromPath(location.pathname) ?? currentPayPeriodMonth(payDay)
  const isDashboardActive = location.pathname === '/dashboard'
  const isMonthlyActive = location.pathname.startsWith('/months/')
  const isAnnualActive = location.pathname === '/annual'
  const isCashflowActive = location.pathname === '/cashflow'
  const isFixedCostsActive = location.pathname === '/fixed-costs'
  const isPersonalActive = location.pathname.startsWith('/personal/months') || location.pathname === '/personal'
  const isPersonalFixedActive = location.pathname === '/personal/fixed-costs'
  const isShoppingActive = location.pathname === '/shopping'
  const isTasksActive = location.pathname === '/tasks'
  const isContractsActive = location.pathname === '/contracts'
  const isSubscriptionsActive = location.pathname === '/subscriptions'
  const isBudgetActive = location.pathname.startsWith('/budget')
  const isGoalsActive = location.pathname === '/goals'
  const isSavingsManagementActive = location.pathname === '/savings-management'
  const isIncomeStatementActive = location.pathname.startsWith('/income-statement')
  const isBalanceSheetActive = location.pathname.startsWith('/balance-sheet')
  const isSecuritiesActive = location.pathname === '/securities'
  const isHouseholdSettingsActive = location.pathname === '/household-settings'
  const isAnnouncementsActive = location.pathname === '/announcements'
  const isHealthActive = location.pathname === '/health'

  const navItemClass = (active: boolean) =>
    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-sage-50 text-sage-600' : 'text-gray-600 hover:bg-gray-100'
    }`

  return (
    <aside className="flex flex-col w-60 h-full bg-white border-r border-gray-200">
      <div className="px-6 py-5 border-b border-gray-200">
        <h1 className="text-xl font-bold text-sage-600">家計簿</h1>
      </div>



      <nav className="flex-1 overflow-y-auto px-3 space-y-1 py-1">
        <Link to="/dashboard" className={navItemClass(isDashboardActive)}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
          ダッシュボード
        </Link>

        <li className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">家計管理</li>
        <Link to={`/budget/${periodMonth}`} className={navItemClass(isBudgetActive)}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          予算管理
        </Link>

        <Link to={`/months/${periodMonth}`} className={navItemClass(isMonthlyActive)}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          月別収支
        </Link>

        <Link to="/annual" className={navItemClass(isAnnualActive)}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
          年間収支
        </Link>

        <Link to="/fixed-costs" className={navItemClass(isFixedCostsActive)}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <line x1="8" y1="14" x2="16" y2="14" />
            <line x1="8" y1="18" x2="13" y2="18" />
          </svg>
          固定費一覧
        </Link>

        <Link to="/subscriptions" className={navItemClass(isSubscriptionsActive)}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          サブスク管理
        </Link>

        <Link to="/contracts" className={navItemClass(isContractsActive)}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          保険・ローン管理
        </Link>

        <li className="pt-2 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">個人管理</li>
        <Link to={`/personal/months/${periodMonth}`} className={navItemClass(isPersonalActive)}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          個人支出
        </Link>

        <Link to="/personal/fixed-costs" className={navItemClass(isPersonalFixedActive)}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <line x1="8" y1="14" x2="16" y2="14" />
            <line x1="8" y1="18" x2="13" y2="18" />
          </svg>
          個人の固定費
        </Link>

        <li className="pt-2 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">体重測定</li>
        <Link to="/health" className={navItemClass(isHealthActive)}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
          体重測定
        </Link>

        <li className="pt-2 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">生活管理</li>
        <Link to="/shopping" className={navItemClass(isShoppingActive)}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <line x1="9" y1="12" x2="15" y2="12" />
            <line x1="9" y1="16" x2="13" y2="16" />
          </svg>
          買い物リスト
        </Link>

        <Link to="/tasks" className={navItemClass(isTasksActive)}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          家事タスク
        </Link>

        <li className="pt-2 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">資産管理</li>
        <Link to="/savings-management" className={navItemClass(isSavingsManagementActive)}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 14a2 2 0 100-4 2 2 0 000 4z" />
            <path d="M2 11l5-4h10l5 4" />
          </svg>
          貯蓄管理
        </Link>

        <Link to="/goals" className={navItemClass(isGoalsActive)}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4l3 3" />
          </svg>
          貯蓄目標
        </Link>

        <Link to="/securities" className={navItemClass(isSecuritiesActive)}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <polyline points="7 14 11 10 14 13 21 6" />
          </svg>
          証券口座
        </Link>

        <li className="pt-2 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">ライフプランニング</li>
        <Link to="/cashflow" className={navItemClass(isCashflowActive)}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
          キャッシュフロー
        </Link>

        <Link to="/income-statement" className={navItemClass(isIncomeStatementActive)}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
          収支確認表
        </Link>

        <Link to="/balance-sheet" className={navItemClass(isBalanceSheetActive)}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="12" y1="3" x2="12" y2="21" />
          </svg>
          バランスシート
        </Link>

        <li className="pt-2 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">設定</li>
        <Link to="/household-settings" className={navItemClass(isHouseholdSettingsActive)}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
          設定
        </Link>

        <Link to="/announcements" className={navItemClass(isAnnouncementsActive)}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
          </svg>
          お知らせ
        </Link>

      </nav>

      {/* アプリバージョン */}
      <div className="px-4 pt-2 text-[10px] text-gray-400 text-right">
        {APP_VERSION_LABEL}
      </div>

      {/* ログインユーザー情報 */}
      {user && (
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-600 truncate mb-1">{user.displayName ?? user.email}</p>
          <button
            onClick={() => signOut()}
            className="text-xs text-gray-500 hover:text-gray-600 transition-colors"
          >
            ログアウト
          </button>
        </div>
      )}
    </aside>
  )
}

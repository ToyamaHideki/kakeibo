import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HouseholdProvider } from './hooks/useHousehold'
import Layout from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { currentYear, currentYearMonth } from './utils/date'
import { lazyWithReload } from './utils/lazyWithReload'

const MonthlyPage = lazyWithReload(() => import('./pages/MonthlyPage'))
const AnnualPage = lazyWithReload(() => import('./pages/AnnualPage'))
const CashflowPage = lazyWithReload(() => import('./pages/CashflowPage'))
const FixedCostsPage = lazyWithReload(() => import('./pages/FixedCostsPage'))
const PersonalPage = lazyWithReload(() => import('./pages/PersonalPage'))
const ShoppingListPage = lazyWithReload(() => import('./pages/ShoppingListPage'))
const HouseholdTasksPage = lazyWithReload(() => import('./pages/HouseholdTasksPage'))
const BudgetPage = lazyWithReload(() => import('./pages/BudgetPage'))
const ContractsPage = lazyWithReload(() => import('./pages/ContractsPage'))
const SubscriptionsPage = lazyWithReload(() => import('./pages/SubscriptionsPage'))
const SavingsGoalsPage = lazyWithReload(() => import('./pages/SavingsGoalsPage'))
const IncomeStatementPage = lazyWithReload(() => import('./pages/IncomeStatementPage'))
const BalanceSheetPage = lazyWithReload(() => import('./pages/BalanceSheetPage'))
const SecuritiesAccountsPage = lazyWithReload(() => import('./pages/SecuritiesAccountsPage'))
const SavingsManagementPage = lazyWithReload(() => import('./pages/SavingsManagementPage'))
const HouseholdSettingsPage = lazyWithReload(() => import('./pages/HouseholdSettingsPage'))
const AnnouncementsPage = lazyWithReload(() => import('./pages/AnnouncementsPage'))

function App() {
  return (
    <ErrorBoundary>
      <HouseholdProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-500 text-sm">読み込み中...</div>}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to={`/months/${currentYearMonth()}`} replace />} />
                <Route path="months/:yearMonth" element={<MonthlyPage />} />
                <Route path="annual" element={<AnnualPage />} />
                <Route path="cashflow" element={<CashflowPage />} />
                <Route path="fixed-costs" element={<FixedCostsPage />} />
                <Route path="personal" element={<Navigate to={`/personal/months/${currentYearMonth()}`} replace />} />
                <Route path="personal/months/:yearMonth" element={<PersonalPage />} />
                <Route path="shopping" element={<ShoppingListPage />} />
                <Route path="tasks" element={<HouseholdTasksPage />} />
                <Route path="budget" element={<Navigate to={`/budget/${currentYearMonth()}`} replace />} />
                <Route path="budget/:yearMonth" element={<BudgetPage />} />
                <Route path="contracts" element={<ContractsPage />} />
                <Route path="subscriptions" element={<SubscriptionsPage />} />
                <Route path="goals" element={<SavingsGoalsPage />} />
                <Route path="income-statement" element={<Navigate to={`/income-statement/${currentYear()}`} replace />} />
                <Route path="income-statement/:year" element={<IncomeStatementPage />} />
                <Route path="balance-sheet" element={<Navigate to={`/balance-sheet/${currentYear()}`} replace />} />
                <Route path="balance-sheet/:year" element={<BalanceSheetPage />} />
                <Route path="securities" element={<SecuritiesAccountsPage />} />
                <Route path="savings-management" element={<SavingsManagementPage />} />
                <Route path="household-settings" element={<HouseholdSettingsPage />} />
                <Route path="announcements" element={<AnnouncementsPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </HouseholdProvider>
    </ErrorBoundary>
  )
}

export default App

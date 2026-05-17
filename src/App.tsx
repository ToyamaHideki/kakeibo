import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HouseholdProvider } from './hooks/useHousehold'
import Layout from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { currentYear, currentYearMonth } from './utils/date'

const MonthlyPage = lazy(() => import('./pages/MonthlyPage'))
const AnnualPage = lazy(() => import('./pages/AnnualPage'))
const CashflowPage = lazy(() => import('./pages/CashflowPage'))
const FixedCostsPage = lazy(() => import('./pages/FixedCostsPage'))
const PersonalPage = lazy(() => import('./pages/PersonalPage'))
const ShoppingListPage = lazy(() => import('./pages/ShoppingListPage'))
const HouseholdTasksPage = lazy(() => import('./pages/HouseholdTasksPage'))
const BudgetPage = lazy(() => import('./pages/BudgetPage'))
const ContractsPage = lazy(() => import('./pages/ContractsPage'))
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage'))
const SavingsGoalsPage = lazy(() => import('./pages/SavingsGoalsPage'))
const IncomeStatementPage = lazy(() => import('./pages/IncomeStatementPage'))
const BalanceSheetPage = lazy(() => import('./pages/BalanceSheetPage'))
const SecuritiesAccountsPage = lazy(() => import('./pages/SecuritiesAccountsPage'))
const SavingsManagementPage = lazy(() => import('./pages/SavingsManagementPage'))
const HouseholdSettingsPage = lazy(() => import('./pages/HouseholdSettingsPage'))

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
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </HouseholdProvider>
    </ErrorBoundary>
  )
}

export default App

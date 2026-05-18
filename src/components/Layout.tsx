import { Outlet } from 'react-router-dom'
import { useCategories } from '../hooks/useCategories'
import { usePaymentMethods } from '../hooks/usePaymentMethods'
import { useHousehold } from '../hooks/useHousehold'
import { signInAsGuest, signInWithGoogle } from '../firebase/auth'
import type { Category, PaymentMethod } from '../types'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import HouseholdSetupPage from '../pages/HouseholdSetupPage'

export interface OutletContext {
  categories: Category[]
  paymentMethods: PaymentMethod[]
  onCategoryAdded: (category: Category) => void
  onPaymentMethodAdded: (paymentMethod: PaymentMethod) => void
  onCategoryDeleted: (id: string) => void
  onPaymentMethodDeleted: (id: string) => void
}

export default function Layout() {
  const { state, user, isGuest } = useHousehold()
  const { categories, addCategoryLocally, removeCategoryLocally } = useCategories()
  const { paymentMethods, addPaymentMethodLocally, removePaymentMethodLocally } = usePaymentMethods()

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-600" />
      </div>
    )
  }

  if (state === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-50">
        <div className="bg-white rounded-2xl shadow-md p-10 flex flex-col items-center gap-6 w-full max-w-sm mx-4">
          <h1 className="text-2xl font-bold text-sage-600">家計簿</h1>
          <p className="text-gray-500 text-sm text-center">ご利用にはGoogleアカウントでのログインが必要です</p>
          <button
            onClick={() => signInWithGoogle()}
            className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-300 rounded-xl shadow-sm hover:shadow-md transition-shadow text-gray-700 font-medium text-sm"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Googleでログイン
          </button>
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-500">または</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <button
            onClick={() => signInAsGuest()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-stone-100 hover:bg-stone-200 rounded-xl text-gray-600 font-medium text-sm transition-colors w-full"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            ゲストとして試す
          </button>
          <p className="text-xs text-gray-500 text-center leading-relaxed">
            サンプルデータで全機能を体験できます。<br />
            変更はリロードでリセットされます。
          </p>
        </div>
      </div>
    )
  }

  if (state === 'needs_setup') {
    return <HouseholdSetupPage />
  }

  const context: OutletContext = {
    categories,
    paymentMethods,
    onCategoryAdded: addCategoryLocally,
    onPaymentMethodAdded: addPaymentMethodLocally,
    onCategoryDeleted: removeCategoryLocally,
    onPaymentMethodDeleted: removePaymentMethodLocally,
  }

  void user

  return (
    <div className="flex h-dvh overflow-hidden bg-stone-50">
      <div className="hidden md:flex md:shrink-0">
        <Sidebar />
      </div>

      <main className="flex-1 overflow-hidden pb-16 md:pb-0 flex flex-col">
        {isGuest && (
          <div className="flex items-center justify-between px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs shrink-0">
            <span>ゲストモード：サンプルデータを表示中。変更はリロードでリセットされます。</span>
            <button
              onClick={() => signInWithGoogle()}
              className="underline text-amber-700 hover:text-amber-900 shrink-0 ml-3 whitespace-nowrap"
            >
              Googleでログイン
            </button>
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <Outlet context={context} />
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
        <BottomNav />
      </nav>
    </div>
  )
}

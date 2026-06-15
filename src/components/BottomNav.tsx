import { useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { currentPayPeriodMonth, monthFromPath } from '../utils/date'
import { useHousehold } from '../hooks/useHousehold'

type SubPage = { label: string; path: string }
type Category = { id: string; label: string; subPages: SubPage[]; firstPath: string }

// 月リンクは給与日起算の「当月分」(ym) を埋め込む。
function buildCategories(ym: string): Category[] {
  return [
    {
      id: 'kakeibo',
      label: '家計',
      firstPath: `/months/${ym}`,
      subPages: [
        { label: '予算', path: `/budget/${ym}` },
        { label: '月別収支', path: `/months/${ym}` },
        { label: '年間収支', path: '/annual' },
        { label: '固定費', path: '/fixed-costs' },
        { label: 'サブスク', path: '/subscriptions' },
        { label: '保険・ローン', path: '/contracts' },
      ],
    },
    {
      id: 'lifestyle',
      label: '生活',
      firstPath: '/shopping',
      subPages: [
        { label: '買い物', path: '/shopping' },
        { label: '家事', path: '/tasks' },
      ],
    },
    {
      id: 'lifeplan',
      label: 'ライフプラン',
      firstPath: '/cashflow',
      subPages: [
        { label: 'CF表', path: '/cashflow' },
        { label: '収支確認表', path: '/income-statement' },
        { label: '証券', path: '/securities' },
        { label: 'BS', path: '/balance-sheet' },
      ],
    },
    {
      id: 'assets',
      label: '資産',
      firstPath: '/savings-management',
      subPages: [
        { label: '貯蓄管理', path: '/savings-management' },
        { label: '貯蓄目標', path: '/goals' },
        { label: '証券口座', path: '/securities' },
      ],
    },
    {
      id: 'personal',
      label: '個人管理',
      firstPath: `/personal/months/${ym}`,
      subPages: [
        { label: '個人支出', path: `/personal/months/${ym}` },
        { label: '固定費', path: '/personal/fixed-costs' },
      ],
    },
    {
      id: 'health',
      label: '体重測定',
      firstPath: '/health',
      subPages: [],
    },
    {
      id: 'settings',
      label: '設定',
      firstPath: '/household-settings',
      subPages: [
        { label: '設定', path: '/household-settings' },
        { label: 'お知らせ', path: '/announcements' },
      ],
    },
  ]
}

function activeCategory(pathname: string): string {
  if (pathname.startsWith('/personal')) return 'personal'
  if (pathname === '/contracts' || pathname === '/subscriptions') return 'kakeibo'
  if (pathname === '/shopping' || pathname === '/tasks') return 'lifestyle'
  if (pathname === '/cashflow' || pathname.startsWith('/income-statement') || pathname.startsWith('/balance-sheet')) return 'lifeplan'
  if (pathname === '/goals' || pathname === '/securities' || pathname === '/savings-management') return 'assets'
  if (pathname.startsWith('/health')) return 'health'
  if (pathname === '/household-settings' || pathname === '/announcements') return 'settings'
  return 'kakeibo'
}

function isSubPageActive(pathname: string, subPath: string): boolean {
  if (subPath.startsWith('/months/')) return pathname.startsWith('/months/')
  if (subPath.startsWith('/personal/months/')) return pathname.startsWith('/personal/months') || pathname === '/personal'
  if (subPath.startsWith('/budget/')) return pathname.startsWith('/budget/')
  if (subPath === '/income-statement') return pathname.startsWith('/income-statement')
  if (subPath === '/balance-sheet') return pathname.startsWith('/balance-sheet')
  return pathname === subPath
}

export default function BottomNav() {
  const navRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { payDay } = useHousehold()
  // 月を持つ画面を閲覧中はその月を、それ以外は給与日起算の当月分を引き継ぐ
  const linkMonth = monthFromPath(location.pathname) ?? currentPayPeriodMonth(payDay)
  const categories = buildCategories(linkMonth)
  const activeCatId = activeCategory(location.pathname)
  const activeCat = categories.find(c => c.id === activeCatId)!

  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const update = (h: number) =>
      document.documentElement.style.setProperty('--bn-height', `${h}px`)
    update(el.getBoundingClientRect().height)
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const box = entry.borderBoxSize[0]
      if (!box) return
      update(box.blockSize)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const subPages = activeCat.subPages

  return (
    <div ref={navRef} className="bg-white border-t border-gray-200">
      {/* サブページバー（サブページが1つ以上ある場合のみ表示）*/}
      {subPages.length >= 2 && (
        <div className="flex border-b border-gray-100 px-1 pt-1 gap-0.5 overflow-x-auto scrollbar-none">
          {subPages.map(sp => {
            const active = isSubPageActive(location.pathname, sp.path)
            return (
              <Link
                key={sp.path}
                to={sp.path}
                className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${
                  active
                    ? 'text-sage-600 border-b-2 border-sage-500 bg-sage-50/60'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {sp.label}
              </Link>
            )
          })}
        </div>
      )}

      {/* カテゴリタブ */}
      <div className="flex">
        {categories.map(cat => {
          const active = cat.id === activeCatId
          return (
            <button
              key={cat.id}
              onClick={() => navigate(cat.firstPath)}
              className={`flex-1 flex flex-col items-center min-h-[44px] justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                active ? 'text-sage-600' : 'text-gray-500'
              }`}
            >
              <CategoryIcon id={cat.id} active={active} />
              {cat.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CategoryIcon({ id, active }: { id: string; active: boolean }) {
  const cls = `w-5 h-5 ${active ? 'text-sage-600' : 'text-gray-500'}`
  if (id === 'kakeibo') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    )
  }
  if (id === 'lifestyle') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </svg>
    )
  }
  if (id === 'lifeplan') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    )
  }
  if (id === 'assets') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    )
  }
  if (id === 'health') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    )
  }
  if (id === 'settings') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    )
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

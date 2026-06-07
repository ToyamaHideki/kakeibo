# PC版ダッシュボード 詳細設計書

- 対象バージョン：**Ver 1.0600**
- 基本設計書：`docs/PC版ダッシュボード_基本設計書.md`
- 想定実装者：下位モデル（Sonnet 等）

---

## 0. 実装担当者への注意（必読）

1. **PC 専用**。モバイル（`< md` = 768px 未満）では表示しない。`DashboardPage` 冒頭で `matchMedia('(min-width: 768px)')` を判定し、未満なら `/months/:current` へ `<Navigate replace>`。
2. **新規 Firestore アクセスを作らない**。データは既存フック（`useMonthlyData` / `useBudget` / `useCategories` / `useAnnualData`）と既存関数 `fetchFixedCosts` の再利用のみ。
3. **給与日起算とカレンダー月の使い分け**に注意：
   - 今月の収支サマリー・予算消化 → 給与日起算（`currentPayPeriodMonth(payDay)`、`useMonthlyData(ym, payDay)`、`useBudget(ym)`）。
   - 収支推移グラフ → カレンダー月（`useAnnualData(currentYear())`）。年間収支と同じ扱い。
4. **`useBudget` と `useAnnualData` は react-query ではなく `useState/useEffect` ベース**（既存実装）。`householdId` が null の間は空を返すので、ローディング表示を必ず入れる。
5. **タブの MVP 範囲は `household` のみ活性**。他タブは `disabled`＋「準備中」。`?view` の未知値・未指定は `household` にフォールバック。
6. **localStorage は例外安全に**。読み書きを try/catch でラップし、失敗時は「ダッシュボードをホームにしない（= 従来の月別収支）」にフォールバック。
7. **既存ファイルへの変更は最小限**：`App.tsx`（ルート追加＋トップ分岐）、`Sidebar.tsx`（項目追加）、`HouseholdSettingsPage.tsx`（設定カード追加）、`version.ts`／`package.json`（版番号）。それ以外の既存ファイルは触らない。
8. **品質ゲート（厳守）**：`npm run lint`（警告 0）／`npx tsc -b`（型エラー 0）／`npm test`（全 pass）。

---

## 1. 追加・変更ファイル一覧

| 区分 | パス | 内容 |
|---|---|---|
| 新規 | `src/pages/DashboardPage.tsx` | ダッシュボード画面本体（タブ＋モバイルガード） |
| 新規 | `src/features/dashboard/HouseholdDashboard.tsx` | 家計管理ダッシュボード（カード配置） |
| 新規 | `src/features/dashboard/cards/IncomeExpenseSummaryCard.tsx` | 今月の収支サマリー |
| 新規 | `src/features/dashboard/cards/BudgetProgressCard.tsx` | 予算消化状況 |
| 新規 | `src/features/dashboard/cards/TrendChartCard.tsx` | 収支推移グラフ |
| 新規 | `src/features/dashboard/cards/FixedCostSummaryCard.tsx` | 当月の固定費 |
| 新規 | `src/features/dashboard/DashboardCard.tsx` | カード共通ラッパー（タイトル＋遷移リンク） |
| 新規 | `src/utils/homePreference.ts` | PC 初期表示設定の localStorage 読み書き |
| 変更 | `src/App.tsx` | `/dashboard` ルート追加・トップ `/` 分岐 |
| 変更 | `src/components/Sidebar.tsx` | 「ダッシュボード」項目追加 |
| 変更 | `src/pages/HouseholdSettingsPage.tsx` | 「表示設定」カード追加 |
| 変更 | `src/types/index.ts` | `DashboardView` 型追加 |
| 変更 | `src/constants/version.ts` | `APP_VERSION = '1.0600'` |
| 変更 | `package.json` | `"version": "1.0600"` |

---

## 2. 型定義

`src/types/index.ts` の末尾付近に追加：

```typescript
// ─── Dashboard ────────────────────────────────────────────────────────────────

// PC版ダッシュボードの表示対象の管理。MVP で実装するのは 'household' のみ。
export type DashboardView = 'household' | 'assets' | 'living' | 'lifeplan'
```

---

## 3. ユーティリティ

### 3.1 `src/utils/homePreference.ts`（新規・全文）

```typescript
// PC トップアクセス時にダッシュボードを初期表示するかどうかの設定。
// デバイス依存の表示設定のため localStorage に保存する（Firestore は使わない）。

const HOME_PREF_KEY = 'dashboardAsHome'

export function getDashboardAsHome(): boolean {
  try {
    return localStorage.getItem(HOME_PREF_KEY) === 'true'
  } catch {
    return false
  }
}

export function setDashboardAsHome(value: boolean): void {
  try {
    localStorage.setItem(HOME_PREF_KEY, value ? 'true' : 'false')
  } catch {
    // プライベートモード等で書き込めない場合は黙って無視（従来挙動にフォールバック）
  }
}

export function isDesktopViewport(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(min-width: 768px)').matches
}
```

---

## 4. ルーティング変更（`src/App.tsx`）

### 4.1 lazy import 追加

```typescript
const DashboardPage = lazyWithReload(() => import('./pages/DashboardPage'))
```

### 4.2 トップ `/` 分岐コンポーネント

既存の `PayPeriodRedirect` はそのまま残し、index 用に新コンポーネントを追加：

```typescript
import { getDashboardAsHome, isDesktopViewport } from './utils/homePreference'

// トップ（/）の初期表示先を決める。
// デスクトップ かつ「ダッシュボードをホームにする」設定が ON のときのみダッシュボードへ。
// それ以外は従来通り給与日起算の月別収支へ。
function RootRedirect() {
  const { payDay } = useHousehold()
  if (isDesktopViewport() && getDashboardAsHome()) {
    return <Navigate to="/dashboard?view=household" replace />
  }
  return <Navigate to={`/months/${currentPayPeriodMonth(payDay)}`} replace />
}
```

### 4.3 ルート定義の差分

```tsx
<Route index element={<RootRedirect />} />              {/* 変更：PayPeriodRedirect → RootRedirect */}
<Route path="dashboard" element={<DashboardPage />} />  {/* 追加 */}
{/* 以降は既存のまま */}
```

---

## 5. ダッシュボード画面本体（`src/pages/DashboardPage.tsx`・全文）

```tsx
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

  // モバイルからの直アクセスは月別収支へ（PC 専用機能）
  if (!isDesktopViewport()) {
    return <Navigate to={`/months/${currentPayPeriodMonth(payDay)}`} replace />
  }

  const view = useMemo<DashboardView>(() => {
    const v = searchParams.get('view')
    const found = TABS.find(t => t.value === v && t.ready)
    return found ? found.value : 'household'
  }, [searchParams])

  function selectView(next: DashboardView) {
    setSearchParams({ view: next }, { replace: true })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
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
```

> 注：`if (!isDesktopViewport())` の早期 return は Hooks より前に置くと「Hooks の数が変わる」React 警告になる。**上記のように `useMemo` 等の Hooks より前で return せず**、判定に Hooks を使わない（`isDesktopViewport()` は純関数）ため問題ないが、lint（rules-of-hooks）が厳しい場合は早期 return を `useSearchParams` 呼び出しの**後**に移動すること。実装時は lint を必ず確認。

---

## 6. カード共通ラッパー（`src/features/dashboard/DashboardCard.tsx`・全文）

```tsx
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

interface Props {
  title: string
  to?: string          // 指定時はタイトルがリンクになり対応画面へ遷移
  className?: string
  children: ReactNode
}

export default function DashboardCard({ title, to, className = '', children }: Props) {
  return (
    <section className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-700">{title}</h2>
        {to && (
          <Link to={to} className="text-xs text-sage-600 hover:text-sage-700" aria-label={`${title}の画面へ`}>
            詳細 ›
          </Link>
        )}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  )
}
```

---

## 7. 家計ダッシュボード（`src/features/dashboard/HouseholdDashboard.tsx`・全文）

```tsx
import { useHousehold } from '../../hooks/useHousehold'
import { currentPayPeriodMonth, currentYear } from '../../utils/date'
import { useMonthlyData } from '../../hooks/useMonthlyData'
import { useBudget } from '../../hooks/useBudget'
import { useCategories } from '../../hooks/useCategories'
import { useAnnualData } from '../../hooks/useAnnualData'
import IncomeExpenseSummaryCard from './cards/IncomeExpenseSummaryCard'
import BudgetProgressCard from './cards/BudgetProgressCard'
import TrendChartCard from './cards/TrendChartCard'
import FixedCostSummaryCard from './cards/FixedCostSummaryCard'

export default function HouseholdDashboard() {
  const { payDay } = useHousehold()
  const periodMonth = currentPayPeriodMonth(payDay)
  const year = currentYear()

  const { transactions, loading: txLoading } = useMonthlyData(periodMonth, payDay ?? undefined)
  const { budgets, loading: budgetLoading } = useBudget(periodMonth)
  const { categories } = useCategories()
  const { monthData, loading: annualLoading } = useAnnualData(year)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <IncomeExpenseSummaryCard
        transactions={transactions}
        loading={txLoading}
        periodMonth={periodMonth}
      />
      <BudgetProgressCard
        transactions={transactions}
        budgets={budgets}
        categories={categories}
        loading={txLoading || budgetLoading}
        periodMonth={periodMonth}
      />
      <TrendChartCard
        monthData={monthData}
        categories={categories}
        loading={annualLoading}
        year={year}
      />
      <FixedCostSummaryCard year={year} />
    </div>
  )
}
```

---

## 8. カード実装

### 8.1 今月の収支サマリー（`cards/IncomeExpenseSummaryCard.tsx`・全文）

```tsx
import { useMemo } from 'react'
import type { Transaction } from '../../../types'
import DashboardCard from '../DashboardCard'

interface Props {
  transactions: Transaction[]
  loading: boolean
  periodMonth: string  // "yyyy-MM"
}

const yen = (n: number) => `¥${n.toLocaleString()}`

export default function IncomeExpenseSummaryCard({ transactions, loading, periodMonth }: Props) {
  const { income, expense, balance } = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expense, balance: income - expense }
  }, [transactions])

  return (
    <DashboardCard title="今月の収支" to={`/months/${periodMonth}`}>
      {loading ? (
        <div className="h-24 flex items-center justify-center text-gray-400 text-sm">読み込み中…</div>
      ) : (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-500 mb-1">収入</p>
            <p className="text-lg font-bold text-sage-600">{yen(income)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">支出</p>
            <p className="text-lg font-bold text-rose-500">{yen(expense)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">収支</p>
            <p className={`text-lg font-bold ${balance >= 0 ? 'text-gray-800' : 'text-rose-500'}`}>
              {yen(balance)}
            </p>
          </div>
        </div>
      )}
    </DashboardCard>
  )
}
```

> カラークラス（`text-rose-500` 等）は既存で使用実績のあるものに合わせること。月別収支画面の収入＝sage、支出＝rose/red の使い分けを確認して統一する。

### 8.2 予算消化状況（`cards/BudgetProgressCard.tsx`・全文）

```tsx
import { useMemo } from 'react'
import type { BudgetMap, Category, Transaction } from '../../../types'
import DashboardCard from '../DashboardCard'

interface Props {
  transactions: Transaction[]
  budgets: BudgetMap
  categories: Category[]
  loading: boolean
  periodMonth: string
}

const TOP_N = 5
const yen = (n: number) => `¥${n.toLocaleString()}`

export default function BudgetProgressCard({ transactions, budgets, categories, loading, periodMonth }: Props) {
  const rows = useMemo(() => {
    const expenseByCat = new Map<string, number>()
    for (const t of transactions) {
      if (t.type === 'expense') {
        expenseByCat.set(t.categoryId, (expenseByCat.get(t.categoryId) ?? 0) + t.amount)
      }
    }
    return categories
      .filter(c => c.type === 'expense' && (budgets[c.id] ?? 0) > 0)
      .map(c => {
        const budget = budgets[c.id]
        const actual = expenseByCat.get(c.id) ?? 0
        return { id: c.id, name: c.name, color: c.color, budget, actual, rate: actual / budget }
      })
      .sort((a, b) => b.rate - a.rate)
      .slice(0, TOP_N)
  }, [transactions, budgets, categories])

  return (
    <DashboardCard title="予算消化状況" to={`/budget/${periodMonth}`}>
      {loading ? (
        <div className="h-24 flex items-center justify-center text-gray-400 text-sm">読み込み中…</div>
      ) : rows.length === 0 ? (
        <div className="h-24 flex items-center justify-center text-gray-400 text-sm">予算が未設定です</div>
      ) : (
        <ul className="space-y-2">
          {rows.map(r => {
            const pct = Math.min(100, Math.round(r.rate * 100))
            const over = r.actual > r.budget
            return (
              <li key={r.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-700">{r.name}</span>
                  <span className={over ? 'text-rose-500 font-semibold' : 'text-gray-500'}>
                    {yen(r.actual)} / {yen(r.budget)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${over ? 'bg-rose-400' : 'bg-sage-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </DashboardCard>
  )
}
```

### 8.3 収支推移グラフ（`cards/TrendChartCard.tsx`・全文）

```tsx
import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import '../../../lib/chart'
import type { Category, Transaction } from '../../../types'
import DashboardCard from '../DashboardCard'

interface Props {
  monthData: Record<string, Transaction[]>  // "yyyy-MM" → transactions
  categories: Category[]                      // 予約（将来カテゴリ別表示用）。未使用なら省略可
  loading: boolean
  year: number
}

export default function TrendChartCard({ monthData, loading, year }: Props) {
  const { labels, incomes, expenses } = useMemo(() => {
    const labels: string[] = []
    const incomes: number[] = []
    const expenses: number[] = []
    for (let m = 1; m <= 12; m++) {
      const ym = `${year}-${String(m).padStart(2, '0')}`
      const txs = monthData[ym] ?? []
      labels.push(`${m}月`)
      incomes.push(txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))
      expenses.push(txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))
    }
    return { labels, incomes, expenses }
  }, [monthData, year])

  const hasData = incomes.some(v => v > 0) || expenses.some(v => v > 0)

  const data = {
    labels,
    datasets: [
      { label: '収入', data: incomes, backgroundColor: '#7ba889' },
      { label: '支出', data: expenses, backgroundColor: '#e5848a' },
    ],
  }

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { ticks: { callback: v => `¥${Number(v).toLocaleString()}` } },
    },
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
    },
  }

  return (
    <DashboardCard title={`収支推移（${year}年）`} to="/annual" className="lg:col-span-2">
      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">読み込み中…</div>
      ) : hasData ? (
        <div className="h-64"><Bar data={data} options={options} /></div>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">データがありません</div>
      )}
    </DashboardCard>
  )
}
```

> 色（`#7ba889` / `#e5848a`）は仮。`tailwind.config` の sage/rose 系の実値か、既存グラフの配色に合わせること。`categories` を使わない場合は props から外して lint 未使用警告を回避する。

### 8.4 当月の固定費（`cards/FixedCostSummaryCard.tsx`・全文）

```tsx
import { useEffect, useState } from 'react'
import { useHousehold } from '../../../hooks/useHousehold'
import { fetchFixedCosts } from '../../../firebase/firestore'
import { isApplicableThisMonth } from '../../../utils/fixedCost'
import type { FixedCost } from '../../../types'
import DashboardCard from '../DashboardCard'

interface Props {
  year: number
}

const yen = (n: number) => `¥${n.toLocaleString()}`

export default function FixedCostSummaryCard({ year }: Props) {
  const { householdId } = useHousehold()
  const [costs, setCosts] = useState<FixedCost[]>([])
  const [loading, setLoading] = useState(true)
  const month = new Date().getMonth() + 1

  useEffect(() => {
    if (!householdId) return
    let active = true
    setLoading(true)
    fetchFixedCosts(householdId)
      .then(data => { if (active) setCosts(data) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [householdId])

  const applicable = costs.filter(c => isApplicableThisMonth(c, year, month))
  const total = applicable.reduce((s, c) => s + c.amount, 0)

  return (
    <DashboardCard title="当月の固定費" to="/fixed-costs">
      {loading ? (
        <div className="h-24 flex items-center justify-center text-gray-400 text-sm">読み込み中…</div>
      ) : applicable.length === 0 ? (
        <div className="h-24 flex items-center justify-center text-gray-400 text-sm">当月の固定費はありません</div>
      ) : (
        <div className="text-center py-2">
          <p className="text-2xl font-bold text-gray-800">{yen(total)}</p>
          <p className="text-xs text-gray-500 mt-1">{month}月の固定費 {applicable.length}件</p>
        </div>
      )}
    </DashboardCard>
  )
}
```

> `fetchFixedCosts` の正確なシグネチャ（引数・戻り値型）は `src/firebase/firestore.ts` を確認して合わせること。`isApplicableThisMonth(cost, year, month)` の引数順は `utils/fixedCost.ts` の定義どおり。

---

## 9. サイドバー変更（`src/components/Sidebar.tsx`）

「家計管理」グループ見出しの**直前**に、ダッシュボードへのリンクを追加する。

### 9.1 active 判定追加（既存 `isXxxActive` 群の近く）

```typescript
const isDashboardActive = location.pathname === '/dashboard'
```

### 9.2 リンク追加（`<nav>` 内、最初の `<li>家計管理</li>` の前）

```tsx
<Link to="/dashboard" className={navItemClass(isDashboardActive)}>
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
  ダッシュボード
</Link>
```

> Sidebar 自体が `Layout.tsx` で `hidden md:flex` 配下のため、モバイルには出ない（BottomNav には追加しない）。

---

## 10. 設定画面変更（`src/pages/HouseholdSettingsPage.tsx`）

「表示設定」カードを 1 つ追加する（PC 専用設定であることを明記）。localStorage を直接読み書きする小さなトグル。

### 10.1 import 追加

```typescript
import { getDashboardAsHome, setDashboardAsHome } from '../utils/homePreference'
```

### 10.2 state 追加

```typescript
const [dashHome, setDashHome] = useState(getDashboardAsHome())
```

### 10.3 カード追加（既存カード群の `space-y` コンテナ内、任意の位置）

```tsx
<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-6">
  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">表示設定（PC）</h2>
  <label className="flex items-center justify-between gap-3">
    <span className="text-sm text-gray-700">
      PCのトップにダッシュボードを表示する
      <span className="block text-xs text-gray-400 mt-0.5">オフの場合は月別収支を表示します</span>
    </span>
    <input
      type="checkbox"
      checked={dashHome}
      onChange={e => { setDashHome(e.target.checked); setDashboardAsHome(e.target.checked) }}
      className="w-5 h-5 accent-sage-600 shrink-0"
    />
  </label>
</div>
```

> 既存のトグル UI（あれば）を流用してデザインを統一する。チェックボックスより既存のスイッチ様式があればそれに合わせること。

---

## 11. バージョン更新

```typescript
// src/constants/version.ts
export const APP_VERSION = '1.0600'
```

```json
// package.json
"version": "1.0600"
```

---

## 12. テストケース（`*.test.ts(x)` / vitest）

ロジック中心に最小限のユニットテストを追加する。

| 対象 | ケース |
|---|---|
| `homePreference` | `get` 初期値 false / `set(true)`→`get` true / localStorage 例外時に false を返す（localStorage を mock して throw） |
| 収支集計（サマリー） | 収入・支出混在の配列で income/expense/balance が正しい / 空配列で全 0 |
| 予算消化集計 | 予算>0 のカテゴリのみ抽出・rate 降順・上位 N 件 / actual>budget で over フラグ相当（pct=100 にクランプ）/ 予算 0 件で空配列 |
| 固定費集計 | `isApplicableThisMonth` による当月抽出と合計（monthly/yearly のサンプルで検証） |

> 集計ロジックはカードコンポーネント内 `useMemo` に閉じているとテストしにくい。**純関数として `src/features/dashboard/dashboardUtils.ts` に切り出す**ことを推奨（`summarizeIncomeExpense(txs)`, `buildBudgetRows(txs, budgets, cats, topN)`, `sumApplicableFixedCosts(costs, year, month)`）。各カードはそれを呼ぶだけにすると、テスト容易性とコンポーネント簡潔さが両立する。

### 12.1 推奨：`dashboardUtils.ts` の関数シグネチャ

```typescript
export function summarizeIncomeExpense(txs: Transaction[]): { income: number; expense: number; balance: number }
export function buildBudgetRows(txs: Transaction[], budgets: BudgetMap, cats: Category[], topN: number):
  { id: string; name: string; color: string; budget: number; actual: number; rate: number }[]
export function sumApplicableFixedCosts(costs: FixedCost[], year: number, month: number):
  { total: number; count: number }
```

各カードの `useMemo` はこれらを呼ぶ形にリファクタする。

---

## 13. 検証手順（実装後）

1. `npm run lint` → 警告 0
2. `npx tsc -b` → 型エラー 0
3. `npm test` → 全 pass
4. `npm run dev` で起動し、デスクトップ幅で以下を確認：
   - サイドバーに「ダッシュボード」表示、クリックで `/dashboard?view=household`（or `/dashboard`）へ
   - 4 カードが表示され、各「詳細 ›」リンクで対応画面へ遷移
   - タブの「資産／生活／ライフプラン」が「準備中」で押せない
   - 設定 →「PCのトップにダッシュボードを表示する」ON → トップ `/` 再読込でダッシュボードが出る、OFF で月別収支
5. ブラウザを `md` 未満（DevTools のモバイル幅）にして `/dashboard` に直アクセス → 月別収支へリダイレクト
6. ゲストモードでダッシュボードが破綻なく表示される（データはサンプル）

---

## 14. チェックリスト

- [ ] `DashboardView` 型を追加した
- [ ] `homePreference.ts` を追加（try/catch でガード）
- [ ] `dashboardUtils.ts` に集計純関数を切り出した
- [ ] `DashboardPage` でモバイルガード（`/months/:current` へリダイレクト）
- [ ] タブは household のみ活性、他は disabled＋「準備中」、`?view` フォールバック
- [ ] 4 カード（収支サマリー／予算消化／収支推移／固定費）を実装
- [ ] 各カードにローディング・空状態を実装
- [ ] サマリー・予算は給与日起算、推移はカレンダー月
- [ ] サイドバーに「ダッシュボード」追加（家計管理グループの前）
- [ ] `App.tsx` に `/dashboard` 追加＋トップ `/` を `RootRedirect` に変更
- [ ] 設定画面に「表示設定（PC）」カード追加（localStorage 連動）
- [ ] `version.ts` / `package.json` を `1.0600` に更新
- [ ] ユニットテスト追加（homePreference / 集計 3 種）
- [ ] 品質ゲート（lint 0 / tsc 0 / test pass）通過
- [ ] デスクトップ／モバイル幅の動作確認

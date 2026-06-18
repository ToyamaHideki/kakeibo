import { Fragment, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import type { OutletContext } from '../components/Layout'
import GhostLoader from '../components/GhostLoader'
import { useAnnualData } from '../hooks/useAnnualData'
import { getAnnualCollapsedCategoryIds, setAnnualCollapsedCategoryIds } from '../utils/annualPrefs'
import type { Category, PaymentMethod } from '../types'

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

function fmt(n: number): string {
  return n === 0 ? '-' : n.toLocaleString()
}

function fmtSigned(n: number): string {
  if (n === 0) return '-'
  return n > 0 ? `+${n.toLocaleString()}` : n.toLocaleString()
}

// 月のセルの基本スタイル
const cellBase = 'px-2 py-2 text-right text-xs tabular-nums whitespace-nowrap w-16'

// 左固定列の基本スタイル
const stickyLeft = 'sticky left-0 z-10 px-3 py-2 text-xs whitespace-nowrap border-r'

// 右固定列（年間合計）の基本スタイル（text-center で中央揃え）
const stickyRight = 'sticky right-0 z-10 border-l-2 px-2 py-2 text-center text-xs tabular-nums whitespace-nowrap'

export default function AnnualPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set(getAnnualCollapsedCategoryIds()))
  const { categories, paymentMethods } = useOutletContext<OutletContext>()
  const { monthData, loading } = useAnnualData(year)
  const navigate = useNavigate()

  function toggleCategoryCollapsed(categoryId: string) {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      setAnnualCollapsedCategoryIds([...next])
      return next
    })
  }

  const months = Array.from({ length: 12 }, (_, i) =>
    `${year}-${String(i + 1).padStart(2, '0')}`
  )

  const allTransactions = Object.values(monthData).flat()

  const incomeCategories = categories
    .filter(c => c.type === 'income')
    .sort((a, b) => a.order - b.order)

  const fixedCategories = categories
    .filter(c => c.type === 'expense' && c.expenseType === 'fixed')
    .sort((a, b) => a.order - b.order)

  const variableCategories = categories
    .filter(c => c.type === 'expense' && c.expenseType !== 'fixed')
    .sort((a, b) => a.order - b.order)

  function getAmount(yearMonth: string, categoryId: string, paymentMethodId?: string): number {
    const txs = monthData[yearMonth] ?? []
    return txs
      .filter(t =>
        t.categoryId === categoryId &&
        (!paymentMethodId || t.paymentMethodId === paymentMethodId)
      )
      .reduce((sum, t) => sum + t.amount, 0)
  }

  function getCategoryAnnualTotal(categoryId: string, paymentMethodId?: string): number {
    return months.reduce((sum, m) => sum + getAmount(m, categoryId, paymentMethodId), 0)
  }

  function getSectionMonthTotal(yearMonth: string, cats: Category[]): number {
    return cats.reduce((sum, c) => sum + getAmount(yearMonth, c.id), 0)
  }

  function getSectionAnnualTotal(cats: Category[]): number {
    return months.reduce((sum, m) => sum + getSectionMonthTotal(m, cats), 0)
  }

  function getUsedPaymentMethods(categoryId: string): PaymentMethod[] {
    const usedIds = new Set<string>()
    allTransactions.forEach(t => {
      if (t.categoryId === categoryId && t.paymentMethodId) {
        usedIds.add(t.paymentMethodId)
      }
    })
    return paymentMethods
      .filter(pm => usedIds.has(pm.id))
      .sort((a, b) => a.order - b.order)
  }

  const incomeTotals = months.map(m => getSectionMonthTotal(m, incomeCategories))
  const fixedTotals = months.map(m => getSectionMonthTotal(m, fixedCategories))
  const variableTotals = months.map(m => getSectionMonthTotal(m, variableCategories))
  // months と同じ長さで map しているため、同一 index の要素は必ず存在する
  const expenseTotals = months.map((_, i) => fixedTotals[i]! + variableTotals[i]!)
  const disposables = months.map((_, i) => incomeTotals[i]! - fixedTotals[i]!)
  const remainings = months.map((_, i) => disposables[i]! - variableTotals[i]!)
  const balances = months.map((_, i) => incomeTotals[i]! - expenseTotals[i]!)

  const annualIncome = getSectionAnnualTotal(incomeCategories)
  const annualFixed = getSectionAnnualTotal(fixedCategories)
  const annualVariable = getSectionAnnualTotal(variableCategories)
  const annualExpense = annualFixed + annualVariable
  const annualDisposable = annualIncome - annualFixed
  const annualRemaining = annualDisposable - annualVariable
  const annualBalance = annualIncome - annualExpense

  // カテゴリ行（固定費・変動費・収入共通。amountColor で金額の色を制御）
  function renderCategoryRows(
    cats: Category[],
    amountColor: (v: number) => string,
  ) {
    return cats.map(cat => {
      const usedPms = getUsedPaymentMethods(cat.id)
      const showSubs = usedPms.length >= 2
      const isExpanded = !collapsedIds.has(cat.id)
      const annual = getCategoryAnnualTotal(cat.id)
      return (
        <Fragment key={cat.id}>
          {/* カテゴリ行 */}
          <tr className="border-b border-gray-50">
            <td className={`${stickyLeft} bg-white font-medium text-gray-700 border-gray-100`}>
              <span className="flex items-center gap-1.5">
                {showSubs ? (
                  <button
                    type="button"
                    onClick={() => toggleCategoryCollapsed(cat.id)}
                    className="shrink-0 w-4 h-4 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    aria-label={isExpanded ? '支払い方法内訳を折りたたむ' : '支払い方法内訳を展開'}
                    title={isExpanded ? '内訳を隠す' : '内訳を表示'}
                  >
                    <svg
                      className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                ) : (
                  <span className="w-4 h-4 shrink-0" />
                )}
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                {cat.name}
              </span>
            </td>
            {months.map(m => {
              const v = getAmount(m, cat.id)
              return (
                <td key={m} className={`${cellBase} ${amountColor(v)}`}>
                  {fmt(v)}
                </td>
              )
            })}
            <td className={`${stickyRight} bg-white border-gray-200 font-semibold ${amountColor(annual)}`}>
              {fmt(annual)}
            </td>
          </tr>
          {/* 支払い方法サブ行（2種類以上かつ展開中のみ表示） */}
          {showSubs && isExpanded && usedPms.map(pm => {
            const pmAnnual = getCategoryAnnualTotal(cat.id, pm.id)
            return (
              <tr key={`${cat.id}-${pm.id}`} className="border-b border-gray-50">
                {/* 不透明な背景色を表示してスクロール時の重なりを防ぐ */}
                <td className={`${stickyLeft} bg-gray-50 text-gray-500 border-gray-100 pl-8`}>
                  └ {pm.name}
                </td>
                {months.map(m => {
                  const v = getAmount(m, cat.id, pm.id)
                  return (
                    <td key={m} className={`${cellBase} text-[11px] ${v > 0 ? 'text-gray-500' : 'text-gray-200'}`}>
                      {fmt(v)}
                    </td>
                  )
                })}
                <td className={`${stickyRight} bg-gray-50 border-gray-200 text-[11px] ${pmAnnual > 0 ? 'text-gray-500' : 'text-gray-200'}`}>
                  {fmt(pmAnnual)}
                </td>
              </tr>
            )
          })}
        </Fragment>
      )
    })
  }

  // セクションヘッダー行（左右の sticky セルと中間の空セルで構成）
  function SectionHeader({ label, bg, textColor, borderColor }: {
    label: string
    bg: string
    textColor: string
    borderColor: string
  }) {
    return (
      <tr>
        <td className={`sticky left-0 z-10 ${bg} px-3 py-1.5 text-xs font-bold ${textColor} border-r ${borderColor}`}>
          {label}
        </td>
        {Array.from({ length: 12 }).map((_, i) => (
          <td key={i} className={bg} />
        ))}
        <td className={`sticky right-0 z-10 ${bg} border-l-2 ${borderColor}`} />
      </tr>
    )
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-hidden">
      {/* 年ナビゲーション */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <button
          onClick={() => setYear(y => y - 1)}
          aria-label="前の年"
          className="p-2 rounded-lg text-gray-500 hover:bg-white hover:shadow-sm transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-gray-800">{year}年</h2>
        <button
          onClick={() => setYear(y => y + 1)}
          aria-label="次の年"
          className="p-2 rounded-lg text-gray-500 hover:bg-white hover:shadow-sm transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center"><GhostLoader label="読み込み中..." /></div>
      ) : (
        <div className="flex-1 overflow-auto min-h-0 rounded-xl shadow-sm border border-gray-200">
          <table
            className="border-collapse bg-white text-sm w-full table-fixed [&_th]:border [&_th]:border-gray-200 [&_td]:border [&_td]:border-gray-200"
            style={{ minWidth: '960px' }}
          >
            <colgroup>
              <col style={{ width: '140px' }} />
              {Array.from({ length: 12 }).map((_, i) => <col key={i} />)}
              <col style={{ width: '80px' }} />
            </colgroup>
            {/* テーブルヘッダー */}
            <thead>
              <tr className="bg-amber-50 border-b-2 border-amber-200">
                <th className="sticky left-0 top-0 z-30 bg-amber-50 px-3 py-2.5 text-xs font-bold text-gray-600 text-left whitespace-nowrap border-r border-amber-200 min-w-[140px]">
                  費目名
                </th>
                {MONTH_LABELS.map((label, i) => (
                  <th key={label} className="sticky top-0 z-20 bg-amber-50 w-16 px-2 py-2.5 text-xs font-bold text-gray-600 text-center whitespace-nowrap">
                    <button
                      onClick={() => navigate(`/months/${months[i]}`)}
                      className="hover:text-sage-600 transition-colors"
                    >
                      {label}
                    </button>
                  </th>
                ))}
                <th className="sticky right-0 top-0 z-30 bg-amber-50 w-20 px-2 py-2.5 text-xs font-bold text-gray-600 text-center whitespace-nowrap border-l-2 border-amber-200">
                  年間合計
                </th>
              </tr>
            </thead>

            <tbody>
              {/* ── 収入 ── */}
              <SectionHeader
                label="収入（手取り）"
                bg="bg-sage-50"
                textColor="text-sage-700"
                borderColor="border-sage-100"
              />
              {renderCategoryRows(
                incomeCategories,
                v => v > 0 ? 'text-sage-700' : 'text-gray-300',
              )}

              {/* ① 収入合計 */}
              <tr className="bg-amber-100 border-y-2 border-amber-300">
                <td className={`${stickyLeft} bg-amber-100 font-bold text-amber-800 border-amber-300`}>
                  ① 収入合計
                </td>
                {incomeTotals.map((v, i) => (
                  <td key={i} className={`${cellBase} font-bold ${v > 0 ? 'text-sage-700' : 'text-gray-300'}`}>
                    {fmt(v)}
                  </td>
                ))}
                <td className={`${stickyRight} bg-amber-100 border-amber-300 font-bold ${annualIncome > 0 ? 'text-sage-700' : 'text-gray-300'}`}>
                  {fmt(annualIncome)}
                </td>
              </tr>

              {/* ── 固定費 ── */}
              <SectionHeader
                label="固定費"
                bg="bg-terracotta-50"
                textColor="text-terracotta-600"
                borderColor="border-terracotta-100"
              />
              {renderCategoryRows(
                fixedCategories,
                v => v > 0 ? 'text-gray-700' : 'text-gray-300',
              )}

              {/* ② 固定費合計 */}
              <tr className="bg-terracotta-100 border-y-2 border-terracotta-300">
                <td className={`${stickyLeft} bg-terracotta-100 font-bold text-terracotta-700 border-terracotta-300`}>
                  ② 固定費合計
                </td>
                {fixedTotals.map((v, i) => (
                  <td key={i} className={`${cellBase} font-bold ${v > 0 ? 'text-terracotta-600' : 'text-gray-300'}`}>
                    {fmt(v)}
                  </td>
                ))}
                <td className={`${stickyRight} bg-terracotta-100 border-terracotta-300 font-bold ${annualFixed > 0 ? 'text-terracotta-600' : 'text-gray-300'}`}>
                  {fmt(annualFixed)}
                </td>
              </tr>

              {/* ③（①-②） */}
              <tr className="bg-orange-50 border-y border-orange-200">
                <td className={`${stickyLeft} bg-orange-50 font-bold text-orange-700 border-orange-200`}>
                  ③（①-②）
                </td>
                {disposables.map((v, i) => (
                  <td key={i} className={`${cellBase} font-semibold ${v > 0 ? 'text-orange-600' : v < 0 ? 'text-terracotta-500' : 'text-gray-300'}`}>
                    {fmtSigned(v)}
                  </td>
                ))}
                <td className={`${stickyRight} bg-orange-50 border-orange-200 font-semibold ${annualDisposable > 0 ? 'text-orange-600' : annualDisposable < 0 ? 'text-terracotta-500' : 'text-gray-300'}`}>
                  {fmtSigned(annualDisposable)}
                </td>
              </tr>

              {/* ── 変動費 ── */}
              <SectionHeader
                label="変動費"
                bg="bg-teal-50"
                textColor="text-teal-600"
                borderColor="border-blue-100"
              />
              {renderCategoryRows(
                variableCategories,
                v => v > 0 ? 'text-gray-700' : 'text-gray-300',
              )}

              {/* ④ 変動費合計 */}
              <tr className="bg-teal-100 border-y-2 border-teal-300">
                <td className={`${stickyLeft} bg-teal-100 font-bold text-teal-700 border-teal-300`}>
                  ④ 変動費合計
                </td>
                {variableTotals.map((v, i) => (
                  <td key={i} className={`${cellBase} font-bold ${v > 0 ? 'text-teal-700' : 'text-gray-300'}`}>
                    {fmt(v)}
                  </td>
                ))}
                <td className={`${stickyRight} bg-teal-100 border-teal-300 font-bold ${annualVariable > 0 ? 'text-teal-700' : 'text-gray-300'}`}>
                  {fmt(annualVariable)}
                </td>
              </tr>

              {/* ⑤ やりくり費（③-④） */}
              <tr className="bg-orange-100 border-y-2 border-orange-300">
                <td className={`${stickyLeft} bg-orange-100 font-bold text-orange-800 border-orange-300`}>
                  ⑤ やりくり費（③-④）
                </td>
                {remainings.map((v, i) => (
                  <td key={i} className={`${cellBase} font-bold ${v > 0 ? 'text-orange-700' : v < 0 ? 'text-terracotta-500' : 'text-gray-300'}`}>
                    {fmtSigned(v)}
                  </td>
                ))}
                <td className={`${stickyRight} bg-orange-100 border-orange-300 font-bold ${annualRemaining > 0 ? 'text-orange-700' : annualRemaining < 0 ? 'text-terracotta-500' : 'text-gray-300'}`}>
                  {fmtSigned(annualRemaining)}
                </td>
              </tr>

              {/* 支出合計 */}
              <tr className="bg-gray-100 border-y border-gray-300">
                <td className={`${stickyLeft} bg-gray-100 font-bold text-gray-600 border-gray-300`}>
                  支出合計（②+④）
                </td>
                {expenseTotals.map((v, i) => (
                  <td key={i} className={`${cellBase} font-bold ${v > 0 ? 'text-terracotta-600' : 'text-gray-300'}`}>
                    {fmt(v)}
                  </td>
                ))}
                <td className={`${stickyRight} bg-gray-100 border-gray-300 font-bold ${annualExpense > 0 ? 'text-terracotta-600' : 'text-gray-300'}`}>
                  {fmt(annualExpense)}
                </td>
              </tr>

              {/* 収支合計 */}
              <tr className="bg-amber-200 border-y-2 border-amber-400">
                <td className={`${stickyLeft} bg-amber-200 font-bold text-amber-900 border-amber-400`}>
                  収支合計（①-支出合計）
                </td>
                {balances.map((v, i) => (
                  <td key={i} className={`${cellBase} font-bold ${v > 0 ? 'text-sage-600' : v < 0 ? 'text-terracotta-600' : 'text-gray-300'}`}>
                    {fmtSigned(v)}
                  </td>
                ))}
                <td className={`${stickyRight} bg-amber-200 border-amber-400 font-bold ${annualBalance > 0 ? 'text-sage-600' : annualBalance < 0 ? 'text-terracotta-600' : 'text-gray-300'}`}>
                  {fmtSigned(annualBalance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

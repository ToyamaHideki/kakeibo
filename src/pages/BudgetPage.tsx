import { useCallback, useMemo, useState, type FocusEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCategories } from '../hooks/useCategories'
import { useMonthlyData } from '../hooks/useMonthlyData'
import { useBudget } from '../hooks/useBudget'
import { useHousehold } from '../hooks/useHousehold'
import { copyBudgetFromPrevious, updateCategory } from '../firebase/firestore'
import GhostLoader from '../components/GhostLoader'
import { adjacentMonth, formatYearMonth, formatPayPeriodLabel } from '../utils/date'
import { formatYen } from '../utils/format'
import type { Category } from '../types'

// ─── アイコン ──────────────────────────────────────────────────────────────────

function GripIcon() {
  return (
    <svg viewBox="0 0 8 14" width="10" height="14" fill="currentColor">
      <circle cx="2" cy="2"  r="1.2" /><circle cx="6" cy="2"  r="1.2" />
      <circle cx="2" cy="7"  r="1.2" /><circle cx="6" cy="7"  r="1.2" />
      <circle cx="2" cy="12" r="1.2" /><circle cx="6" cy="12" r="1.2" />
    </svg>
  )
}

// ─── プログレスバー ────────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100)
  const isOver = pct > 100
  const color = isOver ? 'bg-red-400' : pct >= 80 ? 'bg-orange-400' : 'bg-sage-500'

  return (
    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

// ─── グループヘッダー ──────────────────────────────────────────────────────────

function GroupSection({
  title,
  accent,
  count,
  children,
}: {
  title: string
  accent: 'sage' | 'gray'
  count: number
  children: React.ReactNode
}) {
  const accentClass = accent === 'sage' ? 'text-sage-700' : 'text-gray-500'
  return (
    <section className="mb-4">
      <h2 className={`text-xs font-semibold uppercase tracking-wide mb-2 px-1 ${accentClass}`}>
        {title} <span className="ml-1 text-gray-400 font-normal normal-case">({count})</span>
      </h2>
      {children}
    </section>
  )
}

// ─── 予算カードの内側コンテンツ ────────────────────────────────────────────────

interface BudgetCardInnerProps {
  cat: Category
  actual: number
  budget: number
  inputValue: string
  disabled?: boolean
  onInputChange: (categoryId: string, value: string) => void
  onBlur: (e: FocusEvent<HTMLInputElement>, categoryId: string) => void
}

function BudgetCardInner({
  cat,
  actual,
  budget,
  inputValue,
  disabled = false,
  onInputChange,
  onBlur,
}: BudgetCardInnerProps) {
  const pct = budget > 0 ? Math.round((actual / budget) * 100) : null
  const isOver = pct !== null && pct > 100

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: cat.color }}
        />
        <span className="flex-1 text-sm font-medium text-gray-800">{cat.name}</span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">予算</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={inputValue}
            onChange={e => onInputChange(cat.id, e.target.value)}
            onBlur={e => onBlur(e, cat.id)}
            placeholder="未設定"
            disabled={disabled}
            className="w-24 px-2 py-1 text-right text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 text-gray-800 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <span className="text-xs text-gray-500">円</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-1.5 text-xs text-gray-500">
        <span>
          <span className={`font-medium ${isOver ? 'text-red-500' : 'text-gray-700'}`}>{formatYen(actual)}</span>
          {budget > 0 && <span className="text-gray-500"> / {formatYen(budget)}</span>}
        </span>
        {pct !== null && (
          <span className={`font-semibold ${isOver ? 'text-red-500' : pct >= 80 ? 'text-orange-500' : 'text-gray-600'}`}>
            {pct}%
          </span>
        )}
      </div>

      {budget > 0 ? (
        <ProgressBar pct={pct ?? 0} />
      ) : (
        <div className="h-1.5 rounded-full bg-gray-100" />
      )}
    </div>
  )
}

// ─── 通常カード ────────────────────────────────────────────────────────────────

type BudgetCardProps = BudgetCardInnerProps

function BudgetCard(props: BudgetCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
      <BudgetCardInner {...props} />
    </div>
  )
}

// ─── ソータブルカード（並べ替えモード用） ──────────────────────────────────────

function SortableBudgetCard(props: BudgetCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.cat.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 touch-none"
        tabIndex={-1}
        aria-label="並び替え"
      >
        <GripIcon />
      </button>
      <BudgetCardInner {...props} disabled />
    </div>
  )
}

// ─── カテゴリリスト（通常 / 並べ替えモード切替） ───────────────────────────────

interface CategoryListProps extends Omit<BudgetCardInnerProps, 'cat' | 'actual' | 'budget' | 'inputValue'> {
  cats: Category[]
  isReordering: boolean
  actualByCategory: Record<string, number>
  budgets: Record<string, number>
  getBudgetInputValue: (categoryId: string) => string
  onDragEnd: (event: DragEndEvent) => void
}

function CategoryListOrGrid({
  cats,
  isReordering,
  onDragEnd,
  actualByCategory,
  budgets,
  getBudgetInputValue,
  onInputChange,
  onBlur,
}: CategoryListProps) {
  if (isReordering) {
    return (
      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={cats.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {cats.map(cat => (
              <SortableBudgetCard
                key={cat.id}
                cat={cat}
                actual={actualByCategory[cat.id] ?? 0}
                budget={budgets[cat.id] ?? 0}
                inputValue={getBudgetInputValue(cat.id)}
                onInputChange={onInputChange}
                onBlur={onBlur}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pb-2">
      {cats.map(cat => (
        <BudgetCard
          key={cat.id}
          cat={cat}
          actual={actualByCategory[cat.id] ?? 0}
          budget={budgets[cat.id] ?? 0}
          inputValue={getBudgetInputValue(cat.id)}
          onInputChange={onInputChange}
          onBlur={onBlur}
        />
      ))}
    </div>
  )
}

// ─── メインコンポーネント ──────────────────────────────────────────────────────

export default function BudgetPage() {
  const { yearMonth = '' } = useParams<{ yearMonth: string }>()
  const navigate = useNavigate()
  const { payDay, householdId } = useHousehold()

  const { categories, loading: catLoading, reload: reloadCategories } = useCategories()
  const { transactions, loading: txLoading } = useMonthlyData(yearMonth, payDay ?? undefined)
  const { budgets, loading: budgetLoading, saveBudgetAmount, reload: reloadBudgets } = useBudget(yearMonth)
  const periodLabel = payDay ? formatPayPeriodLabel(yearMonth, payDay) : formatYearMonth(yearMonth)

  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [isReordering, setIsReordering] = useState(false)
  const [copying, setCopying] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const loading = catLoading || txLoading || budgetLoading

  const expenseCategories = useMemo(
    () => categories.filter(c => c.type === 'expense').sort((a, b) => a.order - b.order),
    [categories],
  )

  // カテゴリ別の実際の支出を集計
  const actualByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tx of transactions) {
      if (tx.type === 'expense') {
        map[tx.categoryId] = (map[tx.categoryId] ?? 0) + tx.amount
      }
    }
    return map
  }, [transactions])

  // グルーピング
  const { assignedCats, unassignedCats } = useMemo(() => {
    const a: Category[] = []
    const u: Category[] = []
    for (const c of expenseCategories) {
      if ((budgets[c.id] ?? 0) > 0) a.push(c)
      else u.push(c)
    }
    return { assignedCats: a, unassignedCats: u }
  }, [expenseCategories, budgets])

  function getBudgetInputValue(categoryId: string): string {
    if (editValues[categoryId] !== undefined) return editValues[categoryId]
    const v = budgets[categoryId]
    return v ? String(v) : ''
  }

  function handleInputChange(categoryId: string, value: string) {
    if (value === '' || /^\d+$/.test(value)) {
      setEditValues(prev => ({ ...prev, [categoryId]: value }))
    }
  }

  async function handleBlur(e: FocusEvent<HTMLInputElement>, categoryId: string) {
    const raw = e.target.value.trim()
    const amount = Number(raw)
    setEditValues(prev => {
      const next = { ...prev }
      delete next[categoryId]
      return next
    })
    if (raw === '' || amount <= 0) return
    await saveBudgetAmount(categoryId, amount)
  }

  // 合計
  const totalBudget = expenseCategories.reduce((sum, c) => sum + (budgets[c.id] ?? 0), 0)
  const totalActual = expenseCategories.reduce((sum, c) => sum + (actualByCategory[c.id] ?? 0), 0)
  const totalPct = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : null

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function handleCopyFromPrevious() {
    if (!householdId || copying) return
    setCopying(true)
    try {
      const prevYM = adjacentMonth(yearMonth, -1)
      const count = await copyBudgetFromPrevious(householdId, yearMonth, prevYM)
      await reloadBudgets()
      if (count === 0) {
        showToast('引き継ぐ予算がありません')
      } else {
        showToast(`${count} 件の予算を引き継ぎました`)
      }
    } catch (err) {
      console.warn('[BudgetPage] copy from previous failed:', err)
      showToast('引き継ぎに失敗しました')
    } finally {
      setCopying(false)
    }
  }

  const handleDragEnd = useCallback(async (event: DragEndEvent, group: 'assigned' | 'unassigned') => {
    const { active, over } = event
    if (!over || active.id === over.id || !householdId) return

    const list = group === 'assigned' ? assignedCats : unassignedCats
    const oldIndex = list.findIndex(c => c.id === active.id)
    const newIndex = list.findIndex(c => c.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(list, oldIndex, newIndex)
    const newAssigned = group === 'assigned' ? reordered : assignedCats
    const newUnassigned = group === 'unassigned' ? reordered : unassignedCats

    // 連番採番：assigned は 0..n-1、unassigned は n..n+m-1
    const updates: Promise<void>[] = []
    newAssigned.forEach((c, i) => {
      const next = i * 1000
      if (c.order !== next) updates.push(updateCategory(householdId, c.id, { order: next }))
    })
    newUnassigned.forEach((c, i) => {
      const next = (newAssigned.length + i) * 1000
      if (c.order !== next) updates.push(updateCategory(householdId, c.id, { order: next }))
    })

    await Promise.all(updates)
    await reloadCategories()
  }, [householdId, assignedCats, unassignedCats, reloadCategories])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48"><GhostLoader label="読み込み中..." /></div>
    )
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <h2 className="text-xl font-bold text-gray-800">予算管理</h2>
      </div>

      {/* 月ナビゲーション */}
      <div className="flex items-center justify-center gap-8 mb-3 shrink-0">
        <button
          onClick={() => navigate(`/budget/${adjacentMonth(yearMonth, -1)}`)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-base font-semibold text-gray-800 w-28 text-center">{periodLabel}</span>
        <button
          onClick={() => navigate(`/budget/${adjacentMonth(yearMonth, 1)}`)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* アクションボタン */}
      <div className="flex items-center justify-between gap-2 mb-4 shrink-0">
        <button
          onClick={handleCopyFromPrevious}
          disabled={copying || isReordering}
          className="px-3 py-1.5 bg-white border border-sage-200 text-sage-700 text-xs font-medium rounded-lg hover:bg-sage-50 transition-colors disabled:opacity-50"
        >
          {copying ? '引き継ぎ中...' : '前月の予算を引き継ぐ'}
        </button>
        <button
          onClick={() => setIsReordering(prev => !prev)}
          aria-pressed={isReordering}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            isReordering
              ? 'bg-sage-600 text-white hover:bg-sage-700'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {isReordering ? '完了' : '並べ替え'}
        </button>
      </div>

      {/* 合計サマリー（並べ替えモード時は非表示） */}
      {!isReordering && totalBudget > 0 && (
        <div className="mb-4 px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">支出合計</span>
            <span className={`text-xs font-semibold ${totalPct !== null && totalPct > 100 ? 'text-red-500' : 'text-gray-600'}`}>
              {totalPct !== null ? `${totalPct}%` : ''}
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-800">{formatYen(totalActual)}</span>
            <span className="text-xs text-gray-500">/ {formatYen(totalBudget)}</span>
          </div>
          <ProgressBar pct={totalPct ?? 0} />
        </div>
      )}

      {/* カテゴリリスト */}
      <div className="flex-1 overflow-y-auto">
        {assignedCats.length > 0 && (
          <GroupSection title="予算設定済み" accent="sage" count={assignedCats.length}>
            <CategoryListOrGrid
              cats={assignedCats}
              isReordering={isReordering}
              onDragEnd={e => { void handleDragEnd(e, 'assigned') }}
              actualByCategory={actualByCategory}
              budgets={budgets}
              getBudgetInputValue={getBudgetInputValue}
              onInputChange={handleInputChange}
              onBlur={handleBlur}
            />
          </GroupSection>
        )}
        {unassignedCats.length > 0 && (
          <GroupSection title="予算未設定" accent="gray" count={unassignedCats.length}>
            <CategoryListOrGrid
              cats={unassignedCats}
              isReordering={isReordering}
              onDragEnd={e => { void handleDragEnd(e, 'unassigned') }}
              actualByCategory={actualByCategory}
              budgets={budgets}
              getBudgetInputValue={getBudgetInputValue}
              onInputChange={handleInputChange}
              onBlur={handleBlur}
            />
          </GroupSection>
        )}
      </div>

      {!isReordering && (
        <p className="text-xs text-gray-500 text-center mt-3 shrink-0">
          予算欄に金額を入力してフォーカスを外すと自動保存されます
        </p>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg z-30">
          {toast}
        </div>
      )}
    </div>
  )
}

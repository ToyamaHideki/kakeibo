import { useEffect, useMemo, useState } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { addFixedCost, deleteFixedCost, fetchFixedCosts, updateFixedCost } from '../firebase/firestore'
import { useHousehold } from '../hooks/useHousehold'
import { useContracts } from '../hooks/useContracts'
import { useMemberProfiles } from '../hooks/useMemberProfiles'
import { useConfirm } from '../hooks/useConfirm'
import ConfirmDialog from '../components/ConfirmDialog'
import GhostLoader from '../components/GhostLoader'
import FixedCostModal from '../features/FixedCostModal'
import FixedCostCalendar from '../features/FixedCostCalendar'
import FixedCostDayModal from '../features/FixedCostDayModal'
import { getDaysInMonth, getEffectiveDay, isApplicableThisMonth, FREQ_LABEL } from '../utils/fixedCost'
import { buildFixedItems, type FixedItem } from '../utils/fixedItem'
import { getShowPersonalInFixedCosts } from '../utils/fixedCostsPrefs'
import ContractRow from '../features/ContractRow'
import type { FixedCost } from '../types'

export default function FixedCostsPage() {
  const { householdId } = useHousehold()
  const { contracts } = useContracts()
  const memberNames = useMemberProfiles()
  const [showPersonal] = useState(getShowPersonalInFixedCosts())
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1)
  const [costs, setCosts] = useState<FixedCost[]>([])
  const [loading, setLoading] = useState(true)
  const { confirm, dialogProps } = useConfirm()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<FixedCost | null>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [dayModalOpen, setDayModalOpen] = useState(false)
  // モバイルのみ有効：カレンダー / リストの表示切替（md 以上は常に両方表示）
  const [mobileView, setMobileView] = useState<'calendar' | 'list'>('calendar')

  useEffect(() => {
    if (!householdId) return
    async function load() {
      try {
        const data = await fetchFixedCosts(householdId!)
        setCosts(data.sort((a, b) => a.order - b.order))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [householdId])

  function prevMonth() {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  function openAdd() { setEditTarget(null); setModalOpen(true) }
  function openEdit(cost: FixedCost) { setEditTarget(cost); setModalOpen(true) }

  function openEditFromDay(cost: FixedCost) {
    setDayModalOpen(false)
    openEdit(cost)
  }

  async function handleDeleteFromDay(cost: FixedCost) {
    if (!await confirm('この固定費を削除しますか？')) return
    await handleDelete(cost.id)
    setDayModalOpen(false)
  }

  // 日別モーダルは FixedItem を渡してくるため、固定費のみ元の FixedCost に解決して処理する
  function handleEditItemFromDay(item: FixedItem) {
    if (item.source !== 'fixedCost') return
    const fc = costs.find(c => c.id === item.id)
    if (fc) openEditFromDay(fc)
  }

  function handleDeleteItemFromDay(item: FixedItem) {
    if (item.source !== 'fixedCost') return
    const fc = costs.find(c => c.id === item.id)
    if (fc) void handleDeleteFromDay(fc)
  }

  async function handleSave(data: Omit<FixedCost, 'id' | 'order'>) {
    if (!householdId) return
    if (editTarget) {
      await updateFixedCost(householdId, editTarget.id, data)
      setCosts(prev => prev.map(c => (c.id === editTarget.id ? { ...c, ...data } : c)))
    } else {
      const maxOrder = costs.reduce((max, c) => Math.max(max, c.order), 0)
      const id = await addFixedCost(householdId, { ...data, order: maxOrder + 1 })
      setCosts(prev => [...prev, { id, ...data, order: maxOrder + 1 }].sort((a, b) => a.dayOfMonth - b.dayOfMonth))
    }
  }

  async function handleDelete(id: string) {
    if (!householdId) return
    await deleteFixedCost(householdId, id)
    setCosts(prev => prev.filter(c => c.id !== id))
  }

  async function reorderCosts(newCosts: FixedCost[]) {
    if (!householdId) return
    setCosts(newCosts)
    await Promise.all(
      newCosts.map((cost, idx) => updateFixedCost(householdId!, cost.id, { order: idx * 1000 }))
    )
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    // 表示中（フィルタ後）のリスト内で並べ替え、非表示項目の相対位置は保持する
    const visibleOld = visibleCosts.findIndex(c => c.id === active.id)
    const visibleNew = visibleCosts.findIndex(c => c.id === over.id)
    if (visibleOld === -1 || visibleNew === -1) return
    const reorderedVisible = arrayMove(visibleCosts, visibleOld, visibleNew)
    const visibleIds = new Set(visibleCosts.map(c => c.id))
    const queue = [...reorderedVisible]
    const merged = costs.map(c => (visibleIds.has(c.id) ? queue.shift()! : c))
    reorderCosts(merged)
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)

  // 年/隔年/3年ごとの固定費は登録月のみ表示。monthly は常時表示。
  const visibleCosts = costs.filter(c =>
    (c.frequency ?? 'monthly') === 'monthly' || isApplicableThisMonth(c, viewYear, viewMonth),
  )

  // 固定費＋契約（共有＋設定ONで自分の個人）を正規化して集約
  const items = useMemo(
    () => buildFixedItems(costs, contracts, { includePersonal: showPersonal, memberNames }),
    [costs, contracts, showPersonal, memberNames],
  )
  const contractItems = items.filter(i => i.source === 'contract').sort((a, b) => a.dayOfMonth - b.dayOfMonth)

  const costsByDay = new Map<number, FixedItem[]>()
  for (const item of items) {
    if (!isApplicableThisMonth(item, viewYear, viewMonth)) continue
    const { effectiveDay, overflows } = getEffectiveDay(item.dayOfMonth, viewYear, viewMonth)
    if (!overflows) {
      const arr = costsByDay.get(effectiveDay) ?? []
      arr.push(item)
      costsByDay.set(effectiveDay, arr)
    }
  }

  const applicableItems = items.filter(it => {
    if (it.frequency === 'monthly') return it.dayOfMonth <= daysInMonth
    return isApplicableThisMonth(it, viewYear, viewMonth)
  })
  const monthlyTotal = applicableItems.filter(it => !it.isVariable).reduce((sum, it) => sum + it.amount, 0)
  const variableCount = applicableItems.filter(it => it.isVariable).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48"><GhostLoader label="読み込み中..." /></div>
    )
  }

  const dayModalCosts = selectedDay !== null ? (costsByDay.get(selectedDay) ?? []) : []

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-lg font-bold text-gray-800">固定費一覧</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-sage-600 hover:bg-sage-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          追加
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4 mb-3 shrink-0">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-700">{viewYear}年{viewMonth}月</span>
        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* View toggle (mobile only) */}
      <div className="md:hidden flex gap-1 bg-gray-100 rounded-xl p-1 shrink-0 mb-3">
        {(['calendar', 'list'] as const).map(v => (
          <button
            key={v}
            onClick={() => setMobileView(v)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mobileView === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
            }`}
          >
            {v === 'calendar' ? 'カレンダー' : 'リスト'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row gap-3 md:gap-6">

        {/* 左カラム / モバイル: カレンダー + 合計（モバイルは mobileView=calendar のみ表示）*/}
        <div className={`${mobileView === 'calendar' ? 'flex' : 'hidden'} md:flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto md:w-3/5 md:shrink-0 md:flex-none md:gap-4 md:overflow-y-auto`}>
          <FixedCostCalendar
            viewYear={viewYear}
            viewMonth={viewMonth}
            costsByDay={costsByDay}
            today={today}
            onDayClick={day => { setSelectedDay(day); setDayModalOpen(true) }}
          />

          {/* Monthly total */}
          <div className="px-4 py-3 bg-terracotta-50 rounded-xl shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-terracotta-700">{viewYear}年{viewMonth}月の固定費合計</span>
              <span className="text-base font-bold text-terracotta-700">¥{monthlyTotal.toLocaleString()}</span>
            </div>
            {variableCount > 0 && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-amber-600">変動（金額未確定）</span>
                <span className="text-xs font-semibold text-amber-600">{variableCount}件</span>
              </div>
            )}
          </div>
        </div>

        {/* 右カラム / モバイル: 固定費リスト（D&D対応・モバイルは mobileView=list のみ表示）*/}
        <div className={`${mobileView === 'list' ? 'flex flex-col' : 'hidden'} md:flex md:flex-col flex-1 min-h-0 overflow-y-auto md:flex-1 md:overflow-y-auto md:min-h-0 space-y-4`}>
          {costs.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">固定費が登録されていません</div>
          ) : visibleCosts.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">{viewYear}年{viewMonth}月に発生する固定費はありません</div>
          ) : (
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={visibleCosts.map(c => c.id)} strategy={verticalListSortingStrategy}>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {visibleCosts.map(cost => {
                      const freq = cost.frequency ?? 'monthly'
                      const applicable = isApplicableThisMonth(cost, viewYear, viewMonth)
                      const { effectiveDay, isShifted, overflows } = getEffectiveDay(cost.dayOfMonth, viewYear, viewMonth)
                      const freqLabel = FREQ_LABEL[freq]

                      return (
                        <SortableFixedCostRow
                          key={cost.id}
                          cost={cost}
                          applicable={applicable}
                          effectiveDay={effectiveDay}
                          isShifted={isShifted}
                          overflows={overflows}
                          freqLabel={freqLabel ?? null}
                          onEdit={openEdit}
                          onDelete={async () => { if (await confirm('この固定費を削除しますか？')) await handleDelete(cost.id) }}
                        />
                      )
                    })}
                  </div>
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* 契約（参照のみ） */}
          {contractItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 px-1">契約（参照）</p>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                {contractItems.map(item => (
                  <ContractRow
                    key={item.id}
                    item={item}
                    viewYear={viewYear}
                    viewMonth={viewMonth}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 日別モーダル（モバイルのみ） */}
      {dayModalOpen && selectedDay !== null && (
        <FixedCostDayModal
          day={selectedDay}
          month={viewMonth}
          year={viewYear}
          costs={dayModalCosts}
          onEdit={handleEditItemFromDay}
          onDelete={handleDeleteItemFromDay}
          onClose={() => setDayModalOpen(false)}
        />
      )}

      <FixedCostModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        cost={editTarget}
        onSave={handleSave}
      />
      <ConfirmDialog {...dialogProps} />
    </div>
  )
}

function SortableFixedCostRow({
  cost,
  applicable,
  effectiveDay,
  isShifted,
  overflows,
  freqLabel,
  onEdit,
  onDelete,
}: {
  cost: FixedCost
  applicable: boolean
  effectiveDay: number
  isShifted: boolean
  overflows: boolean
  freqLabel: string | null
  onEdit: (cost: FixedCost) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cost.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-3 ${!applicable ? 'opacity-50' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 touch-none"
        tabIndex={-1}
        aria-label="並び替え"
      >
        <svg viewBox="0 0 8 14" width="10" height="14" fill="currentColor">
          <circle cx="2" cy="2"  r="1.2" /><circle cx="6" cy="2"  r="1.2" />
          <circle cx="2" cy="7"  r="1.2" /><circle cx="6" cy="7"  r="1.2" />
          <circle cx="2" cy="12" r="1.2" /><circle cx="6" cy="12" r="1.2" />
        </svg>
      </button>
      <div className="w-10 shrink-0 text-center">
        {!applicable ? (
          <>
            <span className="text-xs font-bold text-gray-500 block">{cost.month}月</span>
            <span className="text-xs text-gray-500 block leading-none">{cost.dayOfMonth}日</span>
          </>
        ) : overflows ? (
          <>
            <span className="text-sm font-bold text-gray-500">{cost.dayOfMonth}</span>
            <span className="text-xs text-gray-500 block leading-none">日</span>
          </>
        ) : (
          <>
            <span className={`text-sm font-bold ${isShifted ? 'text-amber-600' : 'text-sage-600'}`}>
              {effectiveDay}
            </span>
            <span className="text-xs text-gray-500 block leading-none">
              {isShifted ? '振替' : '日'}
            </span>
          </>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="text-sm font-medium text-gray-800 truncate">{cost.name}</div>
          {freqLabel && (
            <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600">
              {freqLabel}
            </span>
          )}
        </div>
        {cost.paymentMethod && (
          <div className="text-xs text-gray-500 truncate">{cost.paymentMethod}</div>
        )}
        {cost.memo && (
          <div className="text-xs text-gray-500 truncate">{cost.memo}</div>
        )}
      </div>
      <div className="shrink-0 text-right">
        {cost.isVariable ? (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">変動</span>
        ) : (
          <div className="text-sm font-semibold text-gray-800">¥{cost.amount.toLocaleString()}</div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onEdit(cost)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-terracotta-50 hover:text-terracotta-500 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useEffect, useState } from 'react'
import CfSettingsModal from '../features/CfSettingsModal'
import { SortableCfRow } from '../features/SortableCfRow'
import { CfLifeEventModal } from '../features/CfLifeEventModal'
import { getCfValue, fmtBalance, nKey } from '../features/cfUtils'
import { useCfPlan } from '../hooks/useCfPlan'
import { useConfirm } from '../hooks/useConfirm'
import ConfirmDialog from '../components/ConfirmDialog'
import type { CfItem } from '../types'

export default function CashflowPage() {
  const { plan, loading, updatePlan, updateItemValue, updateItemName, updateItemRate, reorderItems, addItem, removeItem, updateLifeEvent } =
    useCfPlan()

  const thisYear = new Date().getFullYear()
  const [decadeStart, setDecadeStart] = useState(plan.startYear)
  const [selectedYear, setSelectedYear] = useState(thisYear)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    if (!loading) setDecadeStart(plan.startYear)
  }, [loading, plan.startYear])

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [lifeEventModal, setLifeEventModal] = useState<{ year: number; text: string; isEditing: boolean } | null>(null)
  const { confirm, dialogProps } = useConfirm()

  useEffect(() => {
    if (!lifeEventModal) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLifeEventModal(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lifeEventModal])

  const [activeItem, setActiveItem] = useState<{ item: CfItem; type: 'income' | 'expense' } | null>(null)

  const displayYears = isMobile
    ? [selectedYear]
    : Array.from({ length: 10 }, (_, i) => decadeStart + i)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  // ── Derived calculations ───────────────────────────────────────────────────

  function incomeTotal(year: number): number {
    return plan.incomeItems.reduce((sum, item) => sum + getCfValue(item, year), 0)
  }

  function expenseTotal(year: number): number {
    return plan.expenseItems.reduce((sum, item) => sum + getCfValue(item, year), 0)
  }

  function annualBalance(year: number): number {
    return incomeTotal(year) - expenseTotal(year)
  }

  function hasExplicitValueInYear(year: number): boolean {
    const y = String(year)
    return (
      plan.incomeItems.some(item => item.values[y] !== undefined) ||
      plan.expenseItems.some(item => item.values[y] !== undefined)
    )
  }

  function cumulativeSavings(upToYear: number): number {
    let total = plan.initialSavings
    for (let y = plan.startYear; y <= upToYear; y++) {
      if (hasExplicitValueInYear(y)) total += annualBalance(y)
    }
    return total
  }

  // ── Cell editing ───────────────────────────────────────────────────────────

  function startEdit(key: string, value: string) {
    setEditingCell(key)
    setEditValue(value)
  }

  async function commitEdit() {
    if (!editingCell) return
    const parts = editingCell.split('|')
    const kind = parts[0]

    if (kind === 'v') {
      const type = parts[1] as 'income' | 'expense'
      const id = parts[2]!
      const year = Number(parts[3])
      const amount = Number(editValue) || 0
      await updateItemValue(type, id, year, amount)
    } else if (kind === 'n') {
      const type = parts[1] as 'income' | 'expense'
      const id = parts[2]!
      const trimmed = editValue.trim()
      if (trimmed) await updateItemName(type, id, trimmed)
    } else if (kind === 'r') {
      const type = parts[1] as 'income' | 'expense'
      const id = parts[2]!
      const rate = parseFloat(editValue) || 0
      await updateItemRate(type, id, rate)
    } else if (kind === 'le') {
      const year = Number(parts[1])
      await updateLifeEvent(year, editValue)
    }

    setEditingCell(null)
    setEditValue('')
  }

  function cancelEdit() {
    setEditingCell(null)
    setEditValue('')
  }

  function handleLifeEventCellClick(year: number, currentEvent: string) {
    if (window.innerWidth < 1024) {
      setLifeEventModal({ year, text: currentEvent, isEditing: false })
    } else {
      startEdit(`le|${year}`, currentEvent)
    }
  }

  async function saveLifeEventModal() {
    if (!lifeEventModal) return
    await updateLifeEvent(lifeEventModal.year, lifeEventModal.text)
    setLifeEventModal(null)
  }

  // ── DnD handlers ──────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const incomeItem = plan.incomeItems.find(i => i.id === active.id)
    if (incomeItem) { setActiveItem({ item: incomeItem, type: 'income' }); return }
    const expenseItem = plan.expenseItems.find(i => i.id === active.id)
    if (expenseItem) setActiveItem({ item: expenseItem, type: 'expense' })
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const isIncomeActive = plan.incomeItems.some(i => i.id === active.id)
    const isIncomeOver = plan.incomeItems.some(i => i.id === over.id)
    if (isIncomeActive !== isIncomeOver) return

    const type = isIncomeActive ? 'income' : 'expense'
    const items = isIncomeActive ? plan.incomeItems : plan.expenseItems
    const oldIdx = items.findIndex(i => i.id === active.id)
    const newIdx = items.findIndex(i => i.id === over.id)
    const newIds = arrayMove(items, oldIdx, newIdx).map(i => i.id)
    reorderItems(type, newIds)
  }

  // ── Add / Remove item ──────────────────────────────────────────────────────

  async function handleAddItem(type: 'income' | 'expense') {
    const id = await addItem(type, '新しい項目')
    startEdit(nKey(type, id), '新しい項目')
  }

  async function handleRemoveItem(type: 'income' | 'expense', id: string, name: string) {
    if (!await confirm(`「${name}」を削除しますか？\n入力済みのデータもすべて削除されます。`)) return
    await removeItem(type, id)
  }

  // ── Shared row props ───────────────────────────────────────────────────────

  const rowProps = {
    displayYears,
    thisYear,
    isUnlocked,
    editingCell,
    editValue,
    onStartEdit: startEdit,
    onEditChange: setEditValue,
    onCommit: commitEdit,
    onCancel: cancelEdit,
  }

  // ── Table style constants ──────────────────────────────────────────────────

  const stickyName = 'sticky left-0 z-20 border-r border-gray-200 px-3 py-1.5 text-xs whitespace-nowrap bg-white'
  const stickyRate = 'sticky left-[160px] z-20 border-r border-gray-200 px-1 py-1.5 text-xs text-center whitespace-nowrap bg-white'
  const yearCell = 'py-1.5 px-2 text-right text-xs tabular-nums whitespace-nowrap border-l border-gray-100'

  const incomeIds = plan.incomeItems.map(i => i.id)
  const expenseIds = plan.expenseItems.map(i => i.id)
  const colCount = 2 + displayYears.length

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[200px]">
        <span className="text-sm text-gray-500">読み込み中...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2 shrink-0">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-800">キャッシュフロー</h2>
        <div className="flex items-center gap-2">
          {/* Lock / Unlock past years */}
          <button
            onClick={() => setIsUnlocked(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isUnlocked
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              {isUnlocked ? (
                <path d="M10 2a5 5 0 00-5 5v1H4a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm3 7V7a3 3 0 10-6 0v2h6zm-3 3a2 2 0 110 4 2 2 0 010-4z" />
              ) : (
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              )}
            </svg>
            {isUnlocked ? '過去編集中' : '過去を編集'}
          </button>

          {/* Settings */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-500 hover:border-gray-300 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            CF設定
          </button>
        </div>
      </div>

      {/* Year navigation */}
      {isMobile ? (
        <div className="flex items-center justify-between mb-3 gap-2">
          <button
            onClick={() => setSelectedYear(y => y - 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors shrink-0"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            前の年
          </button>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="flex-1 text-sm font-semibold text-gray-700 text-center border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-sage-300 bg-white"
          >
            {Array.from({ length: 50 }, (_, i) => plan.startYear + i).map(y => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          <button
            onClick={() => setSelectedYear(y => y + 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors shrink-0"
          >
            次の年
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setDecadeStart(d => d - 10)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            前の10年
          </button>
          <span className="text-sm font-semibold text-gray-700 tabular-nums">
            {decadeStart}〜{decadeStart + 9}
          </span>
          <button
            onClick={() => setDecadeStart(d => d + 10)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
          >
            次の10年
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Unit note */}
      <p className="text-xs text-gray-500 mb-2 text-right">単位：万円</p>
      </div>

      <div className="flex-1 min-h-0 overflow-auto overscroll-contain px-4 md:px-6 pb-4 md:pb-6">
      {/* 統合テーブル（家族構成 + キャッシュフロー） */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="rounded-xl border border-gray-200 shadow-sm inline-block min-w-full">
          <table
            className="border-separate border-spacing-0 bg-white text-sm w-full table-fixed [&_td]:border-b [&_td]:border-r [&_td]:border-gray-200 [&_th]:border-b [&_th]:border-r [&_th]:border-gray-200"
            style={{ minWidth: isMobile ? '320px' : '860px' }}
          >
            <colgroup>
              <col style={{ width: '160px' }} />
              <col style={{ width: '64px' }} />
              {displayYears.map((_, i) => <col key={i} />)}
            </colgroup>
            <thead>
              <tr className="bg-gray-50">
                <td className={`${stickyName} bg-gray-100 font-bold text-gray-600 border-y-2 border-gray-300`}>
                  家族構成
                </td>
                <td colSpan={colCount - 1} className="bg-gray-100 border-y-2 border-gray-300" />
              </tr>
              <tr className="bg-gray-50">
                <th className={`${stickyName}  font-semibold text-gray-600`}>氏名</th>
                <th className={`${stickyRate}  font-semibold text-gray-600`}>役割</th>
                {displayYears.map(year => (
                  <th
                    key={year}
                    className={`${yearCell} font-semibold text-gray-600 text-center ${
                      year === thisYear ? 'bg-sage-50 text-sage-700' : ''
                    }`}
                  >
                    {year}
                    {year === thisYear && (
                      <span className="block text-[9px] text-sage-400 leading-none">今年</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* 家族構成 */}
              {plan.members.map(member => (
                <tr key={member.id} className="">
                  <td className={`${stickyName}`}>{member.name}</td>
                  <td className={`${stickyRate}`}>{member.role ?? ''}</td>
                  {displayYears.map(year => (
                    <td key={year} className={`${yearCell} text-center `}>
                      {year - member.birthYear}歳
                    </td>
                  ))}
                </tr>
              ))}

              {/* ライフイベント行 */}
              <tr>
                <td className={`${stickyName} bg-white font-medium `}>ライフイベント</td>
                <td className={`${stickyRate} bg-white`} />
                {displayYears.map(year => {
                  const leKey = `le|${year}`
                  const currentEvent = (plan.lifeEvents ?? {})[String(year)] ?? ''
                  return (
                    <td
                      key={year}
                      className="py-1 px-1 text-[10px] font-[800] border-l cursor-pointer hover:bg-sage-50 transition-colors"
                      onClick={() => handleLifeEventCellClick(year, currentEvent)}
                    >
                      {editingCell === leKey ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEdit()
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          autoFocus
                          className="w-full text-xs px-0 py-0 bg-sage-50 border border-sage-300 rounded outline-none"
                        />
                      ) : (
                        <>
                          <span className="lg:hidden flex justify-center items-center h-4">
                            {currentEvent ? (
                              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" className="text-sage-500 shrink-0">
                                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <span className="text-gray-200 text-[10px]">—</span>
                            )}
                          </span>
                          <span className={`hidden lg:inline ${currentEvent ? 'text-gray-700' : 'text-gray-300'}`}>
                            {currentEvent || '—'}
                          </span>
                        </>
                      )}
                    </td>
                  )
                })}
              </tr>

              {/* ── キャッシュフロー セクション区切り ── */}
              <tr className="bg-gray-100">
                <td className={`${stickyName} bg-gray-100 font-bold text-gray-600 border-y-2 border-gray-300`}>
                  キャッシュフロー
                </td>
                <td colSpan={colCount - 1} className="bg-gray-100 border-y-2 border-gray-300" />
              </tr>
              {/* CF 列ヘッダー行 */}
              <tr className="bg-gray-50">
                <td className={`${stickyName} bg-gray-50 font-semibold text-gray-600`}>費目名</td>
                <td className={`${stickyRate} bg-gray-50 font-semibold text-gray-600`}>変動率</td>
                {displayYears.map(year => (
                  <td
                    key={year}
                    className={`${yearCell} font-semibold text-gray-600 text-center ${
                      year === thisYear ? 'bg-sage-50 text-sage-700' : ''
                    }`}
                  >
                    {year}
                    {year === thisYear && (
                      <span className="block text-[9px] text-sage-400 leading-none">今年</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* ── 収入セクション ── */}
              <tr className="bg-sage-50">
                <td className={`${stickyName} bg-sage-50 font-bold text-sage-700 border-y-2 border-sage-200`}>
                  収入
                </td>
                <td colSpan={colCount - 1} className="bg-sage-50 border-y-2 border-sage-200" />
              </tr>

              <SortableContext items={incomeIds} strategy={verticalListSortingStrategy}>
                {plan.incomeItems.map(item => (
                  <SortableCfRow
                    key={item.id}
                    item={item}
                    type="income"
                    {...rowProps}
                    onRemove={id => handleRemoveItem('income', id, item.name)}
                  />
                ))}
              </SortableContext>

              {/* Add income item */}
              <tr>
                <td className="py-0.5 sticky left-0 z-20 bg-white border-r border-gray-200">
                  <button
                    onClick={() => handleAddItem('income')}
                    className="flex items-center gap-1 text-xs text-sage-600 hover:text-sage-800 px-4 py-1.5 transition-colors"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    収入項目を追加
                  </button>
                </td>
                <td colSpan={colCount - 1} className="bg-white" />
              </tr>

              {/* 収入合計 */}
              <tr className="bg-sage-50 border-y-2 border-sage-200">
                <td className={`${stickyName} bg-sage-50 font-bold text-sage-800 border-y-2 border-sage-200`}>
                  収入合計
                </td>
                <td className={`${stickyRate} bg-sage-50 border-y-2 border-sage-200`} />
                {displayYears.map(year => {
                  const total = incomeTotal(year)
                  return (
                    <td key={year} className={`${yearCell} font-bold text-sage-800 bg-sage-50 border-y-2 border-sage-200`}>
                      {total === 0 ? '' : fmtBalance(total)}
                    </td>
                  )
                })}
              </tr>

              {/* ── 支出セクション ── */}
              <tr className="bg-terracotta-50">
                <td className={`${stickyName} bg-terracotta-50 font-bold text-terracotta-700 border-y-2 border-terracotta-200`}>
                  支出
                </td>
                <td colSpan={colCount - 1} className="bg-terracotta-50 border-y-2 border-terracotta-200" />
              </tr>

              <SortableContext items={expenseIds} strategy={verticalListSortingStrategy}>
                {plan.expenseItems.map(item => (
                  <SortableCfRow
                    key={item.id}
                    item={item}
                    type="expense"
                    {...rowProps}
                    onRemove={id => handleRemoveItem('expense', id, item.name)}
                  />
                ))}
              </SortableContext>

              {/* Add expense item */}
              <tr>
                <td className="py-0.5 sticky left-0 z-20 bg-white border-r border-gray-200">
                  <button
                    onClick={() => handleAddItem('expense')}
                    className="flex items-center gap-1 text-xs text-terracotta-600 hover:text-terracotta-800 px-4 py-1.5 transition-colors"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    支出項目を追加
                  </button>
                </td>
                <td colSpan={colCount - 1} className="bg-white" />
              </tr>

              {/* 支出合計 */}
              <tr className="bg-terracotta-50 border-y-2 border-terracotta-200">
                <td className={`${stickyName} bg-terracotta-50 font-bold text-terracotta-800 border-y-2 border-terracotta-200`}>
                  支出合計
                </td>
                <td className={`${stickyRate} bg-terracotta-50 border-y-2 border-terracotta-200`} />
                {displayYears.map(year => {
                  const total = expenseTotal(year)
                  const show = hasExplicitValueInYear(year) && total !== 0
                  return (
                    <td key={year} className={`${yearCell} font-bold text-terracotta-800 bg-terracotta-50 border-y-2 border-terracotta-200`}>
                      {show ? fmtBalance(total) : ''}
                    </td>
                  )
                })}
              </tr>

              {/* ── 年間収支 ── */}
              <tr className="bg-sage-50 border-y-2 border-sage-200">
                <td className={`${stickyName} bg-sage-50 font-bold text-sage-800 border-y-2 border-sage-200`}>
                  年間収支
                </td>
                <td className={`${stickyRate} bg-sage-50 border-y-2 border-sage-200`} />
                {displayYears.map(year => {
                  const hasData = hasExplicitValueInYear(year)
                  const balance = annualBalance(year)
                  const show = hasData && (incomeTotal(year) !== 0 || expenseTotal(year) !== 0)
                  return (
                    <td
                      key={year}
                      className={`${yearCell} font-bold border-y-2 border-sage-200 ${
                        show
                          ? balance >= 0 ? 'text-sage-700 bg-sage-50' : 'text-terracotta-700 bg-sage-50'
                          : 'bg-sage-50'
                      }`}
                    >
                      {show ? (balance >= 0 ? '+' : '') + fmtBalance(balance) : ''}
                    </td>
                  )
                })}
              </tr>

              {/* ── 貯蓄残高 ── */}
              <tr className="bg-sage-100">
                <td className={`${stickyName} bg-sage-100 font-bold text-sage-900 border-y-2 border-sage-300`}>
                  貯蓄残高
                </td>
                <td className={`${stickyRate} bg-sage-100 border-y-2 border-sage-300`} />
                {displayYears.map(year => {
                  const hasData = hasExplicitValueInYear(year)
                  const savings = cumulativeSavings(year)
                  return (
                    <td
                      key={year}
                      className={`${yearCell} font-bold border-y-2 border-sage-300 ${
                        hasData
                          ? savings >= 0 ? 'text-sage-800 bg-sage-100' : 'text-red-700 bg-red-50'
                          : 'bg-sage-100'
                      }`}
                    >
                      {hasData ? fmtBalance(savings) : ''}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* DragOverlay */}
        <DragOverlay dropAnimation={null}>
          {activeItem && (
            <div className="bg-white shadow-xl border-2 border-sage-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 flex items-center gap-2 opacity-90">
              <svg viewBox="0 0 8 14" width="8" height="14" fill="currentColor" className="text-sage-400">
                <circle cx="2" cy="2"  r="1.2" />
                <circle cx="6" cy="2"  r="1.2" />
                <circle cx="2" cy="7"  r="1.2" />
                <circle cx="6" cy="7"  r="1.2" />
                <circle cx="2" cy="12" r="1.2" />
                <circle cx="6" cy="12" r="1.2" />
              </svg>
              {activeItem.item.name}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <CfLifeEventModal
        lifeEventModal={lifeEventModal}
        lifeEvents={plan.lifeEvents}
        setLifeEventModal={setLifeEventModal}
        onSave={saveLifeEventModal}
      />

      </div>

      <CfSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        plan={plan}
        onSave={updatePlan}
      />
      <ConfirmDialog {...dialogProps} />
    </div>
  )
}

import { type FormEvent, useRef, useState } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useShoppingList } from '../hooks/useShoppingList'
import type { ShoppingItem } from '../types'
import { SHOPPING_CATEGORIES, UNCATEGORIZED, ORDERED_KEYS, categoryOf } from '../data/shoppingCatalog'
import BulkAddModal from '../features/BulkAddModal'

function groupUnchecked(items: ShoppingItem[]) {
  return ORDERED_KEYS
    .map(key => ({ meta: categoryOf(key), items: items.filter(i => (i.category ?? '') === key) }))
    .filter(g => g.items.length > 0)
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
      <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/>
      <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
    </svg>
  )
}

function GripIcon() {
  return (
    <svg viewBox="0 0 8 14" width="10" height="14" fill="currentColor">
      <circle cx="2" cy="2"  r="1.2" /><circle cx="6" cy="2"  r="1.2" />
      <circle cx="2" cy="7"  r="1.2" /><circle cx="6" cy="7"  r="1.2" />
      <circle cx="2" cy="12" r="1.2" /><circle cx="6" cy="12" r="1.2" />
    </svg>
  )
}

export default function ShoppingListPage() {
  const { uncheckedItems, checkedItems, loading, addItem, addItems, toggleItem, setCategory, deleteItem, clearChecked, reorderItems } = useShoppingList()
  const [name, setName] = useState('')
  const [targetCat, setTargetCat] = useState('')
  const [bulkOpen, setBulkOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setName('')
    await addItem(trimmed, targetCat || undefined)
    inputRef.current?.focus()
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeItem = uncheckedItems.find(i => i.id === active.id)
    const overItem = uncheckedItems.find(i => i.id === over.id)
    if (!activeItem || !overItem) return
    // 並び替えは同一カテゴリ内のみ
    if ((activeItem.category ?? '') !== (overItem.category ?? '')) return
    const newOrder = groupUnchecked(uncheckedItems).flatMap(g => {
      if (!g.items.some(i => i.id === active.id)) return g.items
      const oldIndex = g.items.findIndex(i => i.id === active.id)
      const newIndex = g.items.findIndex(i => i.id === over.id)
      return arrayMove(g.items, oldIndex, newIndex)
    })
    reorderItems(newOrder)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">読み込み中...</div>
    )
  }

  const isEmpty = uncheckedItems.length === 0 && checkedItems.length === 0
  const groups = groupUnchecked(uncheckedItems)

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto">
      <div className="max-w-lg">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-800">買い物リスト</h2>
          {checkedItems.length > 0 && (
            <button
              onClick={clearChecked}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              完了済みをクリア（{checkedItems.length}件）
            </button>
          )}
        </div>

        {/* 入力フォーム */}
        <form onSubmit={handleSubmit} className="mb-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="アイテムを入力.."
              autoFocus
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 bg-white shadow-sm"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-3 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-xl font-medium text-sm transition-colors shadow-sm shrink-0"
            >
              追加
            </button>
          </div>
        </form>

        {/* 追加先カテゴリの選択 */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {[UNCATEGORIZED, ...SHOPPING_CATEGORIES].map(cat => (
            <button
              key={cat.key || 'none'}
              type="button"
              onClick={() => setTargetCat(cat.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                targetCat === cat.key
                  ? 'bg-sage-600 text-white border-sage-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-sage-300'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* まとめて追加 */}
        <button
          type="button"
          onClick={() => setBulkOpen(true)}
          className="flex items-center gap-2 mb-6 px-4 py-2.5 bg-white border border-sage-200 text-sage-700 rounded-xl text-sm font-medium hover:bg-sage-50 transition-colors shadow-sm"
        >
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="8" cy="17" r="1.2" /><circle cx="16" cy="17" r="1.2" />
            <path d="M2 3h2l1.5 9.5a1 1 0 001 .8h8.5a1 1 0 001-.8L18 6H5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          定番からまとめて追加
        </button>

        {/* 空の状態 */}
        {isEmpty && (
          <div className="text-center py-16 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="13" y2="16" />
            </svg>
            <p className="text-sm">リストが空です</p>
            <p className="text-xs mt-1">上のフォームからアイテムを追加してください</p>
          </div>
        )}

        {/* 未チェックアイテム（カテゴリ別・D&D対応）*/}
        {groups.length > 0 && (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="space-y-5 mb-6">
              {groups.map(group => (
                <div key={group.meta.key || 'none'}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm">{group.meta.emoji}</span>
                    <span className="text-xs font-semibold text-gray-500">{group.meta.label}</span>
                    <span className="text-xs text-gray-300">{group.items.length}</span>
                  </div>
                  <SortableContext items={group.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {group.items.map(item => (
                        <SortableShoppingItem
                          key={item.id}
                          item={item}
                          onToggle={toggleItem}
                          onDelete={deleteItem}
                          onChangeCategory={setCategory}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              ))}
            </div>
          </DndContext>
        )}

        {/* チェック済みアイテム */}
        {checkedItems.length > 0 && (
          <>
            {uncheckedItems.length > 0 && (
              <p className="text-xs text-gray-500 font-medium mb-2">完了</p>
            )}
            <div className="space-y-2">
              {checkedItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 bg-gray-50 px-4 py-3.5 rounded-xl border border-gray-100"
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="w-5 h-5 rounded-full border-2 border-sage-400 bg-sage-400 flex items-center justify-center shrink-0 transition-colors"
                  >
                    <svg viewBox="0 0 12 12" width="9" height="9" fill="none" stroke="white" strokeWidth="2.5">
                      <polyline points="2 6 5 9 10 3" />
                    </svg>
                  </button>
                  <span className="flex-1 text-sm text-gray-500 line-through">{item.name}</span>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <BulkAddModal
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        existingNames={uncheckedItems.map(i => i.name)}
        onAdd={entries => addItems(entries)}
      />
    </div>
  )
}

function SortableShoppingItem({
  item,
  onToggle,
  onDelete,
  onChangeCategory,
}: {
  item: ShoppingItem
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onChangeCategory: (id: string, category: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-white px-4 py-3.5 rounded-xl shadow-sm border border-gray-100"
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
      <button
        onClick={() => onToggle(item.id)}
        className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-sage-500 transition-colors shrink-0"
      />
      <span className="flex-1 text-sm text-gray-800">{item.name}</span>
      <select
        value={item.category ?? ''}
        onChange={e => onChangeCategory(item.id, e.target.value)}
        className="text-base bg-transparent border-none focus:outline-none cursor-pointer shrink-0 appearance-none w-6 text-center"
        aria-label="売り場を変更"
        title={categoryOf(item.category).label}
      >
        {[UNCATEGORIZED, ...SHOPPING_CATEGORIES].map(cat => (
          <option key={cat.key || 'none'} value={cat.key}>
            {cat.emoji} {cat.label}
          </option>
        ))}
      </select>
      <button
        onClick={() => onDelete(item.id)}
        className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
      >
        <TrashIcon />
      </button>
    </div>
  )
}

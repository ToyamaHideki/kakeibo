import { type FormEvent, useRef, useState } from 'react'
import { useShoppingList } from '../hooks/useShoppingList'

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
      <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/>
      <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
    </svg>
  )
}

export default function ShoppingListPage() {
  const { uncheckedItems, checkedItems, loading, addItem, toggleItem, deleteItem, clearChecked } = useShoppingList()
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setName('')
    await addItem(trimmed)
    inputRef.current?.focus()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">読み込み中...</div>
    )
  }

  const isEmpty = uncheckedItems.length === 0 && checkedItems.length === 0

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-5 max-w-lg md:max-w-none">
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
      <form onSubmit={handleSubmit} className="flex gap-2 mb-6 max-w-lg">
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
      </form>

      {/* 空の状慁E*/}
      {isEmpty && (
        <div className="text-center py-16 text-gray-500 max-w-lg">
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

      {/* 未チェチE��アイチE�� */}
      {uncheckedItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
          {uncheckedItems.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-white px-4 py-3.5 rounded-xl shadow-sm border border-gray-100"
            >
              <button
                onClick={() => toggleItem(item.id)}
                className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-sage-500 transition-colors shrink-0"
              />
              <span className="flex-1 text-sm text-gray-800">{item.name}</span>
              <button
                onClick={() => deleteItem(item.id)}
                className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* チェチE��済みアイチE�� */}
      {checkedItems.length > 0 && (
        <>
          {uncheckedItems.length > 0 && (
            <p className="text-xs text-gray-500 font-medium mb-2">完了</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
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
  )
}

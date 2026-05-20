import { useCallback, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { addCategory, deleteCategory } from '../firebase/firestore'
import { useHousehold } from '../hooks/useHousehold'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useConfirm } from '../hooks/useConfirm'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Category, TransactionType } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  onAdded: (category: Category) => void
  onDeleted: (id: string) => void
  type: TransactionType
  nextOrder: number
  categories: Category[]
  addCategoryFn?: ((category: Omit<Category, 'id'>) => Promise<string>) | undefined
  deleteCategoryFn?: ((id: string) => Promise<void>) | undefined
}

const PRESET_COLORS = [
  '#d4553a', '#c87a40', '#b08a28', '#5a8a43',
  '#3a8a6a', '#287a8a', '#4a72a0', '#2e7aa0',
  '#7060a0', '#7a52a0', '#a85880', '#c04858',
  '#64748b', '#9ca3af',
]

const TYPE_LABEL: Record<TransactionType, string> = {
  expense: '支出',
  income: '収入',
}

export default function CategoryAddModal({
  isOpen, onClose, onAdded, onDeleted, type, nextOrder, categories,
  addCategoryFn, deleteCategoryFn,
}: Props) {
  const { householdId } = useHousehold()
  const { confirm, dialogProps } = useConfirm()
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [expenseType, setExpenseType] = useState<'fixed' | 'variable'>('variable')
  const [saving, setSaving] = useState(false)
  const colorInputRef = useRef<HTMLInputElement>(null)

  const handleClose = useCallback(() => {
    setName('')
    setColor(PRESET_COLORS[0])
    setExpenseType('variable')
    onClose()
  }, [onClose])

  useEscapeKey(handleClose, isOpen)

  async function handleDelete(cat: Category) {
    if (!await confirm(`「${cat.name}」を削除しますか？\nこのカテゴリで登録済みの取引は残りますが、カテゴリとの紐付けが失われます。`)) return
    await (deleteCategoryFn ?? ((id: string) => deleteCategory(householdId!, id)))(cat.id)
    onDeleted(cat.id)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      const newCat = {
        name: name.trim(),
        type,
        color,
        order: nextOrder,
        ...(type === 'expense' ? { expenseType } : {}),
      }
      const id = await (addCategoryFn ?? ((cat: Omit<Category, 'id'>) => addCategory(householdId!, cat)))(newCat)
      onAdded({ ...newCat, id })
      setName('')
      setColor(PRESET_COLORS[0])
      setExpenseType('variable')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
    <ConfirmDialog {...dialogProps} />
    {createPortal(
    <div
      className="fixed inset-0 bg-black/60 z-[60] flex items-end md:items-center justify-center"
      onClick={handleClose}
    >
      <div
        className="bg-white w-full md:max-w-sm md:rounded-xl rounded-t-2xl shadow-xl flex flex-col max-h-[85svh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 md:hidden shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-6 pb-6 pt-3 overflow-y-auto">
          <h3 className="text-base font-bold text-gray-800 mb-4">
            カテゴリを管理（{TYPE_LABEL[type]}）
          </h3>

          {/* 登録済みカテゴリ一覧 */}
          {categories.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">登録済み</p>
              <div className="space-y-1">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm text-gray-700 truncate">{cat.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat)}
                      className="text-gray-300 hover:text-red-400 transition-colors shrink-0 ml-2 p-1"
                      title="削除"
                    >
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                        <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/>
                        <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <hr className="my-4 border-gray-100" />
            </div>
          )}

          {/* 新規追加フォーム */}
          <p className="text-xs font-medium text-gray-500 mb-3">新しいカテゴリを追加</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">カテゴリ名</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例：外食、医療費"
                maxLength={20}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
              />
            </div>

            {type === 'expense' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">費目種別</label>
                <div className="flex rounded-lg overflow-hidden border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setExpenseType('variable')}
                    className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                      expenseType === 'variable' ? 'bg-teal-500 text-white' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    変動費
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpenseType('fixed')}
                    className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                      expenseType === 'fixed' ? 'bg-terracotta-500 text-white' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    固定費
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">カラー</label>
              <div className="grid grid-cols-7 gap-2 mb-3">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                      color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => colorInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <span
                    className="w-4 h-4 rounded-full border border-gray-200 shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  カスタムカラー
                </button>
                <span className="text-xs text-gray-500 font-mono">{color}</span>
                <input
                  ref={colorInputRef}
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="sr-only"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-sm text-gray-700">{name || 'カテゴリ名'}</span>
            </div>

            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="w-full py-2.5 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {saving ? '追加中...' : '追加する'}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  )}
  </>
  )
}

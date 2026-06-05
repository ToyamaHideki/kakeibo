import { useMemo, useState } from 'react'
import BottomSheetModal from '../components/BottomSheetModal'
import { SHOPPING_CATEGORIES, SHOPPING_CATALOG, catalogNames } from '../data/shoppingCatalog'

interface Props {
  isOpen: boolean
  onClose: () => void
  /** すでにリストにある（未チェックの）商品名。カタログ側で「追加済み」表示に使う */
  existingNames: string[]
  onAdd: (entries: { name: string; category: string }[]) => void
}

export default function BulkAddModal({ isOpen, onClose, existingNames, onAdd }: Props) {
  const [activeCat, setActiveCat] = useState<string>(SHOPPING_CATEGORIES[0].key)
  // 選択中の商品（"カテゴリkey::商品名" をキーに保持）
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const existing = useMemo(() => new Set(existingNames), [existingNames])

  function keyOf(catKey: string, name: string) {
    return `${catKey}::${name}`
  }

  function toggle(catKey: string, name: string) {
    setSelected(prev => {
      const next = new Set(prev)
      const k = keyOf(catKey, name)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  function handleClose() {
    setSelected(new Set())
    setActiveCat(SHOPPING_CATEGORIES[0].key)
    onClose()
  }

  function handleAdd() {
    const entries = [...selected].map(k => {
      const sep = k.indexOf('::')
      return { category: k.slice(0, sep), name: k.slice(sep + 2) }
    })
    onAdd(entries)
    handleClose()
  }

  const sections = SHOPPING_CATALOG[activeCat] ?? []

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={handleClose}
      title="まとめて追加"
      maxHeightClass="max-h-[88vh] md:max-h-[85vh]"
      widthClass="md:max-w-3xl"
    >
      {/* カテゴリタブ */}
      <div className="flex flex-wrap gap-1.5 px-4 py-3 border-b border-gray-100 shrink-0">
        {SHOPPING_CATEGORIES.map(cat => {
          const count = catalogNames(cat.key).filter(n => selected.has(keyOf(cat.key, n))).length
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCat(cat.key)}
              className={`relative px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeCat === cat.key ? 'bg-sage-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.emoji} {cat.label}
              {count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 商品一覧（高さ固定で「追加」ボタンの位置を一定に保つ） */}
      <div className="h-[48vh] md:h-[420px] overflow-y-auto p-4 space-y-4">
        {sections.map((section, idx) => (
          <div key={section.label ?? idx}>
            {section.label && (
              <p className="text-xs font-semibold text-gray-400 mb-2">{section.label}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {section.items.map(name => {
                const isSelected = selected.has(keyOf(activeCat, name))
                const isExisting = existing.has(name)
                return (
                  <button
                    key={name}
                    type="button"
                    disabled={isExisting}
                    onClick={() => toggle(activeCat, name)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      isExisting
                        ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                        : isSelected
                          ? 'bg-sage-600 text-white border-sage-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-sage-300'
                    }`}
                  >
                    {isSelected && !isExisting && '✓ '}
                    {name}
                    {isExisting && ' (追加済)'}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* フッター */}
      <div className="px-4 py-3 border-t border-gray-100 shrink-0">
        <button
          type="button"
          onClick={handleAdd}
          disabled={selected.size === 0}
          className="w-full py-3 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-xl font-medium text-sm transition-colors"
        >
          {selected.size > 0 ? `選択中の${selected.size}件を追加` : '商品を選択してください'}
        </button>
      </div>
    </BottomSheetModal>
  )
}

import type { AssetItem, LiabilityItem } from '../types'

interface Props {
  item: AssetItem | LiabilityItem
  isEditing: boolean
  editAmount: string
  editNote: string
  amountPlaceholder: string
  onChangeAmount: (v: string) => void
  onChangeNote: (v: string) => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
}

export default function BalanceSheetItemRow({
  item,
  isEditing,
  editAmount,
  editNote,
  amountPlaceholder,
  onChangeAmount,
  onChangeNote,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: Props) {
  return (
    <div className="px-4 py-2.5">
      {isEditing ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="number"
              value={editAmount}
              onChange={e => onChangeAmount(e.target.value)}
              className="flex-1 px-2 py-1.5 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder={amountPlaceholder}
              autoFocus
            />
            <button
              onClick={onSaveEdit}
              className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            >保存</button>
            <button onClick={onCancelEdit} className="px-3 py-1.5 text-xs text-gray-500">戻る</button>
          </div>
          <input
            type="text"
            value={editNote}
            onChange={e => onChangeNote(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
            placeholder="メモ（任意）"
          />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <span className="text-sm text-gray-800">{item.name}</span>
            {item.note && <p className="text-xs text-gray-500 truncate">{item.note}</p>}
          </div>
          <span className="text-sm font-medium text-gray-900 shrink-0">{item.amount.toLocaleString()}円</span>
          <button
            onClick={onStartEdit}
            className="text-gray-300 hover:text-gray-500 shrink-0"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="text-red-200 hover:text-red-400 shrink-0"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

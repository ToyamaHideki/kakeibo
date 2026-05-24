import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CfItem } from '../types'
import { getCfValue, fmt, vKey, nKey, rKey } from './cfUtils'

export interface SortableCfRowProps {
  item: CfItem
  type: 'income' | 'expense'
  displayYears: number[]
  thisYear: number
  isUnlocked: boolean
  editingCell: string | null
  editValue: string
  onStartEdit: (key: string, value: string) => void
  onEditChange: (value: string) => void
  onCommit: () => void
  onCancel: () => void
  onRemove: (id: string) => void
}

export function SortableCfRow({
  item,
  type,
  displayYears,
  thisYear,
  isUnlocked,
  editingCell,
  editValue,
  onStartEdit,
  onEditChange,
  onCommit,
  onCancel,
  onRemove,
}: SortableCfRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  }

  const nameKey = nKey(type, item.id)
  const rateKey = rKey(type, item.id)

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-gray-50 group">
      {/* 費目名（sticky） */}
      <td className="sticky left-0 z-20 bg-white group-hover:bg-gray-50 border-r border-gray-200 py-1 px-1.5 min-w-0">
        <div className="flex items-center gap-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 px-0.5 py-1 touch-none"
            tabIndex={-1}
          >
            <svg viewBox="0 0 8 14" width="8" height="14" fill="currentColor">
              <circle cx="2" cy="2"  r="1.2" />
              <circle cx="6" cy="2"  r="1.2" />
              <circle cx="2" cy="7"  r="1.2" />
              <circle cx="6" cy="7"  r="1.2" />
              <circle cx="2" cy="12" r="1.2" />
              <circle cx="6" cy="12" r="1.2" />
            </svg>
          </button>

          {editingCell === nameKey ? (
            <input
              type="text"
              value={editValue}
              onChange={e => onEditChange(e.target.value)}
              onBlur={onCommit}
              onKeyDown={e => {
                if (e.key === 'Enter') onCommit()
                if (e.key === 'Escape') onCancel()
              }}
              autoFocus
              className="flex-1 text-xs px-1 py-0.5 border border-sage-300 rounded outline-none min-w-0"
            />
          ) : (
            <span
              role="button"
              tabIndex={0}
              className="flex-1 text-xs text-gray-700 truncate cursor-pointer hover:text-sage-600 transition-colors min-w-0"
              onClick={() => onStartEdit(nameKey, item.name)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onStartEdit(nameKey, item.name) }}
              title={item.name}
            >
              {item.name}
            </span>
          )}

          <button
            onClick={() => onRemove(item.id)}
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 shrink-0 transition-all"
            tabIndex={-1}
            title="削除"
          >
            <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
              <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/>
              <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
            </svg>
          </button>
        </div>
      </td>

      {/* 変動率（sticky） */}
      <td className="sticky left-[160px] z-20 bg-white group-hover:bg-gray-50 border-r border-gray-200 text-center py-1 px-1">
        {editingCell === rateKey ? (
          <input
            type="number"
            value={editValue}
            onChange={e => onEditChange(e.target.value)}
            onBlur={onCommit}
            onKeyDown={e => {
              if (e.key === 'Enter') onCommit()
              if (e.key === 'Escape') onCancel()
            }}
            autoFocus
            className="w-full text-xs text-center px-1 py-0.5 border border-sage-300 rounded outline-none"
          />
        ) : (
          <span
            role="button"
            tabIndex={0}
            className="text-xs text-gray-500 cursor-pointer hover:text-sage-600 transition-colors"
            onClick={() => onStartEdit(rateKey, String(item.rate))}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onStartEdit(rateKey, String(item.rate)) }}
          >
            {item.rate}%
          </span>
        )}
      </td>

      {/* 年別セル */}
      {displayYears.map(year => {
        const cellKey = vKey(type, item.id, year)
        const isPast = year < thisYear
        const locked = isPast && !isUnlocked
        const val = getCfValue(item, year)
        const isExplicit = item.values[String(year)] !== undefined

        return (
          <td
            key={year}
            className={`py-1.5 px-2 text-right text-xs tabular-nums border-l border-gray-100 transition-colors ${
              locked
                ? 'text-gray-500'
                : isPast
                  ? 'bg-amber-50 cursor-pointer hover:bg-amber-100'
                  : 'cursor-pointer hover:bg-sage-50'
            }`}
            onClick={!locked ? () => onStartEdit(cellKey, String(val === 0 && !isExplicit ? '' : val)) : undefined}
          >
            {editingCell === cellKey ? (
              <input
                type="number"
                value={editValue}
                onChange={e => onEditChange(e.target.value)}
                onBlur={onCancel}
                onKeyDown={e => {
                  if (e.key === 'Enter') onCommit()
                  if (e.key === 'Escape') onCancel()
                }}
                autoFocus
                className="w-full text-xs text-right px-0 py-0 bg-sage-50 border border-sage-300 rounded outline-none"
              />
            ) : (
              <span className={isExplicit ? 'font-medium text-gray-800' : 'text-gray-500'}>
                {val === 0 && !isExplicit ? '' : fmt(val)}
              </span>
            )}
          </td>
        )
      })}
    </tr>
  )
}

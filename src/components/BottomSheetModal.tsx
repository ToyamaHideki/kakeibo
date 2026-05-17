import type { ReactNode } from 'react'
import { useEscapeKey } from '../hooks/useEscapeKey'

interface Props {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** z-index クラス（デフォルト: z-50）*/
  zClass?: string
  /** 最大高さクラス（デフォルト: max-h-[92vh] md:max-h-[90vh]）*/
  maxHeightClass?: string
}

export default function BottomSheetModal({
  isOpen,
  onClose,
  title,
  children,
  zClass = 'z-50',
  maxHeightClass = 'max-h-[92vh] md:max-h-[90vh]',
}: Props) {
  useEscapeKey(onClose, isOpen)

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 bg-black/50 ${zClass} flex items-end md:items-center justify-center`}
      onClick={onClose}
    >
      <div
        className={`bg-white w-full md:max-w-md md:rounded-xl rounded-t-2xl shadow-xl flex flex-col ${maxHeightClass}`}
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        {children}
      </div>
    </div>
  )
}

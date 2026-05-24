import { type ReactNode, useEffect, useRef } from 'react'
import { useEscapeKey } from '../hooks/useEscapeKey'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

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

  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    previousFocusRef.current = document.activeElement as HTMLElement
    const panel = panelRef.current
    if (!panel) return
    const focusable = panel.querySelectorAll<HTMLElement>(FOCUSABLE)
    focusable[0]?.focus()

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const els = panel!.querySelectorAll<HTMLElement>(FOCUSABLE)
      const first = els[0]
      const last = els[els.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }
    panel.addEventListener('keydown', handleTab)
    return () => {
      panel.removeEventListener('keydown', handleTab)
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 bg-black/50 ${zClass} flex items-end md:items-center justify-center`}
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className={`bg-white w-full md:max-w-md md:rounded-xl rounded-t-2xl shadow-xl flex flex-col ${maxHeightClass}`}
        role="presentation"
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
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

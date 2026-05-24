import { createPortal } from 'react-dom'

interface Props {
  isOpen: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  cancelLabel?: string
}

export default function ConfirmDialog({
  isOpen, message, onConfirm, onCancel,
  confirmLabel = '削除する', cancelLabel = 'キャンセル',
}: Props) {
  if (!isOpen) return null
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" role="presentation" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full">
        <p className="text-sm text-gray-700 whitespace-pre-line mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

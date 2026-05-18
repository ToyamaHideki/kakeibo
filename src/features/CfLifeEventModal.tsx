import type { Dispatch, SetStateAction } from 'react'

interface LifeEventModalState {
  year: number
  text: string
  isEditing: boolean
}

interface Props {
  lifeEventModal: LifeEventModalState | null
  lifeEvents: Record<string, string> | undefined
  setLifeEventModal: Dispatch<SetStateAction<LifeEventModalState | null>>
  onSave: () => Promise<void>
}

export function CfLifeEventModal({ lifeEventModal, lifeEvents, setLifeEventModal, onSave }: Props) {
  if (!lifeEventModal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setLifeEventModal(null)}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-base">
            {lifeEventModal.year}年 ライフイベント
          </h3>
          <button
            onClick={() => setLifeEventModal(null)}
            className="text-gray-500 hover:text-gray-600 transition-colors p-1"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">
          {lifeEventModal.isEditing ? (
            <>
              <input
                type="text"
                value={lifeEventModal.text}
                onChange={e => setLifeEventModal(prev => prev ? { ...prev, text: e.target.value } : null)}
                onKeyDown={e => {
                  if (e.key === 'Enter') onSave()
                  if (e.key === 'Escape') setLifeEventModal(prev => prev ? { ...prev, isEditing: false } : null)
                }}
                autoFocus
                placeholder="ライフイベントを入力"
                className="w-full border border-sage-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sage-300 mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setLifeEventModal(prev => prev ? { ...prev, isEditing: false, text: (lifeEvents ?? {})[String(prev.year)] ?? '' } : null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={onSave}
                  className="flex-1 py-2.5 rounded-xl bg-sage-600 hover:bg-sage-700 text-white text-sm font-medium transition-colors"
                >
                  保存
                </button>
              </div>
            </>
          ) : (
            <>
              <p className={`text-sm min-h-[3em] mb-4 ${lifeEventModal.text ? 'text-gray-800' : 'text-gray-500'}`}>
                {lifeEventModal.text || '（未入力）'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setLifeEventModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  閉じる
                </button>
                <button
                  onClick={() => setLifeEventModal(prev => prev ? { ...prev, isEditing: true } : null)}
                  className="flex-1 py-2.5 rounded-xl bg-sage-600 hover:bg-sage-700 text-white text-sm font-medium transition-colors"
                >
                  編集する
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

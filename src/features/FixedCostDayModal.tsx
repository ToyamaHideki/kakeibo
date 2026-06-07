import { getEffectiveDay, FREQ_LABEL } from '../utils/fixedCost'
import type { FixedItem } from '../utils/fixedItem'
import { CONTRACT_TYPE_SHORT_LABEL } from '../utils/fixedItem'

interface Props {
  day: number
  month: number
  year: number
  costs: FixedItem[]
  onEdit: (item: FixedItem) => void
  onDelete: (item: FixedItem) => void
  onClose: () => void
}

export default function FixedCostDayModal({ day, month, year, costs, onEdit, onDelete, onClose }: Props) {
  return (
    <div className="md:hidden fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" role="presentation" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">
            {month}月{day}日の固定費
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {costs.map(cost => {
            const { effectiveDay, isShifted } = getEffectiveDay(cost.dayOfMonth, year, month)
            const freqLabel = FREQ_LABEL[cost.frequency]
            const isContract = cost.source === 'contract'

            return (
              <div key={cost.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 shrink-0 text-center">
                  <span className={`text-sm font-bold ${isShifted ? 'text-amber-600' : 'text-sage-600'}`}>
                    {effectiveDay}
                  </span>
                  <span className="text-[10px] text-gray-500 block leading-none">{isShifted ? '振替' : '日'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isContract && (
                      <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
                        {CONTRACT_TYPE_SHORT_LABEL[cost.contractType!]}
                      </span>
                    )}
                    {cost.scope === 'personal' && (
                      <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {cost.ownerLabel ? `個人・${cost.ownerLabel}` : '個人'}
                      </span>
                    )}
                    <span className="text-sm font-medium text-gray-800 truncate">{cost.name}</span>
                    {freqLabel && (
                      <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600">
                        {freqLabel}
                      </span>
                    )}
                  </div>
                  {cost.paymentMethod && (
                    <div className="text-xs text-gray-500 truncate">{cost.paymentMethod}</div>
                  )}
                  {cost.memo && (
                    <div className="text-xs text-gray-500 truncate">{cost.memo}</div>
                  )}
                </div>
                <div className="shrink-0">
                  {cost.isVariable ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">変動</span>
                  ) : (
                    <span className="text-sm font-semibold text-gray-800">¥{cost.amount.toLocaleString()}</span>
                  )}
                </div>
                {/* 編集・削除は固定費のみ（契約は参照のみ） */}
                {!isContract && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEdit(cost)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(cost)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-terracotta-50 hover:text-terracotta-500"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="px-5 py-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}

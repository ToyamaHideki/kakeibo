import { getEffectiveDay, isApplicableThisMonth, FREQ_LABEL } from '../utils/fixedCost'
import { CONTRACT_TYPE_SHORT_LABEL, type FixedItem } from '../utils/fixedItem'

// 固定費一覧（世帯・個人）に表示する契約の参照専用行（編集・削除・並べ替え不可）
export default function ContractRow({
  item,
  viewYear,
  viewMonth,
}: {
  item: FixedItem
  viewYear: number
  viewMonth: number
}) {
  const applicable = isApplicableThisMonth(item, viewYear, viewMonth)
  const { effectiveDay, isShifted, overflows } = getEffectiveDay(item.dayOfMonth, viewYear, viewMonth)
  const freqLabel = FREQ_LABEL[item.frequency]

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!applicable ? 'opacity-50' : ''}`}>
      <div className="w-10 shrink-0 text-center">
        {!applicable ? (
          <>
            <span className="text-xs font-bold text-gray-500 block">{item.month}月</span>
            <span className="text-xs text-gray-500 block leading-none">{item.dayOfMonth}日</span>
          </>
        ) : overflows ? (
          <>
            <span className="text-sm font-bold text-gray-500">{item.dayOfMonth}</span>
            <span className="text-xs text-gray-500 block leading-none">日</span>
          </>
        ) : (
          <>
            <span className={`text-sm font-bold ${isShifted ? 'text-amber-600' : 'text-blue-500'}`}>
              {effectiveDay}
            </span>
            <span className="text-xs text-gray-500 block leading-none">{isShifted ? '振替' : '日'}</span>
          </>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
            {CONTRACT_TYPE_SHORT_LABEL[item.contractType!]}
          </span>
          {item.scope === 'personal' && (
            <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">個人</span>
          )}
          <span className="text-sm font-medium text-gray-800 truncate">{item.name}</span>
          {freqLabel && (
            <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600">{freqLabel}</span>
          )}
        </div>
        {item.paymentMethod && <div className="text-xs text-gray-500 truncate">{item.paymentMethod}</div>}
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold text-gray-800">¥{item.amount.toLocaleString()}</div>
      </div>
    </div>
  )
}

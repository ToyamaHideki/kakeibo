import type { SecuritiesAccount } from '../types'
import { formatYen, ACCOUNT_TYPE_OPTIONS } from './securitiesUtils'

export function SecuritiesAccountCard({ account, onEdit }: { account: SecuritiesAccount; onEdit: (a: SecuritiesAccount) => void }) {
  const months = Object.keys(account.monthlyValues).sort()
  const latestYm = months[months.length - 1]
  const prevYm = months[months.length - 2]
  const latest = latestYm ? (account.monthlyValues[latestYm] ?? account.currentValue) : account.currentValue
  const prev = prevYm ? (account.monthlyValues[prevYm] ?? null) : null
  const diff = prev !== null ? latest - prev : null
  const diffPct = prev && prev > 0 ? (diff! / prev) * 100 : null
  const typeLabel = account.accountType
    ? ACCOUNT_TYPE_OPTIONS.find(o => o.value === account.accountType)?.label
    : undefined

  return (
    <button
      onClick={() => onEdit(account)}
      className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:border-gray-200 transition-colors"
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: account.color }} />
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="flex-1 text-sm font-semibold text-gray-800 truncate">{account.name}</span>
          {account.owner && (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-sage-50 text-sage-600 font-medium">{account.owner}</span>
          )}
          {typeLabel && (
            <span className="shrink-0 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{typeLabel}</span>
          )}
        </div>
        {account.broker && (
          <p className="text-[11px] text-gray-500 mb-2 truncate">{account.broker}</p>
        )}
        <div className="flex items-baseline justify-between">
          <span className="text-base font-bold text-gray-800">{formatYen(latest)}</span>
          {diff !== null && (
            <span className={`text-[11px] font-medium ${diff >= 0 ? 'text-sage-600' : 'text-red-500'}`}>
              {diff >= 0 ? '+' : ''}{formatYen(diff)}
              {diffPct !== null && (
                <span className="ml-1 text-[10px] text-gray-500">({diffPct >= 0 ? '+' : ''}{diffPct.toFixed(1)}%)</span>
              )}
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-500 mt-1">
          {latestYm ? `${latestYm.replace('-', '年')}月時点` : '未記録'}
        </p>
      </div>
    </button>
  )
}

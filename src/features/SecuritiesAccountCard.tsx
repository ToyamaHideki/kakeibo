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
  const isPrivate = account.visibility === 'private'
  const pnl = account.unrealizedPnL
  const holdingsCount = account.holdings?.length ?? 0

  return (
    <button
      onClick={() => onEdit(account)}
      className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:border-gray-200 transition-colors"
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: account.color }} />
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          {isPrivate && (
            <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-label="本人のみ表示">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          )}
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
        {pnl !== undefined && (
          <div className="flex items-baseline justify-between mt-0.5">
            <span className="text-[10px] text-gray-500">評価損益</span>
            <span className={`text-[11px] font-medium ${pnl >= 0 ? 'text-sage-600' : 'text-red-500'}`}>
              {pnl >= 0 ? '+' : ''}{formatYen(pnl)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between mt-1">
          <p className="text-[10px] text-gray-500">
            {latestYm ? `${latestYm.replace('-', '年')}月時点` : '未記録'}
          </p>
          {holdingsCount > 0 && (
            <span className="text-[10px] text-gray-500">商品{holdingsCount}件</span>
          )}
        </div>
      </div>
    </button>
  )
}

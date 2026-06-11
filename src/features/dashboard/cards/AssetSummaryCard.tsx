import { useState } from 'react'
import { useSavingsAccounts } from '../../../hooks/useSavingsAccounts'
import { useSecuritiesAccounts } from '../../../hooks/useSecuritiesAccounts'
import { formatYen, formatYenCompact } from '../../../utils/format'
import DashboardCard from '../DashboardCard'
import BalanceUpdateModal, { type BalanceUpdateTarget } from './BalanceUpdateModal'

interface Props {
  className?: string
}

export default function AssetSummaryCard({ className = '' }: Props) {
  const { accounts: savings, loading: savingsLoading, updateAccount } = useSavingsAccounts()
  const { accounts: securities, loading: secLoading, recordMonthlyValue } = useSecuritiesAccounts()
  const [target, setTarget] = useState<BalanceUpdateTarget | null>(null)

  const loading = savingsLoading || secLoading
  const bankTotal = savings.reduce((s, a) => s + a.currentAmount, 0)
  const secTotal = securities.reduce((s, a) => s + a.currentValue, 0)
  const grandTotal = bankTotal + secTotal
  const hasData = savings.length > 0 || securities.length > 0

  function openSavings(id: string) {
    const acc = savings.find(a => a.id === id)
    if (!acc) return
    setTarget({
      type: 'savings',
      account: acc,
      onSave: (currentAmount, lastUpdated) => updateAccount(acc.id, { currentAmount, lastUpdated }),
    })
  }

  function openSecurities(id: string) {
    const acc = securities.find(a => a.id === id)
    if (!acc) return
    setTarget({
      type: 'securities',
      account: acc,
      onSave: (ym, value) => recordMonthlyValue(acc.id, ym, value),
    })
  }

  return (
    <DashboardCard title="資産概要" to="/savings-management" className={className}>
      {loading ? (
        <div className="h-full flex items-center justify-center text-gray-400 text-sm">読み込み中…</div>
      ) : !hasData ? (
        <div className="h-full flex items-center justify-center text-center text-gray-400 text-sm px-4">
          口座が登録されていません
        </div>
      ) : (
        <div className="h-full flex flex-col gap-3 min-h-0">
          {/* 緑グラデーション：資産合計 */}
          <div className="bg-gradient-to-br from-sage-600 to-sage-800 rounded-xl px-3 py-2.5 text-white shadow-sm shrink-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[11px] font-medium opacity-75">資産合計</span>
              <span className="text-xl font-bold tabular-nums tracking-tight">{formatYen(grandTotal)}</span>
            </div>
            <div className="flex gap-3 text-[10px] mt-1 opacity-80">
              <span>貯蓄 {formatYenCompact(bankTotal)}</span>
              <span className="opacity-60">|</span>
              <span>証券 {formatYenCompact(secTotal)}</span>
            </div>
          </div>

          {/* 口座リスト */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
            {savings.length > 0 && (
              <AccountSection
                label="貯蓄口座"
                accounts={savings.map(a => ({ id: a.id, name: a.name, owner: a.owner, color: a.color, value: a.currentAmount }))}
                onClick={openSavings}
              />
            )}
            {securities.length > 0 && (
              <AccountSection
                label="証券口座"
                accounts={securities.map(a => ({ id: a.id, name: a.name, owner: a.owner, color: a.color, value: a.currentValue }))}
                onClick={openSecurities}
              />
            )}
          </div>
        </div>
      )}

      <BalanceUpdateModal target={target} onClose={() => setTarget(null)} />
    </DashboardCard>
  )
}

interface AccountRow {
  id: string
  name: string
  owner: string | undefined
  color: string
  value: number
}

function AccountSection({ label, accounts, onClick }: { label: string; accounts: AccountRow[]; onClick: (id: string) => void }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 px-0.5">{label}</p>
      <div className="space-y-1">
        {accounts.map(a => (
          <button
            key={a.id}
            onClick={() => onClick(a.id)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors text-left"
            aria-label={`${a.name}の残高を更新`}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
            <span className="flex-1 min-w-0 flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-700 truncate">{a.name}</span>
              {a.owner && (
                <span className="shrink-0 text-[9px] px-1 py-0.5 rounded-full bg-sage-50 text-sage-600 font-medium">{a.owner}</span>
              )}
            </span>
            <span className="shrink-0 text-xs font-semibold text-gray-700 tabular-nums">{formatYenCompact(a.value)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

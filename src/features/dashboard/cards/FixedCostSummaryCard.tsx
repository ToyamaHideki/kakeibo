import { useEffect, useMemo, useState } from 'react'
import { useHousehold } from '../../../hooks/useHousehold'
import { fetchFixedCosts } from '../../../firebase/firestore'
import type { FixedCost } from '../../../types'
import { sumApplicableFixedCosts } from '../dashboardUtils'
import DashboardCard from '../DashboardCard'

interface Props {
  year: number
  month: number
  className?: string
}

const yen = (n: number) => `¥${n.toLocaleString()}`

export default function FixedCostSummaryCard({ year, month, className = '' }: Props) {
  const { householdId } = useHousehold()
  const [costs, setCosts] = useState<FixedCost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId) return
    let active = true
    setLoading(true)
    fetchFixedCosts(householdId)
      .then(data => { if (active) setCosts(data) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [householdId])

  const { total, fixedCount, variableCount } = useMemo(
    () => sumApplicableFixedCosts(costs, year, month),
    [costs, year, month],
  )
  const itemCount = fixedCount + variableCount

  return (
    <DashboardCard
      title="固定費"
      titleNote={
        !loading && itemCount > 0 ? (
          <span>
            固定費：{fixedCount}件
            <span className="ml-2">変動費：{variableCount}件</span>
          </span>
        ) : undefined
      }
      to="/fixed-costs"
      className={className}
    >
      {loading ? (
        <div className="h-full flex items-center justify-center text-gray-400 text-sm">読み込み中…</div>
      ) : itemCount === 0 ? (
        <div className="h-full flex items-center justify-center text-gray-400 text-sm">この月の固定費はありません</div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-gray-800 tabular-nums">{yen(total)}</p>
          {variableCount > 0 && <p className="text-[11px] text-gray-400 mt-1">※変動費は含まない</p>}
        </div>
      )}
    </DashboardCard>
  )
}

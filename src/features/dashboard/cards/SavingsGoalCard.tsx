import { useState } from 'react'
import { useSavingsGoals } from '../../../hooks/useSavingsGoals'
import { currentYearMonth } from '../../../utils/date'
import { formatYenCompact } from '../../../utils/format'
import SavingsContributionModal from './SavingsContributionModal'
import DashboardCard from '../DashboardCard'
import type { SavingsGoal } from '../../../types'

interface Props {
  className?: string
}

export default function SavingsGoalCard({ className = '' }: Props) {
  const { goals, loading, logContribution } = useSavingsGoals()
  const [editTargetId, setEditTargetId] = useState<string | null>(null)

  const editTarget = editTargetId !== null ? goals.find(g => g.id === editTargetId) ?? null : null

  function openContribution(goal: SavingsGoal) {
    setEditTargetId(goal.id)
  }

  function closeModal() {
    setEditTargetId(null)
  }

  async function handleLogContribution(amount: number) {
    if (!editTarget) return
    await logContribution(editTarget.id, currentYearMonth(), amount)
  }

  return (
    <DashboardCard title="貯蓄目標" to="/goals" className={className}>
      {loading ? (
        <div className="h-full flex items-center justify-center text-gray-400 text-sm">読み込み中…</div>
      ) : goals.length === 0 ? (
        <div className="h-full flex items-center justify-center text-center text-gray-400 text-sm px-4">
          貯蓄目標が設定されていません
        </div>
      ) : (
        <div className="space-y-2.5 overflow-y-auto h-full min-h-0 pr-1">
          {goals.map(g => {
            const rate = g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0
            const pct = Math.min(100, Math.round(rate * 100))
            const achieved = g.currentAmount >= g.targetAmount && g.targetAmount > 0
            return (
              <button
                key={g.id}
                onClick={() => openContribution(g)}
                className="w-full text-left rounded-md p-1 -m-1 hover:bg-gray-50 transition-colors"
                aria-label={`${g.name}の積立を記録`}
              >
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="font-medium text-gray-600 truncate flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                    <span className="truncate">{g.name}</span>
                  </span>
                  <span className="tabular-nums text-gray-500 shrink-0 ml-2">
                    {formatYenCompact(g.currentAmount)} / {formatYenCompact(g.targetAmount)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: achieved ? '#4a7c59' : g.color }}
                  />
                </div>
              </button>
            )
          })}
        </div>
      )}

      <SavingsContributionModal
        isOpen={editTarget !== null}
        goal={editTarget}
        onLogContribution={handleLogContribution}
        onClose={closeModal}
      />
    </DashboardCard>
  )
}

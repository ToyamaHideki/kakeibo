import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import '../../../lib/chart'
import type { Transaction } from '../../../types'
import { buildMonthlyTrend } from '../dashboardUtils'
import DashboardCard from '../DashboardCard'

interface Props {
  monthData: Record<string, Transaction[]> // "yyyy-MM" → transactions
  loading: boolean
  year: number
  className?: string
}

const yen = (n: number) => `¥${n.toLocaleString()}`

export default function TrendChartCard({ monthData, loading, year, className = '' }: Props) {
  const { labels, incomes, expenses } = useMemo(
    () => buildMonthlyTrend(monthData, year),
    [monthData, year],
  )

  const totalIncome = incomes.reduce((s, v) => s + v, 0)
  const totalExpense = expenses.reduce((s, v) => s + v, 0)
  const totalBalance = totalIncome - totalExpense

  const hasData = incomes.some(v => v > 0) || expenses.some(v => v > 0)

  const data = {
    labels,
    datasets: [
      { label: '収入', data: incomes, backgroundColor: '#72a358' }, // sage-400
      { label: '支出', data: expenses, backgroundColor: '#e67452' }, // terracotta-400
    ],
  }

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { ticks: { callback: v => `¥${Number(v).toLocaleString()}` } },
    },
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
    },
  }

  return (
    <DashboardCard title={`収支推移（${year}年）`} to="/annual" className={className}>
      <div className="flex flex-col h-full">
        {loading ? (
          <div className="flex-1 min-h-0 flex items-center justify-center text-gray-400 text-sm">読み込み中…</div>
        ) : hasData ? (
          <>
            <div className="flex-1 min-h-0"><Bar data={data} options={options} /></div>
            <div className="grid grid-cols-3 gap-2 text-center mt-4 pt-3 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500 mb-1">収入</p>
                <p className="text-base font-bold text-sage-600 tabular-nums">{yen(totalIncome)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">支出</p>
                <p className="text-base font-bold text-terracotta-500 tabular-nums">{yen(totalExpense)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">合計</p>
                <p className={`text-base font-bold tabular-nums ${totalBalance >= 0 ? 'text-sage-600' : 'text-terracotta-500'}`}>
                  {yen(totalBalance)}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 min-h-0 flex items-center justify-center text-gray-400 text-sm">データがありません</div>
        )}
      </div>
    </DashboardCard>
  )
}

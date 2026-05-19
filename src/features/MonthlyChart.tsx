import { useState } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import type { ChartOptions, TooltipItem } from 'chart.js'
import '../lib/chart'
import type { Category, Transaction } from '../types'

interface Props {
  transactions: Transaction[]
  categories: Category[]
  fillHeight?: boolean
}

export default function MonthlyChart({ transactions, categories, fillHeight = false }: Props) {
  const [chartView, setChartView] = useState<'bar' | 'pie'>('bar')

  const incomeByCategory = categories
    .filter(c => c.type === 'income')
    .map(c => ({
      ...c,
      total: transactions
        .filter(t => t.type === 'income' && t.categoryId === c.id)
        .reduce((s, t) => s + t.amount, 0),
    }))
    .filter(d => d.total > 0)

  const expenseByCategory = categories
    .filter(c => c.type === 'expense')
    .map(c => ({
      ...c,
      total: transactions
        .filter(t => t.type === 'expense' && t.categoryId === c.id)
        .reduce((s, t) => s + t.amount, 0),
    }))
    .filter(d => d.total > 0)

  const hasData = incomeByCategory.length > 0 || expenseByCategory.length > 0
  const hasExpense = expenseByCategory.length > 0

  // ─── 棒グラフ ───────────────────────────────────────────────────────────────

  const barData = {
    labels: ['収入', '支出'],
    datasets: [
      ...incomeByCategory.map(c => ({
        label: c.name,
        data: [c.total, 0],
        backgroundColor: c.color,
      })),
      ...expenseByCategory.map(c => ({
        label: c.name,
        data: [0, c.total],
        backgroundColor: c.color,
      })),
    ],
  }

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { stacked: true },
      y: {
        stacked: true,
        ticks: {
          callback: value => `¥${Number(value).toLocaleString()}`,
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'bar'>) => {
            const y = ctx.parsed.y ?? 0
            const barIndex = ctx.dataIndex
            const datasets = ctx.chart.data.datasets as { data: number[] }[]
            const total = datasets.reduce((sum, ds) => sum + (ds.data[barIndex] || 0), 0)
            const pct = total > 0 ? Math.round((y / total) * 100) : 0
            return `${ctx.dataset.label ?? ''}: ¥${y.toLocaleString()} (${pct}%)`
          },
        },
      },
    },
  }

  // ─── ドーナツグラフ ──────────────────────────────────────────────────────────

  const expenseTotal = expenseByCategory.reduce((s, c) => s + c.total, 0)

  const doughnutData = {
    labels: expenseByCategory.map(c => c.name),
    datasets: [
      {
        data: expenseByCategory.map(c => c.total),
        backgroundColor: expenseByCategory.map(c => c.color),
        borderWidth: 1,
        borderColor: '#fff',
      },
    ],
  }

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'doughnut'>) => {
            const pct = expenseTotal > 0 ? Math.round((ctx.parsed / expenseTotal) * 100) : 0
            return `${ctx.label ?? ''}: ¥${ctx.parsed.toLocaleString()} (${pct}%)`
          },
        },
      },
    },
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4${fillHeight ? ' flex flex-col flex-1 min-h-0' : ''}`}>
      {/* サブトグル */}
      <div className="flex justify-center mb-4">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => setChartView('bar')}
            className={`px-4 py-1.5 transition-colors ${
              chartView === 'bar'
                ? 'bg-sage-600 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            収支比較
          </button>
          <button
            type="button"
            onClick={() => setChartView('pie')}
            className={`px-4 py-1.5 transition-colors ${
              chartView === 'pie'
                ? 'bg-sage-600 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            支出内訳
          </button>
        </div>
      </div>

      {/* グラフ本佁E*/}
      {chartView === 'bar' ? (
        hasData ? (
          <div className={fillHeight ? 'flex-1 min-h-0' : 'h-72'}>
            <Bar data={barData} options={barOptions} />
          </div>
        ) : (
          <div className={`${fillHeight ? 'flex-1 min-h-0' : 'h-72'} flex items-center justify-center text-gray-500 text-sm`}>
            今月のデータがありません
          </div>
        )
      ) : hasExpense ? (
        <div className={fillHeight ? 'flex-1 min-h-0' : 'h-72'}>
          <Doughnut data={doughnutData} options={doughnutOptions} />
        </div>
      ) : (
        <div className={`${fillHeight ? 'flex-1 min-h-0' : 'h-72'} flex items-center justify-center text-gray-500 text-sm`}>
          今月の支出データがありません
        </div>
      )}
    </div>
  )
}

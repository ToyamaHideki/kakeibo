import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MonthlyChart from '../features/MonthlyChart'
import type { Category, Transaction } from '../types'

// Chart.js はキャンバス API が不要なスタブに差し替える
vi.mock('react-chartjs-2', () => ({
  Bar: ({ data }: { data: { labels: string[] } }) => (
    <div data-testid="bar-chart">{data.labels.join(',')}</div>
  ),
  Doughnut: ({ data }: { data: { labels: string[] } }) => (
    <div data-testid="doughnut-chart">{data.labels.join(',')}</div>
  ),
}))

const CATEGORIES: Category[] = [
  { id: 'c1', name: '食費', type: 'expense', color: '#f00', order: 0 },
  { id: 'c2', name: '給与', type: 'income', color: '#0f0', order: 1 },
]

const TRANSACTIONS: Transaction[] = [
  { id: 't1', type: 'expense', amount: 5000, categoryId: 'c1', date: '2025-03-01', memo: '' },
  { id: 't2', type: 'income', amount: 300000, categoryId: 'c2', date: '2025-03-25', memo: '' },
]

describe('MonthlyChart', () => {
  it('デフォルトで「収支比較」ボタンがアクティブになっている', () => {
    render(<MonthlyChart transactions={TRANSACTIONS} categories={CATEGORIES} />)
    const barBtn = screen.getByRole('button', { name: '収支比較' })
    expect(barBtn.className).toContain('bg-sage-600')
  })

  it('データがある場合、棒グラフを表示する', () => {
    render(<MonthlyChart transactions={TRANSACTIONS} categories={CATEGORIES} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('「支出内訳」をクリックするとドーナツグラフに切り替わる', async () => {
    render(<MonthlyChart transactions={TRANSACTIONS} categories={CATEGORIES} />)
    await userEvent.click(screen.getByRole('button', { name: '支出内訳' }))
    expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument()
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
  })

  it('「収支比較」に戻すと棒グラフが表示される', async () => {
    render(<MonthlyChart transactions={TRANSACTIONS} categories={CATEGORIES} />)
    await userEvent.click(screen.getByRole('button', { name: '支出内訳' }))
    await userEvent.click(screen.getByRole('button', { name: '収支比較' }))
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('トランザクションなしで「今月のデータがありません」を表示する', () => {
    render(<MonthlyChart transactions={[]} categories={CATEGORIES} />)
    expect(screen.getByText('今月のデータがありません')).toBeInTheDocument()
  })

  it('支出なしで「支出内訳」ビューに切り替えると「今月の支出データがありません」を表示する', async () => {
    const incomeOnly = TRANSACTIONS.filter(t => t.type === 'income')
    render(<MonthlyChart transactions={incomeOnly} categories={CATEGORIES} />)
    await userEvent.click(screen.getByRole('button', { name: '支出内訳' }))
    expect(screen.getByText('今月の支出データがありません')).toBeInTheDocument()
  })
})

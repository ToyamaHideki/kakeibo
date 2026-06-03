import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useOutletContext } from 'react-router-dom'
import MonthlyPage from '../pages/MonthlyPage'
import type { Category, PaymentMethod, Transaction } from '../types'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useParams: vi.fn(() => ({ yearMonth: '2025-03' })),
  useNavigate: vi.fn(() => mockNavigate),
  useOutletContext: vi.fn(),
}))
vi.mock('../hooks/useHousehold', () => ({
  useHousehold: vi.fn(() => ({
    payDay: null,
    transactionListDisplayMode: 'date',
    householdId: 'hh-test',
    isGuest: false,
    reloadHousehold: vi.fn(),
  })),
}))
vi.mock('../hooks/useMonthlyData', () => ({
  useMonthlyData: vi.fn(),
}))
// 子コンポーネントをスタブ化（内部のFirebase依存を排除）
vi.mock('../features/TransactionList', () => ({
  default: ({ transactions }: { transactions: Transaction[] }) => (
    <div data-testid="transaction-list">{transactions.length}件</div>
  ),
}))
vi.mock('../features/TransactionModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="transaction-modal">モーダル</div> : null,
}))
vi.mock('../features/MonthlyChart', () => ({
  default: () => <div data-testid="monthly-chart" />,
}))
vi.mock('../components/YearMonthPicker', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="year-month-picker" /> : null,
}))

import { useMonthlyData } from '../hooks/useMonthlyData'

const CATEGORIES: Category[] = [
  { id: 'ce1', name: '食費', type: 'expense', color: '#f00', order: 0 },
  { id: 'ci1', name: '給与', type: 'income', color: '#0f0', order: 0 },
]
const PAYMENT_METHODS: PaymentMethod[] = [{ id: 'pm1', name: 'クレカ', order: 0 }]
const TRANSACTIONS: Transaction[] = [
  { id: 't1', type: 'income', amount: 300000, categoryId: 'ci1', date: '2025-03-25', memo: '' },
  { id: 't2', type: 'expense', amount: 50000, categoryId: 'ce1', date: '2025-03-15', memo: '' },
]

const OUTLET_CONTEXT = {
  categories: CATEGORIES,
  paymentMethods: PAYMENT_METHODS,
  onCategoryAdded: vi.fn(),
  onPaymentMethodAdded: vi.fn(),
  onCategoryDeleted: vi.fn(),
  onPaymentMethodDeleted: vi.fn(),
  onCategoryUpdated: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useOutletContext).mockReturnValue(OUTLET_CONTEXT)
  vi.mocked(useMonthlyData).mockReturnValue({
    transactions: TRANSACTIONS, loading: false, reload: vi.fn(),
  })
})

describe('MonthlyPage', () => {
  it('月ラベルを表示する', () => {
    render(<MonthlyPage />)
    expect(screen.getByText('2025年3月')).toBeInTheDocument()
  })

  it('収入・支出・差引の収支サマリーを表示する', () => {
    render(<MonthlyPage />)
    // モバイル・デスクトップで同じ値が2回レンダリングされるため getAllByText を使用
    expect(screen.getAllByText(/¥300,000/).length).toBeGreaterThan(0)  // 収入
    expect(screen.getAllByText(/¥50,000/).length).toBeGreaterThan(0)   // 支出
    expect(screen.getAllByText(/¥250,000/).length).toBeGreaterThan(0)  // 差引
  })

  it('トランザクションリストを表示する', () => {
    render(<MonthlyPage />)
    expect(screen.getAllByTestId('transaction-list')[0]).toBeInTheDocument()
    expect(screen.getAllByText('2件').length).toBeGreaterThan(0)
  })

  it('前月ボタンで前月にナビゲートする', async () => {
    render(<MonthlyPage />)
    await userEvent.click(screen.getByRole('button', { name: '前の月' }))
    expect(mockNavigate).toHaveBeenCalledWith('/months/2025-02')
  })

  it('次月ボタンで次月にナビゲートする', async () => {
    render(<MonthlyPage />)
    await userEvent.click(screen.getByRole('button', { name: '次の月' }))
    expect(mockNavigate).toHaveBeenCalledWith('/months/2025-04')
  })

  it('FABボタンをクリックすると新規登録モーダルが表示される', async () => {
    render(<MonthlyPage />)
    const fab = screen.getByRole('button', { name: '収支を登録' })
    await userEvent.click(fab)
    expect(screen.getByTestId('transaction-modal')).toBeInTheDocument()
  })

  it('ロード中はリストを表示しない', () => {
    vi.mocked(useMonthlyData).mockReturnValue({ transactions: [], loading: true, reload: vi.fn() })
    render(<MonthlyPage />)
    expect(screen.queryByTestId('transaction-list')).not.toBeInTheDocument()
  })
})

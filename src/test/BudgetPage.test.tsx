import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BudgetPage from '../pages/BudgetPage'
import type { Category, Transaction } from '../types'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useParams: vi.fn(() => ({ yearMonth: '2025-03' })),
  useNavigate: vi.fn(() => mockNavigate),
}))
vi.mock('../hooks/useHousehold', () => ({
  useHousehold: vi.fn(() => ({ payDay: null })),
}))
vi.mock('../hooks/useCategories', () => ({
  useCategories: vi.fn(),
}))
vi.mock('../hooks/useMonthlyData', () => ({
  useMonthlyData: vi.fn(),
}))
vi.mock('../hooks/useBudget', () => ({
  useBudget: vi.fn(),
}))

import { useCategories } from '../hooks/useCategories'
import { useMonthlyData } from '../hooks/useMonthlyData'
import { useBudget } from '../hooks/useBudget'

const EXPENSE_CATS: Category[] = [
  { id: 'c1', name: '食費', type: 'expense', color: '#f00', order: 0 },
  { id: 'c2', name: '交通費', type: 'expense', color: '#00f', order: 1 },
]
const INCOME_CAT: Category = { id: 'ci1', name: '給与', type: 'income', color: '#0f0', order: 0 }
const TRANSACTIONS: Transaction[] = [
  { id: 't1', type: 'expense', amount: 8000, categoryId: 'c1', date: '2025-03-10', memo: '' },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useCategories).mockReturnValue({ categories: [...EXPENSE_CATS, INCOME_CAT], loading: false, addCategoryLocally: vi.fn(), removeCategoryLocally: vi.fn() })
  vi.mocked(useMonthlyData).mockReturnValue({ transactions: TRANSACTIONS, loading: false, reload: vi.fn() })
  vi.mocked(useBudget).mockReturnValue({
    budgets: { c1: 10000 },
    loading: false,
    saveBudgetAmount: vi.fn().mockResolvedValue(undefined),
  })
})

describe('BudgetPage', () => {
  it('ロード中は「読み込み中...」を表示する', () => {
    vi.mocked(useBudget).mockReturnValue({ budgets: {}, loading: true, saveBudgetAmount: vi.fn() })
    render(<BudgetPage />)
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('支出カテゴリ名を表示する（収入カテゴリは表示しない）', () => {
    render(<BudgetPage />)
    expect(screen.getByText('食費')).toBeInTheDocument()
    expect(screen.getByText('交通費')).toBeInTheDocument()
    expect(screen.queryByText('給与')).not.toBeInTheDocument()
  })

  it('既存の予算値がインプットに表示される', () => {
    render(<BudgetPage />)
    expect(screen.getByDisplayValue('10000')).toBeInTheDocument()
  })

  it('予算入力してフォーカスを外すと saveBudgetAmount が呼ばれる', async () => {
    const saveBudgetAmount = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useBudget).mockReturnValue({ budgets: {}, loading: false, saveBudgetAmount })
    render(<BudgetPage />)

    const inputs = screen.getAllByRole('spinbutton')
    await userEvent.type(inputs[0], '20000')
    fireEvent.blur(inputs[0])

    await waitFor(() => expect(saveBudgetAmount).toHaveBeenCalledWith('c1', 20000))
  })

  it('前月ボタンクリックで前月にナビゲートする', async () => {
    render(<BudgetPage />)
    // 前月方向の矢印ボタン（最初のボタン）
    const prevButton = screen.getAllByRole('button')[0]
    await userEvent.click(prevButton)
    expect(mockNavigate).toHaveBeenCalledWith('/budget/2025-02')
  })

  it('次月ボタンクリックで次月にナビゲートする', async () => {
    render(<BudgetPage />)
    const buttons = screen.getAllByRole('button')
    const nextButton = buttons[1]
    await userEvent.click(nextButton)
    expect(mockNavigate).toHaveBeenCalledWith('/budget/2025-04')
  })

  it('実績が予算の80%以上でパーセントがオレンジ表示される', () => {
    // 食費: 予算10000, 実績8000 → 80%
    render(<BudgetPage />)
    const pctElems = screen.getAllByText('80%')
    const orangeElem = pctElems.find(el => el.className.includes('text-orange-500'))
    expect(orangeElem).toBeDefined()
  })

  it('実績が予算を超えるとパーセントが赤表示される', () => {
    vi.mocked(useMonthlyData).mockReturnValue({
      transactions: [{ id: 't1', type: 'expense', amount: 12000, categoryId: 'c1', date: '2025-03-10', memo: '' }],
      loading: false,
      reload: vi.fn(),
    })
    render(<BudgetPage />)
    const pctElems = screen.getAllByText('120%')
    const redElem = pctElems.find(el => el.className.includes('text-red-500'))
    expect(redElem).toBeDefined()
  })
})

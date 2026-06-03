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
  useHousehold: vi.fn(() => ({ payDay: null, householdId: 'hh1' })),
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
vi.mock('../firebase/firestore', () => ({
  copyBudgetFromPrevious: vi.fn(),
  updateCategory: vi.fn().mockResolvedValue(undefined),
}))

import { useCategories } from '../hooks/useCategories'
import { useMonthlyData } from '../hooks/useMonthlyData'
import { useBudget } from '../hooks/useBudget'
import { copyBudgetFromPrevious } from '../firebase/firestore'

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
  vi.mocked(useCategories).mockReturnValue({
    categories: [...EXPENSE_CATS, INCOME_CAT],
    loading: false,
    addCategoryLocally: vi.fn(),
    removeCategoryLocally: vi.fn(),
    updateCategoryLocally: vi.fn(),
    reload: vi.fn().mockResolvedValue(undefined),
  })
  vi.mocked(useMonthlyData).mockReturnValue({ transactions: TRANSACTIONS, loading: false, reload: vi.fn() })
  vi.mocked(useBudget).mockReturnValue({
    budgets: { c1: 10000 },
    loading: false,
    saveBudgetAmount: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
  })
  vi.mocked(copyBudgetFromPrevious).mockResolvedValue(3)
})

describe('BudgetPage', () => {
  it('ロード中は「読み込み中...」を表示する', () => {
    vi.mocked(useBudget).mockReturnValue({ budgets: {}, loading: true, saveBudgetAmount: vi.fn(), reload: vi.fn() })
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
    vi.mocked(useBudget).mockReturnValue({ budgets: {}, loading: false, saveBudgetAmount, reload: vi.fn() })
    render(<BudgetPage />)

    const inputs = screen.getAllByRole('spinbutton')
    await userEvent.type(inputs[0]!, '20000')
    fireEvent.blur(inputs[0]!)

    await waitFor(() => expect(saveBudgetAmount).toHaveBeenCalledWith('c1', 20000))
  })

  it('前月ボタンクリックで前月にナビゲートする', async () => {
    render(<BudgetPage />)
    // 月ナビゲーションの前月方向の矢印ボタン（最初のボタン）
    const prevButton = screen.getAllByRole('button')[0]!
    await userEvent.click(prevButton)
    expect(mockNavigate).toHaveBeenCalledWith('/budget/2025-02')
  })

  it('次月ボタンクリックで次月にナビゲートする', async () => {
    render(<BudgetPage />)
    const buttons = screen.getAllByRole('button')
    const nextButton = buttons[1]!
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

describe('BudgetPage - 前月引き継ぎ', () => {
  it('引き継ぎボタンクリックで copyBudgetFromPrevious が呼ばれる', async () => {
    vi.mocked(copyBudgetFromPrevious).mockResolvedValue(3)
    render(<BudgetPage />)
    await userEvent.click(screen.getByRole('button', { name: /前月の予算を引き継ぐ/ }))
    await waitFor(() => {
      expect(copyBudgetFromPrevious).toHaveBeenCalledWith('hh1', '2025-03', '2025-02')
    })
  })

  it('補完件数が 0 件で「引き継ぐ予算がありません」トースト表示', async () => {
    vi.mocked(copyBudgetFromPrevious).mockResolvedValue(0)
    render(<BudgetPage />)
    await userEvent.click(screen.getByRole('button', { name: /前月の予算を引き継ぐ/ }))
    await waitFor(() => {
      expect(screen.getByText('引き継ぐ予算がありません')).toBeInTheDocument()
    })
  })

  it('補完成功時に件数トースト表示', async () => {
    vi.mocked(copyBudgetFromPrevious).mockResolvedValue(3)
    render(<BudgetPage />)
    await userEvent.click(screen.getByRole('button', { name: /前月の予算を引き継ぐ/ }))
    await waitFor(() => {
      expect(screen.getByText(/3 件の予算を引き継ぎました/)).toBeInTheDocument()
    })
  })
})

describe('BudgetPage - グルーピング', () => {
  it('予算設定済みカテゴリは「予算設定済み」セクションに表示', () => {
    // c1 に 10000（assigned）、c2 は未設定（unassigned）
    render(<BudgetPage />)
    expect(screen.getByText(/予算設定済み/)).toBeInTheDocument()
    expect(screen.getByText(/予算未設定/)).toBeInTheDocument()
  })

  it('全て未設定なら「予算設定済み」セクションは非表示', () => {
    vi.mocked(useBudget).mockReturnValue({
      budgets: {}, loading: false, saveBudgetAmount: vi.fn(), reload: vi.fn(),
    })
    render(<BudgetPage />)
    expect(screen.queryByText(/予算設定済み/)).not.toBeInTheDocument()
    expect(screen.getByText(/予算未設定/)).toBeInTheDocument()
  })
})

describe('BudgetPage - 並べ替えモード', () => {
  it('並べ替えボタンで isReordering トグル、ボタンが「完了」になる', async () => {
    render(<BudgetPage />)
    await userEvent.click(screen.getByRole('button', { name: '並べ替え' }))
    expect(screen.getByRole('button', { name: '完了' })).toBeInTheDocument()
  })

  it('並べ替えモード時、予算入力フィールドは disabled', async () => {
    render(<BudgetPage />)
    await userEvent.click(screen.getByRole('button', { name: '並べ替え' }))
    const inputs = screen.queryAllByRole('spinbutton')
    inputs.forEach(input => expect(input).toBeDisabled())
  })
})

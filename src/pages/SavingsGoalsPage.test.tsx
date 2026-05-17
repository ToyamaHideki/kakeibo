import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SavingsGoalsPage from './SavingsGoalsPage'
import type { SavingsGoal } from '../types'

vi.mock('../hooks/useHousehold', () => ({
  useHousehold: vi.fn(() => ({ householdId: 'hh-test' })),
}))
vi.mock('../hooks/useSavingsGoals', () => ({
  useSavingsGoals: vi.fn(),
}))
vi.mock('../firebase/firestore', () => ({
  appendCfLifeEvent: vi.fn().mockResolvedValue(undefined),
}))

import { useSavingsGoals } from '../hooks/useSavingsGoals'

const GOAL: SavingsGoal = {
  id: 'g1', name: '旅行費', order: 0,
  targetAmount: 200000, currentAmount: 50000,
  color: '#4a7c59', contributions: {},
}

const DEFAULT_HOOK = {
  goals: [GOAL],
  loading: false,
  addGoal: vi.fn().mockResolvedValue(undefined),
  updateGoal: vi.fn().mockResolvedValue(undefined),
  deleteGoal: vi.fn().mockResolvedValue(undefined),
  logContribution: vi.fn().mockResolvedValue(undefined),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useSavingsGoals).mockReturnValue(DEFAULT_HOOK)
})

describe('SavingsGoalsPage', () => {
  it('ロード中は「読み込み中...」を表示する', () => {
    vi.mocked(useSavingsGoals).mockReturnValue({ ...DEFAULT_HOOK, loading: true })
    render(<SavingsGoalsPage />)
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('goals が空のとき「目標がありません」を表示する', () => {
    vi.mocked(useSavingsGoals).mockReturnValue({ ...DEFAULT_HOOK, goals: [] })
    render(<SavingsGoalsPage />)
    expect(screen.getByText('目標がありません')).toBeInTheDocument()
  })

  it('目標名を表示する', () => {
    render(<SavingsGoalsPage />)
    expect(screen.getByText('旅行費')).toBeInTheDocument()
  })

  it('FABボタンをクリックするとモーダルが開く', async () => {
    render(<SavingsGoalsPage />)
    // FABは固定位置のボタン（aria-label なし・SVGのみ）
    const buttons = screen.getAllByRole('button')
    const fab = buttons[buttons.length - 1]  // ページ内の最後のボタンがFAB
    await userEvent.click(fab)
    expect(screen.getByText('目標を追加')).toBeInTheDocument()
  })

  it('モーダルで目標名と金額を入力して保存すると addGoal が呼ばれる', async () => {
    const addGoal = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useSavingsGoals).mockReturnValue({ ...DEFAULT_HOOK, addGoal })
    render(<SavingsGoalsPage />)

    // FAB クリック
    const buttons = screen.getAllByRole('button')
    await userEvent.click(buttons[buttons.length - 1])

    // フォーム入力
    const nameInput = screen.getByPlaceholderText('例：マイホーム頭金')
    await userEvent.type(nameInput, '車の購入')
    const amountInputs = screen.getAllByRole('spinbutton')
    await userEvent.type(amountInputs[0], '1000000')

    // 保存
    await userEvent.click(screen.getByRole('button', { name: '追加する' }))

    await waitFor(() => expect(addGoal).toHaveBeenCalledOnce())
    expect(addGoal.mock.calls[0][0]).toMatchObject({ name: '車の購入', targetAmount: 1000000 })
  })

  it('目標名が空のとき保存ボタンは disabled', async () => {
    render(<SavingsGoalsPage />)
    const buttons = screen.getAllByRole('button')
    await userEvent.click(buttons[buttons.length - 1])
    expect(screen.getByRole('button', { name: '追加する' })).toBeDisabled()
  })

  it('目標をクリックすると編集モーダルが開く', async () => {
    render(<SavingsGoalsPage />)
    await userEvent.click(screen.getByText('旅行費'))
    expect(screen.getByText('目標を編集')).toBeInTheDocument()
  })
})

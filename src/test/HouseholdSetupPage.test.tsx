import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from 'firebase/auth'
import HouseholdSetupPage from '../pages/HouseholdSetupPage'

const mockReloadHousehold = vi.fn()

vi.mock('../hooks/useHousehold', () => ({
  useHousehold: vi.fn(),
}))
vi.mock('../firebase/householdFirestore', () => ({
  createHousehold: vi.fn(),
  joinHousehold: vi.fn(),
}))
vi.mock('../firebase/auth', () => ({
  signOut: vi.fn(),
}))
vi.mock('../components/ConfirmDialog', () => ({
  default: ({ isOpen, onConfirm, onCancel }: {
    isOpen: boolean
    onConfirm: () => void
    onCancel: () => void
  }) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <button onClick={onConfirm}>confirm</button>
        <button onClick={onCancel}>cancel</button>
      </div>
    ) : null,
}))

import { useHousehold } from '../hooks/useHousehold'
import * as householdFirestore from '../firebase/householdFirestore'

const DEFAULT_HH = {
  user: { uid: 'u1', displayName: 'テスト太郎', email: 'test@example.com' } as unknown as User,
  householdId: null,
  state: 'needs_setup' as const,
  payDay: null,
  transactionListDisplayMode: 'date' as const,
  isGuest: false,
  reloadHousehold: mockReloadHousehold,
  applyGuestSettings: () => {},
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useHousehold).mockReturnValue(DEFAULT_HH)
})

// ────────────────────────────────────────────────────────────────
// モード切り替え
// ────────────────────────────────────────────────────────────────
describe('HouseholdSetupPage モード選択', () => {
  it('初期表示で選択画面が出る', () => {
    render(<HouseholdSetupPage />)
    expect(screen.getByText('新しい世帯を作成')).toBeInTheDocument()
    expect(screen.getByText('招待コードで参加')).toBeInTheDocument()
  })

  it('「新しい世帯を作成」クリックで作成モードに切り替わる', async () => {
    render(<HouseholdSetupPage />)
    await userEvent.click(screen.getByText('新しい世帯を作成'))
    expect(screen.getByText('世帯を作成する')).toBeInTheDocument()
  })

  it('「招待コードで参加」クリックで参加モードに切り替わる', async () => {
    render(<HouseholdSetupPage />)
    await userEvent.click(screen.getByText('招待コードで参加'))
    expect(screen.getByPlaceholderText(/招待コード/)).toBeInTheDocument()
  })
})

// ────────────────────────────────────────────────────────────────
// 世帯作成
// ────────────────────────────────────────────────────────────────
describe('HouseholdSetupPage 世帯作成', () => {
  it('「世帯を作成する」クリックで createHousehold が呼ばれ reloadHousehold が実行される', async () => {
    vi.mocked(householdFirestore.createHousehold).mockResolvedValue('new-hh-id')

    render(<HouseholdSetupPage />)
    await userEvent.click(screen.getByText('新しい世帯を作成'))
    await userEvent.click(screen.getByText('世帯を作成する'))

    expect(householdFirestore.createHousehold).toHaveBeenCalledWith('u1', 'テスト太郎')
    expect(mockReloadHousehold).toHaveBeenCalled()
  })

  it('createHousehold 失敗時にエラーメッセージが表示される', async () => {
    vi.mocked(householdFirestore.createHousehold).mockRejectedValue(new Error('Firestore error'))

    render(<HouseholdSetupPage />)
    await userEvent.click(screen.getByText('新しい世帯を作成'))
    await userEvent.click(screen.getByText('世帯を作成する'))

    expect(screen.getByText('世帯の作成に失敗しました。もう一度お試しください。')).toBeInTheDocument()
    expect(mockReloadHousehold).not.toHaveBeenCalled()
  })
})

// ────────────────────────────────────────────────────────────────
// 招待コード入力 — 回帰テスト
// ────────────────────────────────────────────────────────────────
describe('HouseholdSetupPage 招待コード入力フィールド（回帰防止）', () => {
  async function openJoinMode() {
    render(<HouseholdSetupPage />)
    await userEvent.click(screen.getByText('招待コードで参加'))
    return screen.getByPlaceholderText(/招待コード/)
  }

  it('maxLength は 10', async () => {
    const input = await openJoinMode()
    expect(input).toHaveAttribute('maxLength', '10')
  })

  it('9 文字以下では参加ボタンが disabled', async () => {
    const input = await openJoinMode()
    await userEvent.type(input, 'ABCDE12XY') // 9文字
    expect(screen.getByText('参加する')).toBeDisabled()
  })

  it('10 文字入力で参加ボタンが有効になる', async () => {
    const input = await openJoinMode()
    await userEvent.type(input, 'ABCDE12XYZ') // 10文字
    expect(screen.getByText('参加する')).not.toBeDisabled()
  })

  it('入力が大文字に変換される', async () => {
    const input = await openJoinMode()
    await userEvent.type(input, 'abcde12xyz')
    expect(input).toHaveValue('ABCDE12XYZ')
  })
})

// ────────────────────────────────────────────────────────────────
// 招待コードで参加（フロー）
// ────────────────────────────────────────────────────────────────
describe('HouseholdSetupPage 招待コードで参加', () => {
  const INVITE_CODE = 'ABCDE12XYZ'

  async function typeAndJoin(code = INVITE_CODE) {
    render(<HouseholdSetupPage />)
    await userEvent.click(screen.getByText('招待コードで参加'))
    const input = screen.getByPlaceholderText(/招待コード/)
    await userEvent.type(input, code)
    await userEvent.click(screen.getByText('参加する'))
  }

  it('成功時に joinHousehold が呼ばれ reloadHousehold が実行される', async () => {
    vi.mocked(householdFirestore.joinHousehold).mockResolvedValue({ status: 'success', householdId: 'hh1' })

    await typeAndJoin()

    expect(householdFirestore.joinHousehold).toHaveBeenCalledWith('u1', INVITE_CODE, 'テスト太郎', { forceSwitch: false })
    expect(mockReloadHousehold).toHaveBeenCalled()
  })

  it('not_found 時にエラーメッセージが表示される', async () => {
    vi.mocked(householdFirestore.joinHousehold).mockResolvedValue({ status: 'not_found' })

    await typeAndJoin()

    expect(screen.getByText('招待コードが見つかりません。コードを確認してください。')).toBeInTheDocument()
    expect(mockReloadHousehold).not.toHaveBeenCalled()
  })

  it('switch_needed 時に確認ダイアログが表示される', async () => {
    vi.mocked(householdFirestore.joinHousehold).mockResolvedValue({ status: 'switch_needed', newHouseholdId: 'hh2' })

    await typeAndJoin()

    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
  })

  it('確認ダイアログで承認後に forceSwitch=true で再参加する', async () => {
    vi.mocked(householdFirestore.joinHousehold)
      .mockResolvedValueOnce({ status: 'switch_needed', newHouseholdId: 'hh2' })
      .mockResolvedValueOnce({ status: 'success', householdId: 'hh2' })

    await typeAndJoin()
    await userEvent.click(screen.getByText('confirm'))

    expect(householdFirestore.joinHousehold).toHaveBeenCalledTimes(2)
    expect(householdFirestore.joinHousehold).toHaveBeenLastCalledWith('u1', INVITE_CODE, 'テスト太郎', { forceSwitch: true })
    expect(mockReloadHousehold).toHaveBeenCalled()
  })

  it('joinHousehold 例外発生時にエラーメッセージが表示される', async () => {
    vi.mocked(householdFirestore.joinHousehold).mockRejectedValue(new Error('Network error'))

    await typeAndJoin()

    expect(screen.getByText('参加に失敗しました。もう一度お試しください。')).toBeInTheDocument()
  })
})

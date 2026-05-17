import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// useHousehold モック
vi.mock('../hooks/useHousehold', () => ({
  useHousehold: vi.fn(),
}))
// Firebase CRUD モック（自動 mock → 全エクスポートが vi.fn() になる）
vi.mock('../firebase/savingsAccountFirestore')
vi.mock('../firebase/savingsFirestore')
vi.mock('../firebase/securitiesFirestore')
vi.mock('../firebase/contractFirestore')

import { useHousehold } from '../hooks/useHousehold'
import * as savingsAccountApi from '../firebase/savingsAccountFirestore'
import * as savingsApi from '../firebase/savingsFirestore'
import * as securitiesApi from '../firebase/securitiesFirestore'
import * as contractApi from '../firebase/contractFirestore'

// デフォルトの useHousehold 戻り値
const DEFAULT_HH = {
  householdId: 'hh-test',
  user: null,
  state: 'ready' as const,
  payDay: null,
  reloadHousehold: async () => {},
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useHousehold).mockReturnValue(DEFAULT_HH)
})

// ────────────────────────────────────────────────────────────────────────────
// useSavingsAccounts
// ────────────────────────────────────────────────────────────────────────────
describe('useSavingsAccounts', () => {
  const ACCOUNTS = [
    { id: 'a2', name: '定期', order: 2, currentAmount: 200000, color: '#f00', lastUpdated: '2025-01-01' },
    { id: 'a1', name: '普通', order: 1, currentAmount: 100000, color: '#0f0', lastUpdated: '2025-01-01' },
  ]

  it('householdId がある場合、フェッチして order 順に並べる', async () => {
    vi.mocked(savingsAccountApi.fetchSavingsAccounts).mockResolvedValue(ACCOUNTS)

    const { useSavingsAccounts } = await import('../hooks/useSavingsAccounts')
    const { result } = renderHook(() => useSavingsAccounts())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.accounts[0].id).toBe('a1')
    expect(result.current.accounts[1].id).toBe('a2')
  })

  it('householdId が null の場合、フェッチしない', async () => {
    vi.mocked(useHousehold).mockReturnValue({ ...DEFAULT_HH, householdId: null })

    const { useSavingsAccounts } = await import('../hooks/useSavingsAccounts')
    renderHook(() => useSavingsAccounts())

    expect(savingsAccountApi.fetchSavingsAccounts).not.toHaveBeenCalled()
  })

  it('addAccount: Firestore に追加しローカル状態を更新する', async () => {
    vi.mocked(savingsAccountApi.fetchSavingsAccounts).mockResolvedValue([])
    vi.mocked(savingsAccountApi.addSavingsAccount).mockResolvedValue('new-id')

    const { useSavingsAccounts } = await import('../hooks/useSavingsAccounts')
    const { result } = renderHook(() => useSavingsAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const newAccount = { name: '新口座', order: 0, currentAmount: 0, color: '#fff', lastUpdated: '2025-01-01' }
    await act(async () => { await result.current.addAccount(newAccount) })

    expect(savingsAccountApi.addSavingsAccount).toHaveBeenCalledWith('hh-test', newAccount)
    expect(result.current.accounts).toHaveLength(1)
    expect(result.current.accounts[0].id).toBe('new-id')
  })

  it('updateAccount: Firestore を更新しローカル状態に反映する', async () => {
    vi.mocked(savingsAccountApi.fetchSavingsAccounts).mockResolvedValue([
      { id: 'a1', name: '普通', order: 1, currentAmount: 100000, color: '#fff', lastUpdated: '2025-01-01' },
    ])
    vi.mocked(savingsAccountApi.updateSavingsAccount).mockResolvedValue(undefined)

    const { useSavingsAccounts } = await import('../hooks/useSavingsAccounts')
    const { result } = renderHook(() => useSavingsAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.updateAccount('a1', { currentAmount: 150000 }) })

    expect(savingsAccountApi.updateSavingsAccount).toHaveBeenCalledWith('hh-test', 'a1', { currentAmount: 150000 })
    expect(result.current.accounts[0].currentAmount).toBe(150000)
  })

  it('deleteAccount: Firestore から削除しローカル状態から除外する', async () => {
    vi.mocked(savingsAccountApi.fetchSavingsAccounts).mockResolvedValue([
      { id: 'a1', name: '普通', order: 1, currentAmount: 100000, color: '#fff', lastUpdated: '2025-01-01' },
    ])
    vi.mocked(savingsAccountApi.deleteSavingsAccount).mockResolvedValue(undefined)

    const { useSavingsAccounts } = await import('../hooks/useSavingsAccounts')
    const { result } = renderHook(() => useSavingsAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.deleteAccount('a1') })

    expect(savingsAccountApi.deleteSavingsAccount).toHaveBeenCalledWith('hh-test', 'a1')
    expect(result.current.accounts).toHaveLength(0)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// useSavingsGoals
// ────────────────────────────────────────────────────────────────────────────
describe('useSavingsGoals', () => {
  const GOAL = {
    id: 'g1', name: '旅行', order: 0,
    targetAmount: 100000, currentAmount: 10000,
    color: '#f00', contributions: { '2025-01': 10000 },
  }

  it('フェッチして goals を返す', async () => {
    vi.mocked(savingsApi.fetchSavingsGoals).mockResolvedValue([GOAL])

    const { useSavingsGoals } = await import('../hooks/useSavingsGoals')
    const { result } = renderHook(() => useSavingsGoals())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.goals).toHaveLength(1)
    expect(result.current.goals[0].name).toBe('旅行')
  })

  it('logContribution: 積立額と currentAmount を更新する', async () => {
    vi.mocked(savingsApi.fetchSavingsGoals).mockResolvedValue([GOAL])
    vi.mocked(savingsApi.updateSavingsGoal).mockResolvedValue(undefined)

    const { useSavingsGoals } = await import('../hooks/useSavingsGoals')
    const { result } = renderHook(() => useSavingsGoals())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.logContribution('g1', '2025-02', 5000) })

    expect(savingsApi.updateSavingsGoal).toHaveBeenCalledWith('hh-test', 'g1', {
      contributions: { '2025-01': 10000, '2025-02': 5000 },
      currentAmount: 15000,
    })
    expect(result.current.goals[0].currentAmount).toBe(15000)
  })

  it('logContribution: amount <= 0 の場合は何もしない', async () => {
    vi.mocked(savingsApi.fetchSavingsGoals).mockResolvedValue([GOAL])

    const { useSavingsGoals } = await import('../hooks/useSavingsGoals')
    const { result } = renderHook(() => useSavingsGoals())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.logContribution('g1', '2025-02', 0) })

    expect(savingsApi.updateSavingsGoal).not.toHaveBeenCalled()
  })

  it('deleteGoal: ローカル状態から除外する', async () => {
    vi.mocked(savingsApi.fetchSavingsGoals).mockResolvedValue([GOAL])
    vi.mocked(savingsApi.deleteSavingsGoal).mockResolvedValue(undefined)

    const { useSavingsGoals } = await import('../hooks/useSavingsGoals')
    const { result } = renderHook(() => useSavingsGoals())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.deleteGoal('g1') })

    expect(result.current.goals).toHaveLength(0)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// useSecuritiesAccounts
// ────────────────────────────────────────────────────────────────────────────
describe('useSecuritiesAccounts', () => {
  const ACCOUNT = {
    id: 's1', name: 'NISA', order: 0,
    currentValue: 600000, color: '#00f',
    monthlyValues: { '2025-01': 500000, '2025-02': 600000 },
  }

  it('フェッチして accounts を返す', async () => {
    vi.mocked(securitiesApi.fetchSecuritiesAccounts).mockResolvedValue([ACCOUNT])

    const { useSecuritiesAccounts } = await import('../hooks/useSecuritiesAccounts')
    const { result } = renderHook(() => useSecuritiesAccounts())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.accounts[0].name).toBe('NISA')
  })

  it('recordMonthlyValue: monthlyValues を追加し最新月の値を currentValue にする', async () => {
    vi.mocked(securitiesApi.fetchSecuritiesAccounts).mockResolvedValue([ACCOUNT])
    vi.mocked(securitiesApi.updateSecuritiesAccount).mockResolvedValue(undefined)

    const { useSecuritiesAccounts } = await import('../hooks/useSecuritiesAccounts')
    const { result } = renderHook(() => useSecuritiesAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.recordMonthlyValue('s1', '2025-03', 700000) })

    expect(securitiesApi.updateSecuritiesAccount).toHaveBeenCalledWith('hh-test', 's1', {
      monthlyValues: { '2025-01': 500000, '2025-02': 600000, '2025-03': 700000 },
      currentValue: 700000,
    })
    expect(result.current.accounts[0].currentValue).toBe(700000)
  })

  it('recordMonthlyValue: value < 0 の場合は何もしない', async () => {
    vi.mocked(securitiesApi.fetchSecuritiesAccounts).mockResolvedValue([ACCOUNT])

    const { useSecuritiesAccounts } = await import('../hooks/useSecuritiesAccounts')
    const { result } = renderHook(() => useSecuritiesAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.recordMonthlyValue('s1', '2025-03', -1) })

    expect(securitiesApi.updateSecuritiesAccount).not.toHaveBeenCalled()
  })

  it('deleteMonthlyValue: 月を削除し前月値を currentValue にする', async () => {
    vi.mocked(securitiesApi.fetchSecuritiesAccounts).mockResolvedValue([ACCOUNT])
    vi.mocked(securitiesApi.updateSecuritiesAccount).mockResolvedValue(undefined)

    const { useSecuritiesAccounts } = await import('../hooks/useSecuritiesAccounts')
    const { result } = renderHook(() => useSecuritiesAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.deleteMonthlyValue('s1', '2025-02') })

    expect(securitiesApi.updateSecuritiesAccount).toHaveBeenCalledWith('hh-test', 's1', {
      monthlyValues: { '2025-01': 500000 },
      currentValue: 500000,
    })
  })

  it('deleteMonthlyValue: 全月削除後は currentValue が 0 になる', async () => {
    const singleMonth = { ...ACCOUNT, monthlyValues: { '2025-01': 500000 }, currentValue: 500000 }
    vi.mocked(securitiesApi.fetchSecuritiesAccounts).mockResolvedValue([singleMonth])
    vi.mocked(securitiesApi.updateSecuritiesAccount).mockResolvedValue(undefined)

    const { useSecuritiesAccounts } = await import('../hooks/useSecuritiesAccounts')
    const { result } = renderHook(() => useSecuritiesAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.deleteMonthlyValue('s1', '2025-01') })

    expect(securitiesApi.updateSecuritiesAccount).toHaveBeenCalledWith('hh-test', 's1', {
      monthlyValues: {},
      currentValue: 0,
    })
  })
})

// ────────────────────────────────────────────────────────────────────────────
// useContracts
// ────────────────────────────────────────────────────────────────────────────
describe('useContracts', () => {
  const CONTRACT = {
    id: 'c1', name: 'Netflix', order: 0,
    contractType: 'subscription' as const,
    amount: 1800, frequency: 'monthly' as const, isAutoRenew: true,
  }

  it('フェッチして contracts を返す', async () => {
    vi.mocked(contractApi.fetchContracts).mockResolvedValue([CONTRACT])

    const { useContracts } = await import('../hooks/useContracts')
    const { result } = renderHook(() => useContracts())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.contracts[0].name).toBe('Netflix')
  })

  it('addContract: 追加してローカル状態を更新する', async () => {
    vi.mocked(contractApi.fetchContracts).mockResolvedValue([])
    vi.mocked(contractApi.addContract).mockResolvedValue('c-new')

    const { useContracts } = await import('../hooks/useContracts')
    const { result } = renderHook(() => useContracts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const data = { name: 'Spotify', contractType: 'subscription' as const, amount: 980, frequency: 'monthly' as const, isAutoRenew: false }
    await act(async () => { await result.current.addContract(data) })

    expect(result.current.contracts).toHaveLength(1)
    expect(result.current.contracts[0].id).toBe('c-new')
  })

  it('updateContract: 更新してローカル状態に反映する', async () => {
    vi.mocked(contractApi.fetchContracts).mockResolvedValue([CONTRACT])
    vi.mocked(contractApi.updateContract).mockResolvedValue(undefined)

    const { useContracts } = await import('../hooks/useContracts')
    const { result } = renderHook(() => useContracts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.updateContract('c1', { amount: 1980 }) })

    expect(contractApi.updateContract).toHaveBeenCalledWith('hh-test', 'c1', { amount: 1980 })
    expect(result.current.contracts[0].amount).toBe(1980)
  })

  it('deleteContract: 削除してローカル状態から除外する', async () => {
    vi.mocked(contractApi.fetchContracts).mockResolvedValue([CONTRACT])
    vi.mocked(contractApi.deleteContract).mockResolvedValue(undefined)

    const { useContracts } = await import('../hooks/useContracts')
    const { result } = renderHook(() => useContracts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.deleteContract('c1') })

    expect(result.current.contracts).toHaveLength(0)
  })
})

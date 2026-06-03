import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { User } from 'firebase/auth'

vi.mock('../firebase/firebase', () => ({ auth: {}, db: {} }))
vi.mock('../data/guestData', () => ({ buildGuestData: vi.fn(() => ({})) }))
vi.mock('../firebase/guestStore', () => ({
  GUEST_HOUSEHOLD_ID: 'guest',
  initGuestStore: vi.fn(),
}))
vi.mock('../firebase/householdFirestore', () => ({
  fetchUserProfile: vi.fn(),
  fetchHousehold: vi.fn(),
}))

// onAuthStateChanged のコールバックをテストから呼び出せるよう捕捉する
let capturedAuthCallback: ((user: User | null) => Promise<void>) | null = null

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth: unknown, cb: (user: User | null) => Promise<void>) => {
    capturedAuthCallback = cb
    return () => {}
  }),
}))

import { HouseholdProvider, useHousehold } from '../hooks/useHousehold'
import * as householdFirestore from '../firebase/householdFirestore'

const MOCK_USER = { uid: 'u1', displayName: 'テスト太郎' } as unknown as User

function wrapper({ children }: { children: ReactNode }) {
  return <HouseholdProvider>{children}</HouseholdProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  capturedAuthCallback = null
})

describe('useHousehold 状態遷移', () => {
  it('初期状態は loading', () => {
    const { result } = renderHook(() => useHousehold(), { wrapper })
    expect(result.current.state).toBe('loading')
  })

  it('user=null → state が unauthenticated', async () => {
    const { result } = renderHook(() => useHousehold(), { wrapper })
    await act(async () => { await capturedAuthCallback!(null) })

    expect(result.current.state).toBe('unauthenticated')
    expect(result.current.user).toBeNull()
    expect(result.current.householdId).toBeNull()
  })

  it('profile.householdId あり → state が ready', async () => {
    vi.mocked(householdFirestore.fetchUserProfile).mockResolvedValue({ householdId: 'hh1', displayName: 'テスト太郎' })
    vi.mocked(householdFirestore.fetchHousehold).mockResolvedValue({
      id: 'hh1', memberIds: [], inviteCode: 'ABCD12XY7K', createdAt: 0,
    })

    const { result } = renderHook(() => useHousehold(), { wrapper })
    await act(async () => { await capturedAuthCallback!(MOCK_USER) })

    expect(result.current.state).toBe('ready')
    expect(result.current.householdId).toBe('hh1')
    expect(result.current.isGuest).toBe(false)
  })

  it('profile が null → state が needs_setup', async () => {
    vi.mocked(householdFirestore.fetchUserProfile).mockResolvedValue(null)

    const { result } = renderHook(() => useHousehold(), { wrapper })
    await act(async () => { await capturedAuthCallback!(MOCK_USER) })

    expect(result.current.state).toBe('needs_setup')
    expect(result.current.householdId).toBeNull()
  })

  it('profile.householdId が null → state が needs_setup', async () => {
    vi.mocked(householdFirestore.fetchUserProfile).mockResolvedValue({ householdId: null, displayName: null })

    const { result } = renderHook(() => useHousehold(), { wrapper })
    await act(async () => { await capturedAuthCallback!(MOCK_USER) })

    expect(result.current.state).toBe('needs_setup')
  })

  it('fetchUserProfile がエラー → state が error（needs_setup ではない）', async () => {
    vi.mocked(householdFirestore.fetchUserProfile).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useHousehold(), { wrapper })
    await act(async () => { await capturedAuthCallback!(MOCK_USER) })

    expect(result.current.state).toBe('error')
    expect(result.current.householdId).toBeNull()
  })

  it('fetchHousehold がエラー → state が error', async () => {
    vi.mocked(householdFirestore.fetchUserProfile).mockResolvedValue({ householdId: 'hh1', displayName: null })
    vi.mocked(householdFirestore.fetchHousehold).mockRejectedValue(new Error('Permission denied'))

    const { result } = renderHook(() => useHousehold(), { wrapper })
    await act(async () => { await capturedAuthCallback!(MOCK_USER) })

    expect(result.current.state).toBe('error')
  })

  it('household の payDay が反映される', async () => {
    vi.mocked(householdFirestore.fetchUserProfile).mockResolvedValue({ householdId: 'hh1', displayName: null })
    vi.mocked(householdFirestore.fetchHousehold).mockResolvedValue({
      id: 'hh1', memberIds: [], inviteCode: 'ABCD12XY7K', createdAt: 0, payDay: 25,
    })

    const { result } = renderHook(() => useHousehold(), { wrapper })
    await act(async () => { await capturedAuthCallback!(MOCK_USER) })

    expect(result.current.payDay).toBe(25)
  })

  it('household の transactionListDisplayMode が反映される', async () => {
    vi.mocked(householdFirestore.fetchUserProfile).mockResolvedValue({ householdId: 'hh1', displayName: null })
    vi.mocked(householdFirestore.fetchHousehold).mockResolvedValue({
      id: 'hh1', memberIds: [], inviteCode: 'ABCD12XY7K', createdAt: 0, transactionListDisplayMode: 'category',
    })

    const { result } = renderHook(() => useHousehold(), { wrapper })
    await act(async () => { await capturedAuthCallback!(MOCK_USER) })

    expect(result.current.transactionListDisplayMode).toBe('category')
  })

  it('household の transactionListDisplayMode 未設定時はデフォルト date', async () => {
    vi.mocked(householdFirestore.fetchUserProfile).mockResolvedValue({ householdId: 'hh1', displayName: null })
    vi.mocked(householdFirestore.fetchHousehold).mockResolvedValue({
      id: 'hh1', memberIds: [], inviteCode: 'ABCD12XY7K', createdAt: 0,
    })

    const { result } = renderHook(() => useHousehold(), { wrapper })
    await act(async () => { await capturedAuthCallback!(MOCK_USER) })

    expect(result.current.transactionListDisplayMode).toBe('date')
  })

  it('kakeibo:guest-mode イベント → isGuest=true, state=ready', async () => {
    const { result } = renderHook(() => useHousehold(), { wrapper })

    await act(async () => {
      window.dispatchEvent(new Event('kakeibo:guest-mode'))
    })

    expect(result.current.state).toBe('ready')
    expect(result.current.isGuest).toBe(true)
    expect(result.current.householdId).toBe('guest')
  })
})

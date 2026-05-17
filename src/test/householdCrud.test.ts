import { describe, it, expect, vi, beforeEach } from 'vitest'

// Firebase モック
vi.mock('../firebase/firebase', () => ({ db: {} }))

const mockCollection = vi.fn(() => 'mock-col-ref')
const mockDoc = vi.fn(() => 'mock-doc-ref')
const mockGetDocs = vi.fn()
const mockAddDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockDeleteDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  doc: mockDoc,
  getDocs: mockGetDocs,
  addDoc: mockAddDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
}))

// ── テストヘルパー ──────────────────────────────────────────────────
function makeSnapshot(items: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    docs: items.map(({ id, data }) => ({ id, data: () => data })),
  }
}

// ── savingsAccountFirestore ─────────────────────────────────────────
describe('savingsAccountFirestore', () => {
  const HID = 'hh1'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchSavingsAccounts: Firestore から口座一覧を返す', async () => {
    const { fetchSavingsAccounts } = await import('../firebase/savingsAccountFirestore')
    mockGetDocs.mockResolvedValue(makeSnapshot([
      { id: 'a1', data: { name: '普通預金', order: 0, currentAmount: 100000, color: '#fff', lastUpdated: '2025-01-01' } },
    ]))

    const result = await fetchSavingsAccounts(HID)

    expect(mockCollection).toHaveBeenCalledWith({}, 'households', HID, 'savingsAccounts')
    expect(result).toEqual([{ id: 'a1', name: '普通預金', order: 0, currentAmount: 100000, color: '#fff', lastUpdated: '2025-01-01' }])
  })

  it('addSavingsAccount: addDoc を呼び新しい ID を返す', async () => {
    const { addSavingsAccount } = await import('../firebase/savingsAccountFirestore')
    mockAddDoc.mockResolvedValue({ id: 'new-id' })

    const data = { name: '定期預金', order: 1, currentAmount: 0, color: '#000', lastUpdated: '2025-01-01' }
    const id = await addSavingsAccount(HID, data)

    expect(mockAddDoc).toHaveBeenCalledOnce()
    expect(id).toBe('new-id')
  })

  it('updateSavingsAccount: updateDoc を呼ぶ', async () => {
    const { updateSavingsAccount } = await import('../firebase/savingsAccountFirestore')
    mockUpdateDoc.mockResolvedValue(undefined)

    await updateSavingsAccount(HID, 'a1', { currentAmount: 200000 })

    expect(mockDoc).toHaveBeenCalledWith({}, 'households', HID, 'savingsAccounts', 'a1')
    expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', { currentAmount: 200000 })
  })

  it('deleteSavingsAccount: deleteDoc を呼ぶ', async () => {
    const { deleteSavingsAccount } = await import('../firebase/savingsAccountFirestore')
    mockDeleteDoc.mockResolvedValue(undefined)

    await deleteSavingsAccount(HID, 'a1')

    expect(mockDoc).toHaveBeenCalledWith({}, 'households', HID, 'savingsAccounts', 'a1')
    expect(mockDeleteDoc).toHaveBeenCalledWith('mock-doc-ref')
  })
})

// ── savingsFirestore（SavingsGoal） ─────────────────────────────────
describe('savingsFirestore', () => {
  const HID = 'hh2'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchSavingsGoals: 目標一覧を返す', async () => {
    const { fetchSavingsGoals } = await import('../firebase/savingsFirestore')
    mockGetDocs.mockResolvedValue(makeSnapshot([
      { id: 'g1', data: { name: '旅行', order: 0, targetAmount: 200000, currentAmount: 50000, color: '#f00', contributions: {} } },
    ]))

    const result = await fetchSavingsGoals(HID)

    expect(mockCollection).toHaveBeenCalledWith({}, 'households', HID, 'savingsGoals')
    expect(result[0].id).toBe('g1')
    expect(result[0].name).toBe('旅行')
  })

  it('addSavingsGoal: addDoc を呼び新しい ID を返す', async () => {
    const { addSavingsGoal } = await import('../firebase/savingsFirestore')
    mockAddDoc.mockResolvedValue({ id: 'g-new' })

    const data = { name: '車', order: 1, targetAmount: 1000000, currentAmount: 0, color: '#00f', contributions: {} }
    const id = await addSavingsGoal(HID, data)

    expect(id).toBe('g-new')
  })

  it('updateSavingsGoal: updateDoc を呼ぶ', async () => {
    const { updateSavingsGoal } = await import('../firebase/savingsFirestore')
    mockUpdateDoc.mockResolvedValue(undefined)

    await updateSavingsGoal(HID, 'g1', { currentAmount: 100000 })

    expect(mockDoc).toHaveBeenCalledWith({}, 'households', HID, 'savingsGoals', 'g1')
  })

  it('deleteSavingsGoal: deleteDoc を呼ぶ', async () => {
    const { deleteSavingsGoal } = await import('../firebase/savingsFirestore')
    mockDeleteDoc.mockResolvedValue(undefined)

    await deleteSavingsGoal(HID, 'g1')

    expect(mockDeleteDoc).toHaveBeenCalledWith('mock-doc-ref')
  })
})

// ── securitiesFirestore ─────────────────────────────────────────────
describe('securitiesFirestore', () => {
  const HID = 'hh3'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchSecuritiesAccounts: 証券口座一覧を返す', async () => {
    const { fetchSecuritiesAccounts } = await import('../firebase/securitiesFirestore')
    mockGetDocs.mockResolvedValue(makeSnapshot([
      { id: 's1', data: { name: 'NISA口座', order: 0, currentValue: 500000, color: '#0f0', monthlyValues: {} } },
    ]))

    const result = await fetchSecuritiesAccounts(HID)

    expect(mockCollection).toHaveBeenCalledWith({}, 'households', HID, 'securitiesAccounts')
    expect(result[0].id).toBe('s1')
  })

  it('addSecuritiesAccount: addDoc を呼ぶ', async () => {
    const { addSecuritiesAccount } = await import('../firebase/securitiesFirestore')
    mockAddDoc.mockResolvedValue({ id: 's-new' })

    const data = { name: '特定口座', order: 1, currentValue: 0, color: '#111', monthlyValues: {} }
    const id = await addSecuritiesAccount(HID, data)

    expect(id).toBe('s-new')
  })

  it('updateSecuritiesAccount: updateDoc を呼ぶ', async () => {
    const { updateSecuritiesAccount } = await import('../firebase/securitiesFirestore')
    mockUpdateDoc.mockResolvedValue(undefined)

    await updateSecuritiesAccount(HID, 's1', { currentValue: 600000 })

    expect(mockDoc).toHaveBeenCalledWith({}, 'households', HID, 'securitiesAccounts', 's1')
  })

  it('deleteSecuritiesAccount: deleteDoc を呼ぶ', async () => {
    const { deleteSecuritiesAccount } = await import('../firebase/securitiesFirestore')
    mockDeleteDoc.mockResolvedValue(undefined)

    await deleteSecuritiesAccount(HID, 's1')

    expect(mockDeleteDoc).toHaveBeenCalledWith('mock-doc-ref')
  })
})

// ── contractFirestore ───────────────────────────────────────────────
describe('contractFirestore', () => {
  const HID = 'hh4'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchContracts: 契約一覧を返す', async () => {
    const { fetchContracts } = await import('../firebase/contractFirestore')
    mockGetDocs.mockResolvedValue(makeSnapshot([
      { id: 'c1', data: { name: 'Netflix', order: 0, contractType: 'subscription', amount: 1800, frequency: 'monthly', isAutoRenew: true } },
    ]))

    const result = await fetchContracts(HID)

    expect(mockCollection).toHaveBeenCalledWith({}, 'households', HID, 'contracts')
    expect(result[0].name).toBe('Netflix')
  })

  it('addContract: addDoc を呼ぶ', async () => {
    const { addContract } = await import('../firebase/contractFirestore')
    mockAddDoc.mockResolvedValue({ id: 'c-new' })

    const data = { name: 'Spotify', order: 1, contractType: 'subscription' as const, amount: 980, frequency: 'monthly' as const, isAutoRenew: true }
    const id = await addContract(HID, data)

    expect(id).toBe('c-new')
  })

  it('updateContract: updateDoc を呼ぶ', async () => {
    const { updateContract } = await import('../firebase/contractFirestore')
    mockUpdateDoc.mockResolvedValue(undefined)

    await updateContract(HID, 'c1', { amount: 1980 })

    expect(mockDoc).toHaveBeenCalledWith({}, 'households', HID, 'contracts', 'c1')
  })

  it('deleteContract: deleteDoc を呼ぶ', async () => {
    const { deleteContract } = await import('../firebase/contractFirestore')
    mockDeleteDoc.mockResolvedValue(undefined)

    await deleteContract(HID, 'c1')

    expect(mockDeleteDoc).toHaveBeenCalledWith('mock-doc-ref')
  })
})

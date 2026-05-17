import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TransactionModal from '../features/TransactionModal'
import type { Category, PaymentMethod, Transaction } from '../types'

vi.mock('../hooks/useHousehold', () => ({
  useHousehold: vi.fn(() => ({ householdId: 'hh-test' })),
}))
vi.mock('../firebase/firestore', () => ({
  saveTransaction: vi.fn().mockResolvedValue(undefined),
  updateTransaction: vi.fn().mockResolvedValue(undefined),
  moveTransaction: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../features/CategoryAddModal', () => ({ default: () => null }))
vi.mock('../features/PaymentMethodAddModal', () => ({ default: () => null }))

import { saveTransaction, updateTransaction, moveTransaction } from '../firebase/firestore'

const CATEGORIES: Category[] = [
  { id: 'ce1', name: '食費', type: 'expense', color: '#f00', order: 0 },
  { id: 'ci1', name: '給与', type: 'income', color: '#0f0', order: 0 },
]
const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'pm1', name: 'クレカ', order: 0 },
]
const EDIT_TARGET: Transaction = {
  id: 't1', type: 'expense', amount: 5000,
  categoryId: 'ce1', paymentMethodId: 'pm1',
  date: '2025-03-10', memo: '外食',
}

const DEFAULT_PROPS = {
  onClose: vi.fn(), onSaved: vi.fn(),
  onCategoryAdded: vi.fn(), onPaymentMethodAdded: vi.fn(),
  onCategoryDeleted: vi.fn(), onPaymentMethodDeleted: vi.fn(),
  categories: CATEGORIES, paymentMethods: PAYMENT_METHODS,
  yearMonth: '2025-03',
}

// カテゴリ・支払い方法 select の取得ヘルパー（label が htmlFor 未接続のため index で識別）
function getCategorySelect() { return screen.getAllByRole('combobox')[0] as HTMLSelectElement }
function getPaymentSelect() { return screen.getAllByRole('combobox')[1] as HTMLSelectElement }

beforeEach(() => { vi.clearAllMocks() })

describe('TransactionModal', () => {
  it('isOpen=false のとき何もレンダリングしない', () => {
    const { container } = render(<TransactionModal {...DEFAULT_PROPS} isOpen={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('新規登録モードで「収支を登録」と表示する', () => {
    render(<TransactionModal {...DEFAULT_PROPS} isOpen />)
    expect(screen.getByText('収支を登録')).toBeInTheDocument()
  })

  it('編集モードで「収支を編集」と既存値をフォームに反映する', () => {
    render(<TransactionModal {...DEFAULT_PROPS} isOpen editTarget={EDIT_TARGET} />)
    expect(screen.getByText('収支を編集')).toBeInTheDocument()
    expect(screen.getByDisplayValue('5000')).toBeInTheDocument()
    expect(getCategorySelect().value).toBe('ce1')
    expect(getPaymentSelect().value).toBe('pm1')
    expect(screen.getByDisplayValue('2025-03-10')).toBeInTheDocument()
  })

  it('「収入」ボタンをクリックすると収入カテゴリが表示される', async () => {
    render(<TransactionModal {...DEFAULT_PROPS} isOpen />)
    await userEvent.click(screen.getByRole('button', { name: '収入' }))
    expect(screen.getByRole('option', { name: '給与' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '食費' })).not.toBeInTheDocument()
  })

  it('Escape キーで onClose が呼ばれる', () => {
    const onClose = vi.fn()
    render(<TransactionModal {...DEFAULT_PROPS} isOpen onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('全フィールド入力後フォーム送信で saveTransaction が呼ばれる', async () => {
    render(<TransactionModal {...DEFAULT_PROPS} isOpen />)
    await userEvent.type(screen.getByPlaceholderText('0'), '3000')
    await userEvent.selectOptions(getCategorySelect(), 'ce1')
    await userEvent.selectOptions(getPaymentSelect(), 'pm1')
    // 日付はデフォルト値が設定済み
    await userEvent.click(screen.getByRole('button', { name: '登録する' }))
    await waitFor(() => expect(saveTransaction).toHaveBeenCalledOnce())
    expect(DEFAULT_PROPS.onSaved).toHaveBeenCalledOnce()
  })

  it('編集モードで同月の場合 updateTransaction が呼ばれる', async () => {
    render(<TransactionModal {...DEFAULT_PROPS} isOpen editTarget={EDIT_TARGET} />)
    await userEvent.click(screen.getByRole('button', { name: '更新する' }))
    await waitFor(() => expect(updateTransaction).toHaveBeenCalledOnce())
    expect(moveTransaction).not.toHaveBeenCalled()
  })

  it('編集モードで日付を別月に変更すると moveTransaction が呼ばれる', async () => {
    render(<TransactionModal {...DEFAULT_PROPS} isOpen editTarget={EDIT_TARGET} />)
    const dateInput = screen.getByDisplayValue('2025-03-10')
    fireEvent.change(dateInput, { target: { value: '2025-02-10' } })
    await userEvent.click(screen.getByRole('button', { name: '更新する' }))
    await waitFor(() =>
      expect(moveTransaction).toHaveBeenCalledWith(
        'hh-test', '2025-03', '2025-02', expect.objectContaining({ id: 't1' })
      )
    )
  })
})

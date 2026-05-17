import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TransactionList from './TransactionList'
import type { Category, PaymentMethod, Transaction } from '../types'

vi.mock('../hooks/useHousehold', () => ({
  useHousehold: vi.fn(() => ({ householdId: 'hh-test' })),
}))

vi.mock('../firebase/firestore', () => ({
  deleteTransaction: vi.fn().mockResolvedValue(undefined),
}))

import { deleteTransaction } from '../firebase/firestore'

const CATEGORIES: Category[] = [
  { id: 'c1', name: '食費', type: 'expense', color: '#f00', order: 0 },
  { id: 'c2', name: '給与', type: 'income', color: '#0f0', order: 1 },
]

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'pm1', name: 'クレジットカード', order: 0 },
]

const TRANSACTIONS: Transaction[] = [
  { id: 't1', type: 'expense', amount: 1500, categoryId: 'c1', date: '2025-03-15', memo: 'ランチ', paymentMethodId: 'pm1' },
  { id: 't2', type: 'income', amount: 300000, categoryId: 'c2', date: '2025-03-25', memo: '' },
]

const noop = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TransactionList', () => {
  it('データなしのとき「収支データがありません」を表示する', () => {
    render(
      <TransactionList
        transactions={[]}
        categories={CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        onEdit={noop}
        onDeleted={noop}
      />
    )
    expect(screen.getByText('収支データがありません')).toBeInTheDocument()
  })

  it('トランザクションを日付降順でグループ表示する', () => {
    render(
      <TransactionList
        transactions={TRANSACTIONS}
        categories={CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        onEdit={noop}
        onDeleted={noop}
      />
    )
    // 3/25 が先に表示され、3/15 が後に表示される
    const dateLabels = screen.getAllByText(/月\d+日/)
    expect(dateLabels[0].textContent).toContain('3月25日')
    expect(dateLabels[1].textContent).toContain('3月15日')
  })

  it('カテゴリ名と金額を表示する', () => {
    render(
      <TransactionList
        transactions={TRANSACTIONS}
        categories={CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        onEdit={noop}
        onDeleted={noop}
      />
    )
    expect(screen.getByText('食費')).toBeInTheDocument()
    expect(screen.getByText('-¥1,500')).toBeInTheDocument()
    expect(screen.getByText('給与')).toBeInTheDocument()
    expect(screen.getByText('+¥300,000')).toBeInTheDocument()
  })

  it('メモが表示される', () => {
    render(
      <TransactionList
        transactions={TRANSACTIONS}
        categories={CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        onEdit={noop}
        onDeleted={noop}
      />
    )
    expect(screen.getByText('ランチ')).toBeInTheDocument()
  })

  it('編集ボタンで onEdit が呼ばれる', async () => {
    const onEdit = vi.fn()
    render(
      <TransactionList
        transactions={TRANSACTIONS}
        categories={CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        onEdit={onEdit}
        onDeleted={noop}
      />
    )
    const editButtons = screen.getAllByRole('button', { name: '編集' })
    await userEvent.click(editButtons[0])
    expect(onEdit).toHaveBeenCalledOnce()
  })

  it('削除確認で「キャンセル」を選択すると deleteTransaction が呼ばれない', async () => {
    render(
      <TransactionList
        transactions={TRANSACTIONS}
        categories={CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        onEdit={noop}
        onDeleted={noop}
      />
    )
    await userEvent.click(screen.getAllByRole('button', { name: '削除' })[0])
    await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(deleteTransaction).not.toHaveBeenCalled()
  })

  it('削除確認で「削除する」を選択すると deleteTransaction と onDeleted が呼ばれる', async () => {
    const onDeleted = vi.fn()
    render(
      <TransactionList
        transactions={TRANSACTIONS}
        categories={CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        onEdit={noop}
        onDeleted={onDeleted}
      />
    )
    await userEvent.click(screen.getAllByRole('button', { name: '削除' })[0])
    await userEvent.click(screen.getByRole('button', { name: '削除する' }))
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce())
  })

  it('onDelete が渡された場合、deleteTransaction の代わりに onDelete を使う', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    render(
      <TransactionList
        transactions={[TRANSACTIONS[0]]}
        categories={CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        onEdit={noop}
        onDeleted={noop}
        onDelete={onDelete}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: '削除' }))
    await userEvent.click(screen.getByRole('button', { name: '削除する' }))
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('2025-03', 't1'))
    expect(deleteTransaction).not.toHaveBeenCalled()
  })
})

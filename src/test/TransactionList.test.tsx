import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TransactionList from '../features/TransactionList'
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
        displayMode="date"
        onToggleDisplayMode={noop}
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
        displayMode="date"
        onToggleDisplayMode={noop}
      />
    )
    const dateLabels = screen.getAllByText(/月\d+日/)
    expect(dateLabels[0]!.textContent).toContain('3月25日')
    expect(dateLabels[1]!.textContent).toContain('3月15日')
  })

  it('カテゴリ名と金額を表示する', () => {
    render(
      <TransactionList
        transactions={TRANSACTIONS}
        categories={CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        onEdit={noop}
        onDeleted={noop}
        displayMode="date"
        onToggleDisplayMode={noop}
      />
    )
    expect(screen.getByText('食費')).toBeInTheDocument()
    expect(screen.getByText('給与')).toBeInTheDocument()
    // 合計表示と行の両方に出るため getAllByText で確認
    expect(screen.getAllByText('-¥1,500').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('+¥300,000').length).toBeGreaterThanOrEqual(1)
  })

  it('メモが表示される', () => {
    render(
      <TransactionList
        transactions={TRANSACTIONS}
        categories={CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        onEdit={noop}
        onDeleted={noop}
        displayMode="date"
        onToggleDisplayMode={noop}
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
        displayMode="date"
        onToggleDisplayMode={noop}
      />
    )
    const editButtons = screen.getAllByRole('button', { name: '編集' })
    await userEvent.click(editButtons[0]!)
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
        displayMode="date"
        onToggleDisplayMode={noop}
      />
    )
    await userEvent.click(screen.getAllByRole('button', { name: '削除' })[0]!)
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
        displayMode="date"
        onToggleDisplayMode={noop}
      />
    )
    await userEvent.click(screen.getAllByRole('button', { name: '削除' })[0]!)
    await userEvent.click(screen.getByRole('button', { name: '削除する' }))
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce())
  })

  it('onDelete が渡された場合、deleteTransaction の代わりに onDelete を使う', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    render(
      <TransactionList
        transactions={[TRANSACTIONS[0]!]}
        categories={CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        onEdit={noop}
        onDeleted={noop}
        onDelete={onDelete}
        displayMode="date"
        onToggleDisplayMode={noop}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: '削除' }))
    await userEvent.click(screen.getByRole('button', { name: '削除する' }))
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('2025-03', 't1'))
    expect(deleteTransaction).not.toHaveBeenCalled()
  })
})

describe('TransactionList - 表示モード切替', () => {
  it('日付別モード時、ヘッダーカードに「日付別」ラベルが表示される', () => {
    render(
      <TransactionList
        transactions={TRANSACTIONS}
        categories={CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        onEdit={noop}
        onDeleted={noop}
        displayMode="date"
        onToggleDisplayMode={noop}
      />
    )
    expect(screen.getByText('日付別')).toBeInTheDocument()
  })

  it('カテゴリ別モード時、ヘッダーカードに「カテゴリ別」ラベルが表示される', () => {
    render(
      <TransactionList
        transactions={TRANSACTIONS}
        categories={CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        onEdit={noop}
        onDeleted={noop}
        displayMode="category"
        onToggleDisplayMode={noop}
      />
    )
    expect(screen.getByText('カテゴリ別')).toBeInTheDocument()
  })

  it('歯車押下で onToggleDisplayMode が呼ばれる', async () => {
    const onToggle = vi.fn()
    render(
      <TransactionList
        transactions={TRANSACTIONS}
        categories={CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        onEdit={noop}
        onDeleted={noop}
        displayMode="date"
        onToggleDisplayMode={onToggle}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /表示モード切替/ }))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('データが0件でもヘッダーカードと歯車は表示される', () => {
    render(
      <TransactionList
        transactions={[]}
        categories={CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        onEdit={noop}
        onDeleted={noop}
        displayMode="date"
        onToggleDisplayMode={noop}
      />
    )
    expect(screen.getByText('日付別')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /表示モード切替/ })).toBeInTheDocument()
  })

  it('カテゴリ別モード時、カテゴリ単位でグループ化され合計絶対値降順で並ぶ', () => {
    const txs: Transaction[] = [
      { id: 't1', type: 'expense', amount: 1000, categoryId: 'c1', date: '2025-03-15', memo: '' },
      { id: 't2', type: 'expense', amount: 2000, categoryId: 'c1', date: '2025-03-16', memo: '' },
      { id: 't3', type: 'income', amount: 300000, categoryId: 'c2', date: '2025-03-25', memo: '' },
    ]
    render(
      <TransactionList
        transactions={txs}
        categories={CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        onEdit={noop}
        onDeleted={noop}
        displayMode="category"
        onToggleDisplayMode={noop}
      />
    )
    // ヘッダー部分のカテゴリラベル（食費、給与）を取得
    const labels = screen.getAllByText(/^(食費|給与)$/)
    expect(labels[0]!.textContent).toBe('給与')
    expect(labels[1]!.textContent).toBe('食費')
  })

  it('日付別モード時、グループヘッダーに収入と支出の合計が両方表示される', () => {
    const txs: Transaction[] = [
      { id: 't1', type: 'expense', amount: 1500, categoryId: 'c1', date: '2025-03-15', memo: '' },
      { id: 't2', type: 'income', amount: 5000, categoryId: 'c2', date: '2025-03-15', memo: '' },
    ]
    render(
      <TransactionList
        transactions={txs}
        categories={CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        onEdit={noop}
        onDeleted={noop}
        displayMode="date"
        onToggleDisplayMode={noop}
      />
    )
    // 同日に両方ある → 合計表示で両方出る（行の金額と合わせると複数ヒット）
    expect(screen.getAllByText('+¥5,000').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('-¥1,500').length).toBeGreaterThanOrEqual(1)
  })

  it('カテゴリ別モード時、未知カテゴリは「（不明）」として末尾に表示される', () => {
    const txs: Transaction[] = [
      { id: 't1', type: 'expense', amount: 5000, categoryId: 'c1', date: '2025-03-15', memo: '' },
      { id: 't2', type: 'expense', amount: 1000, categoryId: 'unknown-cat', date: '2025-03-16', memo: '' },
    ]
    render(
      <TransactionList
        transactions={txs}
        categories={CATEGORIES}
        paymentMethods={PAYMENT_METHODS}
        onEdit={noop}
        onDeleted={noop}
        displayMode="category"
        onToggleDisplayMode={noop}
      />
    )
    expect(screen.getByText('（不明）')).toBeInTheDocument()
    const labels = screen.getAllByText(/^(食費|（不明）)$/)
    expect(labels[0]!.textContent).toBe('食費')
    expect(labels[1]!.textContent).toBe('（不明）')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CategoryAddModal from '../features/CategoryAddModal'
import type { Category } from '../types'

vi.mock('../hooks/useHousehold', () => ({
  useHousehold: vi.fn(() => ({ householdId: 'hh-test' })),
}))
vi.mock('../firebase/firestore', () => ({
  addCategory: vi.fn().mockResolvedValue('new-id'),
  updateCategory: vi.fn().mockResolvedValue(undefined),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
}))

import { updateCategory } from '../firebase/firestore'

const CATEGORIES: Category[] = [
  { id: 'c1', name: '食費', type: 'expense', color: '#f00', expenseType: 'variable', order: 0 },
  { id: 'c2', name: '外食', type: 'expense', color: '#0f0', expenseType: 'variable', order: 1 },
]

const noop = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CategoryAddModal - 編集モード', () => {
  function renderModal(props: Partial<React.ComponentProps<typeof CategoryAddModal>> = {}) {
    return render(
      <CategoryAddModal
        isOpen
        onClose={noop}
        onAdded={noop}
        onDeleted={noop}
        onUpdated={noop}
        type="expense"
        nextOrder={2}
        categories={CATEGORIES}
        {...props}
      />,
    )
  }

  it('修正ボタン押下でフォームに既存値がロードされる', async () => {
    renderModal()
    const editButtons = screen.getAllByRole('button', { name: '修正' })
    await userEvent.click(editButtons[0]!)
    expect(screen.getByDisplayValue('食費')).toBeInTheDocument()
    expect(screen.getByText('カテゴリを編集')).toBeInTheDocument()
    expect(screen.getByText('更新する')).toBeInTheDocument()
  })

  it('編集中の行に「編集中」バッジが表示される', async () => {
    renderModal()
    const editButtons = screen.getAllByRole('button', { name: '修正' })
    await userEvent.click(editButtons[0]!)
    expect(screen.getByText('編集中')).toBeInTheDocument()
  })

  it('「更新する」押下で updateCategory が呼ばれ onUpdated が発火する', async () => {
    const onUpdated = vi.fn()
    renderModal({ onUpdated })
    const editButtons = screen.getAllByRole('button', { name: '修正' })
    await userEvent.click(editButtons[0]!)
    const input = screen.getByDisplayValue('食費')
    await userEvent.clear(input)
    await userEvent.type(input, '食費（改）')
    await userEvent.click(screen.getByText('更新する'))
    await vi.waitFor(() => {
      expect(updateCategory).toHaveBeenCalledWith(
        'hh-test',
        'c1',
        expect.objectContaining({ name: '食費（改）' }),
      )
      expect(onUpdated).toHaveBeenCalled()
    })
  })

  it('「✕ キャンセル」で新規追加モードに戻る', async () => {
    renderModal()
    const editButtons = screen.getAllByRole('button', { name: '修正' })
    await userEvent.click(editButtons[0]!)
    await userEvent.click(screen.getByText(/キャンセル/))
    expect(screen.getByText('新しいカテゴリを追加')).toBeInTheDocument()
    expect(screen.getByText('追加する')).toBeInTheDocument()
  })

  it('別カテゴリの「修正」を押すと編集対象が切り替わる', async () => {
    renderModal()
    const editButtons = screen.getAllByRole('button', { name: '修正' })
    await userEvent.click(editButtons[0]!)
    expect(screen.getByDisplayValue('食費')).toBeInTheDocument()
    await userEvent.click(editButtons[1]!)
    expect(screen.getByDisplayValue('外食')).toBeInTheDocument()
  })

  it('updateCategoryFn が渡された場合はそちらが呼ばれる', async () => {
    const updateCategoryFn = vi.fn().mockResolvedValue(undefined)
    renderModal({ updateCategoryFn })
    const editButtons = screen.getAllByRole('button', { name: '修正' })
    await userEvent.click(editButtons[0]!)
    await userEvent.click(screen.getByText('更新する'))
    await vi.waitFor(() => {
      expect(updateCategoryFn).toHaveBeenCalled()
      expect(updateCategory).not.toHaveBeenCalled()
    })
  })
})

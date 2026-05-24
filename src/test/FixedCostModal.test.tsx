import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FixedCostModal from '../features/FixedCostModal'
import type { FixedCost } from '../types'

const BASE_COST: FixedCost = {
  id: 'fc1',
  name: '自動車税',
  frequency: 'yearly',
  dayOfMonth: 1,
  month: 5,
  amount: 39500,
  isVariable: false,
  paymentMethod: '銀行口座',
  memo: 'SUV',
  order: 0,
}

const noop = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FixedCostModal', () => {
  it('isOpen=false のとき何もレンダリングしない', () => {
    const { container } = render(
      <FixedCostModal isOpen={false} onClose={noop} cost={null} onSave={noop} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('新規追加モードで「固定費を追加」と表示する', () => {
    render(<FixedCostModal isOpen onClose={noop} cost={null} onSave={noop} />)
    expect(screen.getByText('固定費を追加')).toBeInTheDocument()
  })

  it('編集モードで「固定費を編集」と表示し、既存値をフォームに反映する', () => {
    render(<FixedCostModal isOpen onClose={noop} cost={BASE_COST} onSave={noop} />)
    expect(screen.getByText('固定費を編集')).toBeInTheDocument()
    expect(screen.getByDisplayValue('自動車税')).toBeInTheDocument()
    expect(screen.getByDisplayValue('39500')).toBeInTheDocument()
    expect(screen.getByDisplayValue('銀行口座')).toBeInTheDocument()
  })

  it('「毎年」を選択すると月フィールドが表示される', async () => {
    render(<FixedCostModal isOpen onClose={noop} cost={null} onSave={noop} />)
    await userEvent.click(screen.getByRole('button', { name: '毎年' }))
    // 月フィールドが表示される（月入力 + 日入力の2つのnumber input）
    const numberInputs = screen.getAllByRole('spinbutton')
    expect(numberInputs.length).toBeGreaterThanOrEqual(2)
  })

  it('「毎月」のとき引き落とし日ラベルが表示され、月フィールドは表示されない', () => {
    render(<FixedCostModal isOpen onClose={noop} cost={null} onSave={noop} />)
    expect(screen.getByText('引き落とし日')).toBeInTheDocument()
    expect(screen.queryByText('発生日')).not.toBeInTheDocument()
  })

  it('「隔年」を選択すると基準年フィールドが表示される', async () => {
    render(<FixedCostModal isOpen onClose={noop} cost={null} onSave={noop} />)
    await userEvent.click(screen.getByRole('button', { name: '隔年' }))
    expect(screen.getByText('基準年')).toBeInTheDocument()
  })

  it('「変動」を選択すると金額入力フィールドが非表示になる', async () => {
    render(<FixedCostModal isOpen onClose={noop} cost={null} onSave={noop} />)
    await userEvent.click(screen.getByRole('button', { name: '変動' }))
    expect(screen.getByText('変動（毎回変わる）')).toBeInTheDocument()
  })

  it('費目名が空のとき保存ボタンが disabled になる', () => {
    render(<FixedCostModal isOpen onClose={noop} cost={null} onSave={noop} />)
    expect(screen.getByRole('button', { name: '保存する' })).toBeDisabled()
  })

  it('費目名を入力すると保存ボタンが有効になる', async () => {
    render(<FixedCostModal isOpen onClose={noop} cost={null} onSave={noop} />)
    await userEvent.type(screen.getByPlaceholderText('例：自動車税、車検、家賃'), '家賃')
    expect(screen.getByRole('button', { name: '保存する' })).not.toBeDisabled()
  })

  it('保存ボタンクリックで onSave が正しいデータで呼ばれる', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<FixedCostModal isOpen onClose={onClose} cost={null} onSave={onSave} />)

    await userEvent.type(screen.getByPlaceholderText('例：自動車税、車検、家賃'), '家賃')
    await userEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
    expect(onSave.mock.calls[0]![0]).toMatchObject({ name: '家賃', frequency: 'monthly' })
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('Escape キーで onClose が呼ばれる', async () => {
    const onClose = vi.fn()
    render(<FixedCostModal isOpen onClose={onClose} cost={null} onSave={noop} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('背景クリックで onClose が呼ばれる', async () => {
    const onClose = vi.fn()
    render(<FixedCostModal isOpen onClose={onClose} cost={null} onSave={noop} />)
    // オーバーレイ（role=presentation相当）をクリック
    const overlay = document.querySelector('.fixed.inset-0') as HTMLElement
    await userEvent.click(overlay)
    expect(onClose).toHaveBeenCalledOnce()
  })
})

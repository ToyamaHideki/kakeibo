import { useCallback, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { addPaymentMethod, deletePaymentMethod } from '../firebase/firestore'
import { useHousehold } from '../hooks/useHousehold'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useConfirm } from '../hooks/useConfirm'
import ConfirmDialog from '../components/ConfirmDialog'
import type { PaymentMethod } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  onAdded: (paymentMethod: PaymentMethod) => void
  onDeleted: (id: string) => void
  nextOrder: number
  paymentMethods: PaymentMethod[]
  addPaymentMethodFn?: (pm: Omit<PaymentMethod, 'id'>) => Promise<string>
  deletePaymentMethodFn?: (id: string) => Promise<void>
}

export default function PaymentMethodAddModal({
  isOpen, onClose, onAdded, onDeleted, nextOrder, paymentMethods,
  addPaymentMethodFn, deletePaymentMethodFn,
}: Props) {
  const { householdId } = useHousehold()
  const { confirm, dialogProps } = useConfirm()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleClose = useCallback(() => {
    setName('')
    onClose()
  }, [onClose])

  useEscapeKey(handleClose, isOpen)

  async function handleDelete(pm: PaymentMethod) {
    if (!await confirm(`「${pm.name}」を削除しますか？\nこの支払い方法で登録済みの取引は残りますが、紐付けが失われます。`)) return
    await (deletePaymentMethodFn ?? ((id: string) => deletePaymentMethod(householdId!, id)))(pm.id)
    onDeleted(pm.id)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      const newPm = { name: name.trim(), order: nextOrder }
      const id = await (addPaymentMethodFn ?? ((pm: Omit<PaymentMethod, 'id'>) => addPaymentMethod(householdId!, pm)))(newPm)
      onAdded({ ...newPm, id })
      setName('')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
    <ConfirmDialog {...dialogProps} />
    {createPortal(
    <div
      className="fixed inset-0 bg-black/60 z-[70] flex items-end md:items-center justify-center"
      onClick={handleClose}
    >
      <div
        className="bg-white w-full md:max-w-sm md:rounded-xl rounded-t-2xl shadow-xl flex flex-col max-h-[85svh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 md:hidden shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-6 pb-6 pt-3 overflow-y-auto">
          <h3 className="text-base font-bold text-gray-800 mb-4">支払い方法を管理</h3>

          {/* 登録済み支払い方法一覧 */}
          {paymentMethods.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">登録済み</p>
              <div className="space-y-1">
                {paymentMethods.map(pm => (
                  <div key={pm.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
                    <span className="text-sm text-gray-700 truncate">{pm.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(pm)}
                      className="text-gray-300 hover:text-red-400 transition-colors shrink-0 ml-2 p-1"
                      title="削除"
                    >
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                        <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/>
                        <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <hr className="my-4 border-gray-100" />
            </div>
          )}

          {/* 新規追加フォーム */}
          <p className="text-xs font-medium text-gray-500 mb-3">新しい支払い方法を追加</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">支払い方法名</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例：Suica、PayPay"
                maxLength={20}
                required
                autoFocus
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="w-full py-2.5 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {saving ? '追加中...' : '追加する'}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  )}
  </>
  )
}

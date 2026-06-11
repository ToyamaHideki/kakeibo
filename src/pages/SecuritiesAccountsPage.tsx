import { useCallback, useMemo, useState } from 'react'
import { deleteField } from 'firebase/firestore'
import { Doughnut, Line } from 'react-chartjs-2'
import type { ChartOptions, TooltipItem } from 'chart.js'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import '../lib/chart'
import { useSecuritiesAccounts } from '../hooks/useSecuritiesAccounts'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useConfirm } from '../hooks/useConfirm'
import ConfirmDialog from '../components/ConfirmDialog'
import GhostLoader from '../components/GhostLoader'
import { SecuritiesAccountCard } from '../features/SecuritiesAccountCard'
import { SecuritiesAccountModal } from '../features/SecuritiesAccountModal'
import { formatYen, past12Months, ymLabel, defaultForm, accountToForm, type FormState } from '../features/securitiesUtils'
import type { SecuritiesAccount } from '../types'
import { currentYearMonth } from '../utils/date'

export default function SecuritiesAccountsPage() {
  const {
    accounts, loading,
    addAccount, updateAccount, deleteAccount,
    recordMonthlyValue, deleteMonthlyValue, reorderAccounts,
  } = useSecuritiesAccounts()

  const { confirm, dialogProps } = useConfirm()
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<SecuritiesAccount | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [activeTab, setActiveTab] = useState<'settings' | 'record'>('settings')
  const [recordMonth, setRecordMonth] = useState(currentYearMonth())
  const [recordInput, setRecordInput] = useState('')

  const closeModal = useCallback(() => {
    setShowModal(false)
    setEditTarget(null)
    setForm(defaultForm)
    setActiveTab('settings')
    setRecordMonth(currentYearMonth())
    setRecordInput('')
  }, [])

  useEscapeKey(closeModal, showModal)

  function openAdd() {
    setEditTarget(null)
    setForm(defaultForm)
    setActiveTab('settings')
    setShowModal(true)
  }

  function openEdit(account: SecuritiesAccount) {
    setEditTarget(account)
    setForm(accountToForm(account))
    setActiveTab('settings')
    setRecordMonth(currentYearMonth())
    setRecordInput(String(account.monthlyValues[currentYearMonth()] ?? ''))
    setShowModal(true)
  }

  async function handleSave() {
    const name = form.name.trim()
    if (!name) return
    const initialValue = Number(form.initialValue) || 0
    if (initialValue < 0) return

    if (editTarget) {
      await updateAccount(editTarget.id, {
        name,
        color: form.color,
        owner: form.owner.trim() || deleteField(),
        broker: form.broker.trim() || deleteField(),
        accountType: form.accountType || deleteField(),
        memo: form.memo.trim() || deleteField(),
      } as Partial<Omit<SecuritiesAccount, 'id'>>)
    } else {
      const ym = currentYearMonth()
      const data: Omit<SecuritiesAccount, 'id' | 'order'> = {
        name,
        color: form.color,
        currentValue: initialValue,
        monthlyValues: initialValue > 0 ? { [ym]: initialValue } : {},
      }
      if (form.owner.trim()) data.owner = form.owner.trim()
      if (form.broker.trim()) data.broker = form.broker.trim()
      if (form.accountType) data.accountType = form.accountType
      if (form.memo.trim()) data.memo = form.memo.trim()
      await addAccount(data)
    }

    closeModal()
  }

  async function handleDelete() {
    if (!editTarget) return
    if (!await confirm(`「${editTarget.name}」を削除しますか？\n月次評価額の履歴もすべて削除されます。`)) return
    await deleteAccount(editTarget.id)
    closeModal()
  }

  async function handleRecord() {
    if (!editTarget) return
    const value = Number(recordInput)
    if (Number.isNaN(value) || value < 0) return
    await recordMonthlyValue(editTarget.id, recordMonth, value)
    setEditTarget(prev => {
      if (!prev) return null
      const monthlyValues = { ...prev.monthlyValues, [recordMonth]: value }
      const latestYm = Object.keys(monthlyValues).sort().pop()!
      // [recordMonth]: value を追加したので必ず値が存在する
      return { ...prev, monthlyValues, currentValue: monthlyValues[latestYm]! }
    })
    setRecordInput('')
  }

  async function handleDeleteRecord(ym: string) {
    if (!editTarget) return
    if (!await confirm(`${ym} の記録を削除しますか？`)) return
    await deleteMonthlyValue(editTarget.id, ym)
    setEditTarget(prev => {
      if (!prev) return null
      const monthlyValues = { ...prev.monthlyValues }
      delete monthlyValues[ym]
      const latestYm = Object.keys(monthlyValues).sort().pop()
      const currentValue = latestYm ? (monthlyValues[latestYm] ?? 0) : 0
      return { ...prev, monthlyValues, currentValue }
    })
  }

  const totalCurrent = accounts.reduce((s, a) => s + a.currentValue, 0)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = accounts.findIndex(a => a.id === active.id)
    const newIdx = accounts.findIndex(a => a.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    reorderAccounts(arrayMove(accounts, oldIdx, newIdx))
  }

  const months = useMemo(() => past12Months(), [])

  const lineData = useMemo(() => ({
    labels: months.map(ymLabel),
    datasets: accounts.map(acc => ({
      label: acc.name,
      data: months.map(ym => acc.monthlyValues[ym] ?? null),
      borderColor: acc.color,
      backgroundColor: acc.color,
      tension: 0.25,
      spanGaps: true,
      pointRadius: 3,
    })),
  }), [months, accounts])

  const lineOptions = useMemo<ChartOptions<'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'line'>) => {
            const v = ctx.parsed.y
            return v == null ? '' : `${ctx.dataset.label}: ¥${v.toLocaleString()}`
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: v => `¥${Number(v).toLocaleString()}` },
      },
    },
  }), [])

  const doughnutData = useMemo(() => {
    const positive = accounts.filter(a => a.currentValue > 0)
    return {
      labels: positive.map(a => a.name),
      datasets: [{
        data: positive.map(a => a.currentValue),
        backgroundColor: positive.map(a => a.color),
        borderColor: '#fff',
        borderWidth: 2,
      }],
    }
  }, [accounts])

  const doughnutOptions = useMemo<ChartOptions<'doughnut'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'doughnut'>) => {
            const v = ctx.parsed
            const total = (ctx.dataset.data as number[]).reduce((s, n) => s + n, 0)
            const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0'
            return `${ctx.label}: ¥${v.toLocaleString()} (${pct}%)`
          },
        },
      },
    },
  }), [])

  const hasData = accounts.length > 0 && totalCurrent > 0

  if (loading) {
    return <div className="flex items-center justify-center h-48"><GhostLoader label="読み込み中..." /></div>
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <h2 className="text-xl font-bold text-gray-800">証券口座</h2>
        {accounts.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-500">総評価額</p>
            <p className="text-sm font-bold text-gray-800">{formatYen(totalCurrent)}</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-2">
        {accounts.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3v18h18" />
              <polyline points="7 14 11 10 14 13 21 6" />
            </svg>
            <p className="text-sm">証券口座がありません</p>
            <p className="text-xs mt-1">右下のボタンから口座を追加してください</p>
          </div>
        ) : (
          <>
            {/* グラフ */}
            {hasData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">月次推移（直近12ヶ月）</p>
                  <div className="h-56">
                    <Line data={lineData} options={lineOptions} />
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">口座別構成比（最新評価額）</p>
                  <div className="h-56">
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                  </div>
                </div>
              </div>
            )}

            {/* 一覧（D&D対応）*/}
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={accounts.map(a => a.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {accounts.map(account => (
                    <SortableSecuritiesAccountCard key={account.id} account={account} onEdit={openEdit} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed fab-mobile right-4 md:bottom-6 md:right-6 w-14 h-14 bg-sage-600 hover:bg-sage-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-10"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <SecuritiesAccountModal
        showModal={showModal}
        editTarget={editTarget}
        accounts={accounts}
        form={form}
        setForm={setForm}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        recordMonth={recordMonth}
        setRecordMonth={setRecordMonth}
        recordInput={recordInput}
        setRecordInput={setRecordInput}
        onClose={closeModal}
        onSave={handleSave}
        onDelete={handleDelete}
        onRecord={handleRecord}
        onDeleteRecord={handleDeleteRecord}
      />
      <ConfirmDialog {...dialogProps} />
    </div>
  )
}

function SortableSecuritiesAccountCard({
  account,
  onEdit,
}: {
  account: SecuritiesAccount
  onEdit: (a: SecuritiesAccount) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: account.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <SecuritiesAccountCard account={account} onEdit={onEdit} />
      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none p-1"
        tabIndex={-1}
        aria-label="並び替え"
      >
        <svg viewBox="0 0 8 14" width="10" height="14" fill="currentColor">
          <circle cx="2" cy="2"  r="1.2" /><circle cx="6" cy="2"  r="1.2" />
          <circle cx="2" cy="7"  r="1.2" /><circle cx="6" cy="7"  r="1.2" />
          <circle cx="2" cy="12" r="1.2" /><circle cx="6" cy="12" r="1.2" />
        </svg>
      </button>
    </div>
  )
}

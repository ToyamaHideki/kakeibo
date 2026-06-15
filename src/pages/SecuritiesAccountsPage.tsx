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
import SidePanelLayout from '../components/SidePanelLayout'
import { SecuritiesAccountCard } from '../features/SecuritiesAccountCard'
import { SecuritiesAccountModal } from '../features/SecuritiesAccountModal'
import SecuritiesAccountAddPanel from '../features/SecuritiesAccountAddPanel'
import { formatYen, past12Months, ymLabel, defaultForm, accountToForm, type FormState } from '../features/securitiesUtils'
import type { SecuritiesAccount, SecuritiesHolding } from '../types'
import { currentYearMonth } from '../utils/date'

export default function SecuritiesAccountsPage() {
  const {
    accounts, loading,
    addAccount, updateAccount, deleteAccount,
    recordMonthlyValue, deleteMonthlyValue, recordHoldingsMonthlyValues,
    reorderAccounts,
    saveHoldings,
  } = useSecuritiesAccounts()

  const { confirm, dialogProps } = useConfirm()
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<SecuritiesAccount | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [activeTab, setActiveTab] = useState<'settings' | 'holdings' | 'record'>('settings')
  const [holdings, setHoldings] = useState<SecuritiesHolding[]>([])

  const closeModal = useCallback(() => {
    setShowModal(false)
    setEditTarget(null)
    setForm(defaultForm)
    setActiveTab('settings')
    setHoldings([])
  }, [])

  useEscapeKey(closeModal, showModal)

  function openAdd() {
    setEditTarget(null)
    setForm(defaultForm)
    setActiveTab('settings')
    setHoldings([])
    setShowModal(true)
  }

  function openEdit(account: SecuritiesAccount) {
    setEditTarget(account)
    setForm(accountToForm(account))
    setActiveTab('settings')
    setHoldings(account.holdings ?? [])
    setShowModal(true)
  }

  // 編集中の holdings を変更したら、その場で Firestore へ永続化（自動保存）
  async function handleHoldingsChange(next: SecuritiesHolding[]) {
    setHoldings(next)
    if (editTarget) {
      await saveHoldings(editTarget.id, next)
    }
  }

  async function handleSave() {
    const name = form.name.trim()
    if (!name) return
    const initialValue = Number(form.initialValue) || 0
    if (initialValue < 0) return
    const pnlStr = form.unrealizedPnL.trim()
    const pnl = pnlStr === '' ? undefined : Number(pnlStr)

    if (editTarget) {
      // visibility が変わった場合はフック内でストレージを移し替える（旧側を削除→新側へ作成）
      await updateAccount(editTarget.id, {
        name,
        color: form.color,
        currentValue: initialValue,
        visibility: form.visibility,
        owner: form.owner.trim() || deleteField(),
        broker: form.broker.trim() || deleteField(),
        accountType: form.accountType || deleteField(),
        memo: form.memo.trim() || deleteField(),
        unrealizedPnL: pnl === undefined ? deleteField() : pnl,
      } as Partial<Omit<SecuritiesAccount, 'id'>>)
    } else {
      const ym = currentYearMonth()
      const data: Omit<SecuritiesAccount, 'id' | 'order'> = {
        name,
        color: form.color,
        currentValue: initialValue,
        monthlyValues: initialValue > 0 ? { [ym]: initialValue } : {},
        visibility: form.visibility,
      }
      if (form.owner.trim()) data.owner = form.owner.trim()
      if (form.broker.trim()) data.broker = form.broker.trim()
      if (form.accountType) data.accountType = form.accountType
      if (form.memo.trim()) data.memo = form.memo.trim()
      if (pnl !== undefined) data.unrealizedPnL = pnl
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

  async function handleRecordAccount(yearMonth: string, value: number) {
    if (!editTarget) return
    await recordMonthlyValue(editTarget.id, yearMonth, value)
  }

  async function handleRecordHoldings(yearMonth: string, valuesById: Record<string, number>) {
    if (!editTarget) return
    await recordHoldingsMonthlyValues(editTarget.id, yearMonth, valuesById)
  }

  async function handleDeleteRecord(ym: string) {
    if (!editTarget) return
    if (!await confirm(`${ym} の記録を削除しますか？\n商品ごとの記録があれば同月分も併せて削除されます。`)) return
    await deleteMonthlyValue(editTarget.id, ym)
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

  // チャートの表示モード
  const [chartView, setChartView] = useState<'accounts' | 'holdings'>('accounts')

  // 商品ごとに記録された月次値があるかチェック（商品別チャート表示の前提条件）
  // 全口座の商品を一覧化し、monthlyValues が存在するものだけ抽出
  const HOLDING_PALETTE = [
    '#4a7c59', '#3b82f6', '#8b5cf6', '#f97316',
    '#ec4899', '#14b8a6', '#eab308', '#ef4444',
    '#06b6d4', '#a855f7', '#f59e0b', '#10b981',
  ]
  const trackedHoldings = useMemo(() => {
    type Entry = { holdingId: string; name: string; color: string; monthlyValues: Record<string, number> }
    const result: Entry[] = []
    let i = 0
    for (const acc of accounts) {
      if (!acc.holdings) continue
      const sortedH = [...acc.holdings].sort((a, b) => a.order - b.order)
      for (const h of sortedH) {
        if (h.monthlyValues && Object.keys(h.monthlyValues).length > 0) {
          // 同名商品が複数口座に存在する可能性に備え「口座名 / 商品名」で表示
          const sameName = accounts.some(other =>
            other.id !== acc.id && other.holdings?.some(oh => oh.name === h.name),
          )
          result.push({
            holdingId: h.id,
            name: sameName ? `${acc.name} / ${h.name}` : h.name,
            color: HOLDING_PALETTE[i % HOLDING_PALETTE.length]!,
            monthlyValues: h.monthlyValues,
          })
          i++
        }
      }
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts])

  const hasTrackedHoldings = trackedHoldings.length > 0

  const lineData = useMemo(() => {
    if (chartView === 'holdings' && hasTrackedHoldings) {
      return {
        labels: months.map(ymLabel),
        datasets: trackedHoldings.map(h => ({
          label: h.name,
          data: months.map(ym => h.monthlyValues[ym] ?? null),
          borderColor: h.color,
          backgroundColor: h.color,
          tension: 0.25,
          spanGaps: true,
          pointRadius: 3,
        })),
      }
    }
    return {
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
    }
  }, [months, accounts, chartView, hasTrackedHoldings, trackedHoldings])

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
    if (chartView === 'holdings' && hasTrackedHoldings) {
      // 各商品の最新月の値で構成比を作る
      const positive = trackedHoldings
        .map(h => {
          const latestYm = Object.keys(h.monthlyValues).sort().pop()
          const v = latestYm ? (h.monthlyValues[latestYm] ?? 0) : 0
          return { ...h, value: v }
        })
        .filter(h => h.value > 0)
      return {
        labels: positive.map(h => h.name),
        datasets: [{
          data: positive.map(h => h.value),
          backgroundColor: positive.map(h => h.color),
          borderColor: '#fff',
          borderWidth: 2,
        }],
      }
    }
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
  }, [accounts, chartView, hasTrackedHoldings, trackedHoldings])

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
    <SidePanelLayout
      title="証券口座"
      sidePanelTitle="口座を追加"
      fabAriaLabel="証券口座を追加"
      onFabClick={openAdd}
      sidePanel={<SecuritiesAccountAddPanel onAdd={addAccount} />}
    >
      {accounts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex items-center justify-between xl:shrink-0">
          <p className="text-xs text-gray-500">総評価額</p>
          <p className="text-sm font-bold text-gray-800">{formatYen(totalCurrent)}</p>
        </div>
      )}

      <div className="xl:flex-1 xl:min-h-0 xl:overflow-y-auto">
        {accounts.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3v18h18" />
              <polyline points="7 14 11 10 14 13 21 6" />
            </svg>
            <p className="text-sm">証券口座がありません</p>
            <p className="text-xs mt-1 xl:hidden">右下のボタンから口座を追加してください</p>
            <p className="text-xs mt-1 hidden xl:block">右の入力パネルから口座を追加してください</p>
          </div>
        ) : (
          <>
            {/* グラフ */}
            {hasData && (
              <div className="mb-4">
                {/* 商品別チャート切替トグル（商品ごとに記録された月次値があるときのみ表示） */}
                {hasTrackedHoldings && (
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-xs text-gray-500">表示：</span>
                    <div className="inline-flex bg-gray-100 rounded-lg p-0.5">
                      {(['accounts', 'holdings'] as const).map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setChartView(v)}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                            chartView === v
                              ? 'bg-white text-sage-700 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {v === 'accounts' ? '口座別' : '商品別'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">
                      月次推移（直近12ヶ月）{chartView === 'holdings' && '・商品別'}
                    </p>
                    <div className="h-56">
                      <Line data={lineData} options={lineOptions} />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">
                      {chartView === 'holdings' ? '商品別構成比（最新月）' : '口座別構成比（最新評価額）'}
                    </p>
                    <div className="h-56">
                      <Doughnut data={doughnutData} options={doughnutOptions} />
                    </div>
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

      <SecuritiesAccountModal
        showModal={showModal}
        editTarget={editTarget}
        accounts={accounts}
        form={form}
        setForm={setForm}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        holdings={holdings}
        onHoldingsChange={handleHoldingsChange}
        onClose={closeModal}
        onSave={handleSave}
        onDelete={handleDelete}
        onRecordAccount={handleRecordAccount}
        onRecordHoldings={handleRecordHoldings}
        onDeleteRecord={handleDeleteRecord}
      />
      <ConfirmDialog {...dialogProps} />
    </SidePanelLayout>
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

import { useCallback, useMemo, useState } from 'react'
import { deleteField } from 'firebase/firestore'
import { Doughnut, Line } from 'react-chartjs-2'
import type { ChartOptions, TooltipItem } from 'chart.js'
import '../lib/chart'
import { useSecuritiesAccounts } from '../hooks/useSecuritiesAccounts'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useConfirm } from '../hooks/useConfirm'
import ConfirmDialog from '../components/ConfirmDialog'
import type { SecuritiesAccount, SecuritiesAccountType } from '../types'

// ─── 定数 ─────────────────────────────────────────────────────────────────────

const ACCOUNT_COLORS = [
  '#4a7c59', '#3b82f6', '#8b5cf6', '#f97316',
  '#ec4899', '#14b8a6', '#eab308', '#ef4444',
]

const ACCOUNT_TYPE_OPTIONS: { value: SecuritiesAccountType; label: string }[] = [
  { value: 'specific', label: '特定口座' },
  { value: 'nisa', label: 'NISA' },
  { value: 'ideco', label: 'iDeCo' },
  { value: 'foreign', label: '外国株' },
  { value: 'other', label: 'その他' },
]

function formatYen(n: number) {
  if (n >= 10000) return `¥${(n / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}万`
  return `¥${n.toLocaleString()}`
}

function currentYearMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function adjacentMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function past12Months(): string[] {
  const result: string[] = []
  let ym = currentYearMonth()
  for (let i = 0; i < 12; i++) {
    result.unshift(ym)
    ym = adjacentMonth(ym, -1)
  }
  return result
}

function ymLabel(ym: string): string {
  const [, m] = ym.split('-')
  return `${Number(m)}月`
}

// ─── フォーム型 ────────────────────────────────────────────────────────────────

type FormState = {
  name: string
  owner: string
  broker: string
  accountType: SecuritiesAccountType | ''
  color: string
  memo: string
  initialValue: string
}

const defaultForm: FormState = {
  name: '',
  owner: '',
  broker: '',
  accountType: '',
  color: ACCOUNT_COLORS[0],
  memo: '',
  initialValue: '',
}

function accountToForm(a: SecuritiesAccount): FormState {
  return {
    name: a.name,
    owner: a.owner ?? '',
    broker: a.broker ?? '',
    accountType: a.accountType ?? '',
    color: a.color,
    memo: a.memo ?? '',
    initialValue: String(a.currentValue),
  }
}

// ─── ページ ────────────────────────────────────────────────────────────────────

export default function SecuritiesAccountsPage() {
  const {
    accounts, loading,
    addAccount, updateAccount, deleteAccount,
    recordMonthlyValue, deleteMonthlyValue,
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
      return { ...prev, monthlyValues, currentValue: monthlyValues[latestYm] }
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
      const currentValue = latestYm ? monthlyValues[latestYm] : 0
      return { ...prev, monthlyValues, currentValue }
    })
  }

  const totalCurrent = accounts.reduce((s, a) => s + a.currentValue, 0)

  // ─── グラフ用データ ──────────────────────────────────────────────────────────
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
    return <div className="flex items-center justify-center h-48 text-gray-500 text-sm">読み込み中...</div>
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

            {/* 一覧 */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {accounts.map(account => <AccountCard key={account.id} account={account} onEdit={openEdit} />)}
            </div>
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

      {/* モーダル */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90svh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
              <h3 className="text-base font-bold text-gray-800">{editTarget ? '口座を編集' : '口座を追加'}</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-600">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {editTarget && (
              <div className="flex gap-1 px-4 pt-3 shrink-0">
                {(['settings', 'record'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === tab ? 'bg-sage-600 text-white' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {tab === 'settings' ? '基本設定' : '評価額を記録'}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">口座名 <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="例：楽天証券 NISA"
                    autoFocus={!editTarget}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">名義人（任意）</label>
                  <input
                    type="text"
                    value={form.owner}
                    onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                    placeholder="例：夫、妻"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">証券会社（任意）</label>
                  <input
                    type="text"
                    value={form.broker}
                    onChange={e => setForm(f => ({ ...f, broker: e.target.value }))}
                    placeholder="例：楽天証券"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">口座種別（任意）</label>
                  <select
                    value={form.accountType}
                    onChange={e => setForm(f => ({ ...f, accountType: e.target.value as SecuritiesAccountType | '' }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                  >
                    <option value="">未設定</option>
                    {ACCOUNT_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {!editTarget && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">現在の評価額（初回登録）</label>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-500">¥</span>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={form.initialValue}
                        onChange={e => setForm(f => ({ ...f, initialValue: e.target.value }))}
                        placeholder="1000000"
                        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                      />
                      <span className="text-sm text-gray-500">円</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">0より大きい値を入力すると今月の記録として保存されます</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">カラー</label>
                  <div className="flex gap-2 flex-wrap">
                    {ACCOUNT_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, color: c }))}
                        className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">メモ（任意）</label>
                  <textarea
                    value={form.memo}
                    onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 resize-none"
                  />
                </div>

                <div className="space-y-2 pb-2">
                  <button
                    onClick={handleSave}
                    disabled={!form.name.trim()}
                    className="w-full py-3 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-xl font-medium text-sm transition-colors"
                  >
                    {editTarget ? '保存する' : '追加する'}
                  </button>
                  {editTarget && (
                    <button
                      onClick={handleDelete}
                      className="w-full py-3 bg-white hover:bg-red-50 text-red-400 hover:text-red-500 border border-red-200 rounded-xl font-medium text-sm transition-colors"
                    >
                      削除する
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'record' && editTarget && (
              <RecordTab
                account={accounts.find(a => a.id === editTarget.id) ?? editTarget}
                recordMonth={recordMonth}
                recordInput={recordInput}
                onMonthChange={ym => {
                  setRecordMonth(ym)
                  const acc = accounts.find(a => a.id === editTarget.id) ?? editTarget
                  setRecordInput(acc.monthlyValues[ym] !== undefined ? String(acc.monthlyValues[ym]) : '')
                }}
                onInputChange={setRecordInput}
                onRecord={handleRecord}
                onDeleteRecord={handleDeleteRecord}
              />
            )}
          </div>
        </div>
      )}
      <ConfirmDialog {...dialogProps} />
    </div>
  )
}

// ─── AccountCard ──────────────────────────────────────────────────────────────

function AccountCard({ account, onEdit }: { account: SecuritiesAccount; onEdit: (a: SecuritiesAccount) => void }) {
  const months = Object.keys(account.monthlyValues).sort()
  const latestYm = months[months.length - 1]
  const prevYm = months[months.length - 2]
  const latest = latestYm ? account.monthlyValues[latestYm] : account.currentValue
  const prev = prevYm ? account.monthlyValues[prevYm] : null
  const diff = prev !== null ? latest - prev : null
  const diffPct = prev && prev > 0 ? (diff! / prev) * 100 : null
  const typeLabel = account.accountType
    ? ACCOUNT_TYPE_OPTIONS.find(o => o.value === account.accountType)?.label
    : undefined

  return (
    <button
      onClick={() => onEdit(account)}
      className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:border-gray-200 transition-colors"
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: account.color }} />
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="flex-1 text-sm font-semibold text-gray-800 truncate">{account.name}</span>
          {account.owner && (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-sage-50 text-sage-600 font-medium">{account.owner}</span>
          )}
          {typeLabel && (
            <span className="shrink-0 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{typeLabel}</span>
          )}
        </div>
        {account.broker && (
          <p className="text-[11px] text-gray-500 mb-2 truncate">{account.broker}</p>
        )}
        <div className="flex items-baseline justify-between">
          <span className="text-base font-bold text-gray-800">{formatYen(latest)}</span>
          {diff !== null && (
            <span className={`text-[11px] font-medium ${diff >= 0 ? 'text-sage-600' : 'text-red-500'}`}>
              {diff >= 0 ? '+' : ''}{formatYen(diff)}
              {diffPct !== null && (
                <span className="ml-1 text-[10px] text-gray-500">({diffPct >= 0 ? '+' : ''}{diffPct.toFixed(1)}%)</span>
              )}
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-500 mt-1">
          {latestYm ? `${latestYm.replace('-', '年')}月時点` : '未記録'}
        </p>
      </div>
    </button>
  )
}

// ─── RecordTab ────────────────────────────────────────────────────────────────

function RecordTab({
  account,
  recordMonth,
  recordInput,
  onMonthChange,
  onInputChange,
  onRecord,
  onDeleteRecord,
}: {
  account: SecuritiesAccount
  recordMonth: string
  recordInput: string
  onMonthChange: (ym: string) => void
  onInputChange: (v: string) => void
  onRecord: () => void
  onDeleteRecord: (ym: string) => void
}) {
  const sortedRecords = Object.entries(account.monthlyValues ?? {})
    .sort(([a], [b]) => b.localeCompare(a))

  const existing = account.monthlyValues[recordMonth]

  return (
    <div className="overflow-y-auto px-5 py-4 space-y-4">
      <div className="bg-sage-50 rounded-xl px-4 py-3 text-sm">
        <span className="text-gray-500">最新評価額：</span>
        <span className="font-bold text-sage-700 ml-1">{formatYen(account.currentValue)}</span>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">記録する月</label>
        <input
          type="month"
          value={recordMonth}
          onChange={e => onMonthChange(e.target.value)}
          max={currentYearMonth()}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          評価額 {existing !== undefined && <span className="text-[10px] text-gray-500 ml-1">（上書きされます）</span>}
        </label>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-1">
            <span className="text-sm text-gray-500">¥</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={recordInput}
              onChange={e => onInputChange(e.target.value)}
              placeholder="1000000"
              autoFocus
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
            />
          </div>
          <button
            onClick={onRecord}
            disabled={recordInput === '' || Number(recordInput) < 0}
            className="px-4 py-2.5 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-xl text-sm font-medium transition-colors"
          >
            記録
          </button>
        </div>
      </div>

      {sortedRecords.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">記録履歴</p>
          <div className="space-y-1">
            {sortedRecords.map(([month, value]) => {
              const [cy, cm] = month.split('-')
              return (
                <div key={month} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500">{cy}年{Number(cm)}月</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">{formatYen(value)}</span>
                    <button
                      onClick={() => onDeleteRecord(month)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                      aria-label="この月の記録を削除"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

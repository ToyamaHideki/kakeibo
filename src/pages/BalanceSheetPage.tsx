import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useBalanceSheet } from '../hooks/useBalanceSheet'
import BalanceSheetItemRow from '../features/BalanceSheetItemRow'
import GhostLoader from '../components/GhostLoader'
import type { AssetSection, LiabilitySection } from '../types'

const ASSET_SECTION_LABELS: Record<AssetSection, string> = {
  current: '流動資産',
  financial: '金融資産',
  fixed: '固定資産',
}

const LIABILITY_SECTION_LABELS: Record<LiabilitySection, string> = {
  short: '短期負債',
  long: '長期負債',
}

const ASSET_SECTION_PRESETS: Record<AssetSection, string[]> = {
  current: ['現金', '普通預金', '定期預金', 'その他預貯金'],
  financial: ['株式', '投資信託', '債券', 'iDeCo・企業年金', '外貨預金', 'その他金融資産'],
  fixed: ['不動産（土地）', '不動産（建物）', '生命保険（解約返戻金）', '自動車', 'その他固定資産'],
}

const LIABILITY_SECTION_PRESETS: Record<LiabilitySection, string[]> = {
  short: ['クレジットカード残高', 'カードローン', 'その他短期負債'],
  long: ['住宅ローン残高', '自動車ローン残高', '教育ローン残高', 'その他ローン'],
}

type AddingState = { section: AssetSection | LiabilitySection; name: string; amount: string; note: string } | null

export default function BalanceSheetPage() {
  const { year: yearParam } = useParams<{ year: string }>()
  const year = Number(yearParam) || new Date().getFullYear()
  const navigate = useNavigate()

  const {
    sheet, loading,
    totalAssets, totalLiabilities, netWorth, prevNetWorth,
    addAsset, updateAsset, deleteAsset,
    addLiability, updateLiability, deleteLiability,
    syncLoans, syncSecuritiesAccounts,
  } = useBalanceSheet(year)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editNote, setEditNote] = useState('')
  const [adding, setAdding] = useState<AddingState>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [syncingSec, setSyncingSec] = useState(false)
  const [syncSecMsg, setSyncSecMsg] = useState('')

  const fmt = (n: number) => n.toLocaleString()

  const startEdit = (id: string, amount: number, note?: string) => {
    setEditingId(id)
    setEditAmount(String(amount))
    setEditNote(note ?? '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditAmount('')
    setEditNote('')
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const count = await syncLoans()
      setSyncMsg(count > 0 ? `${count}件のローンを追加しました` : 'すでにすべてのローンが登録済みです')
    } finally {
      setSyncing(false)
    }
  }

  const handleSyncSecurities = async () => {
    setSyncingSec(true)
    setSyncSecMsg('')
    try {
      const count = await syncSecuritiesAccounts()
      setSyncSecMsg(count > 0 ? `${count}件の証券口座を追加しました` : 'すでにすべての口座が登録済みです')
    } finally {
      setSyncingSec(false)
    }
  }

  const startAdding = (section: AssetSection | LiabilitySection) => {
    setAdding({ section, name: '', amount: '', note: '' })
  }

  const handleAdd = async () => {
    if (!adding || !adding.name.trim()) return
    const amount = parseFloat(adding.amount) || 0
    const isAsset = ['current', 'financial', 'fixed'].includes(adding.section)
    if (isAsset) {
      const items = sheet.assets.filter(a => a.section === adding.section)
      await addAsset({
        section: adding.section as AssetSection,
        name: adding.name.trim(),
        amount,
        order: items.length,
        ...(adding.note.trim() ? { note: adding.note.trim() } : {}),
      })
    } else {
      const items = sheet.liabilities.filter(l => l.section === adding.section)
      await addLiability({
        section: adding.section as LiabilitySection,
        name: adding.name.trim(),
        amount,
        order: items.length,
        ...(adding.note.trim() ? { note: adding.note.trim() } : {}),
      })
    }
    setAdding(null)
  }

  const netWorthDiff = prevNetWorth !== null ? netWorth - prevNetWorth : null

  if (loading) {
    return <div className="flex items-center justify-center h-full"><GhostLoader label="読み込み中..." /></div>
  }

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => navigate(`/balance-sheet/${year - 1}`)}
          className="p-2 text-gray-500 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="text-base font-bold text-gray-800">{year}年末 バランスシート</h2>
        <button
          onClick={() => navigate(`/balance-sheet/${year + 1}`)}
          className="p-2 text-gray-500 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">

          {/* 純資産サマリー */}
          <div className={`rounded-xl px-4 py-4 text-white ${netWorth >= 0 ? 'bg-sage-600' : 'bg-red-500'}`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-sm font-semibold">純資産</span>
                <p className="text-xs mt-0.5 opacity-80">総資産 {fmt(totalAssets)}円 / 総負債 {fmt(totalLiabilities)}円</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{fmt(netWorth)}円</p>
                {netWorthDiff !== null && (
                  <p className={`text-xs mt-0.5 ${netWorthDiff >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                    前年比 {netWorthDiff >= 0 ? '+' : ''}{fmt(netWorthDiff)}円
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 2カラムレイアウト（md以上）、スタック（モバイル） */}
          <div className="md:grid md:grid-cols-2 md:gap-4 space-y-4 md:space-y-0">

            {/* 資産 */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-700 px-1">資産</h3>
              {(['current', 'financial', 'fixed'] as AssetSection[]).map(section => {
                const items = sheet.assets.filter(a => a.section === section).sort((a, b) => a.order - b.order)
                const subtotal = items.reduce((s, a) => s + a.amount, 0)
                const isAddingHere = adding?.section === section

                return (
                  <section key={section} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-green-50 border-b border-green-100 flex justify-between items-center">
                      <span className="text-xs font-semibold text-green-800">{ASSET_SECTION_LABELS[section]}</span>
                      <span className="text-xs font-medium text-green-700">{fmt(subtotal)}円</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {items.map(item => (
                        <BalanceSheetItemRow
                          key={item.id}
                          item={item}
                          isEditing={editingId === item.id}
                          editAmount={editAmount}
                          editNote={editNote}
                          amountPlaceholder="金額（円）"
                          onChangeAmount={setEditAmount}
                          onChangeNote={setEditNote}
                          onStartEdit={() => startEdit(item.id, item.amount, item.note)}
                          onSaveEdit={async () => {
                            await updateAsset(item.id, { amount: parseFloat(editAmount) || 0, ...(editNote !== undefined ? { note: editNote || undefined } : {}) })
                            cancelEdit()
                          }}
                          onCancelEdit={cancelEdit}
                          onDelete={() => deleteAsset(item.id)}
                        />
                      ))}
                      {items.length === 0 && !isAddingHere && (
                        <p className="px-4 py-2 text-xs text-gray-500">項目がありません</p>
                      )}
                    </div>

                    {isAddingHere ? (
                      <AddItemForm
                        presets={ASSET_SECTION_PRESETS[section]}
                        value={adding!}
                        onChange={v => setAdding(v)}
                        onAdd={handleAdd}
                        onCancel={() => setAdding(null)}
                      />
                    ) : (
                      <button
                        onClick={() => startAdding(section)}
                        className="w-full px-4 py-2 text-xs text-green-600 hover:bg-green-50 flex items-center gap-1 border-t border-gray-100 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        追加
                      </button>
                    )}
                  </section>
                )
              })}
              <div className="px-4 py-3 bg-green-100 rounded-xl flex justify-between">
                <span className="text-sm font-bold text-green-900">総資産</span>
                <span className="text-sm font-bold text-green-800">{fmt(totalAssets)}円</span>
              </div>

              {/* 証券口座同期ボタン */}
              <div>
                <button
                  onClick={handleSyncSecurities}
                  disabled={syncingSec}
                  className="w-full py-2.5 border border-gray-200 rounded-xl text-xs text-gray-500 hover:border-sage-400 hover:text-sage-600 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                  </svg>
                  {syncingSec ? '同期中...' : '証券口座から取込'}
                </button>
                {syncSecMsg && (
                  <p className="text-xs text-center text-gray-500 mt-1.5">{syncSecMsg}</p>
                )}
              </div>
            </div>

            {/* 負債 */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-700 px-1">負債</h3>
              {(['short', 'long'] as LiabilitySection[]).map(section => {
                const items = sheet.liabilities.filter(l => l.section === section).sort((a, b) => a.order - b.order)
                const subtotal = items.reduce((s, l) => s + l.amount, 0)
                const isAddingHere = adding?.section === section

                return (
                  <section key={section} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 flex justify-between items-center">
                      <span className="text-xs font-semibold text-red-800">{LIABILITY_SECTION_LABELS[section]}</span>
                      <span className="text-xs font-medium text-red-700">{fmt(subtotal)}円</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {items.map(item => (
                        <BalanceSheetItemRow
                          key={item.id}
                          item={item}
                          isEditing={editingId === item.id}
                          editAmount={editAmount}
                          editNote={editNote}
                          amountPlaceholder="残高（円）"
                          onChangeAmount={setEditAmount}
                          onChangeNote={setEditNote}
                          onStartEdit={() => startEdit(item.id, item.amount, item.note)}
                          onSaveEdit={async () => {
                            await updateLiability(item.id, { amount: parseFloat(editAmount) || 0, ...(editNote !== undefined ? { note: editNote || undefined } : {}) })
                            cancelEdit()
                          }}
                          onCancelEdit={cancelEdit}
                          onDelete={() => deleteLiability(item.id)}
                        />
                      ))}
                      {items.length === 0 && !isAddingHere && (
                        <p className="px-4 py-2 text-xs text-gray-500">項目がありません</p>
                      )}
                    </div>

                    {isAddingHere ? (
                      <AddItemForm
                        presets={LIABILITY_SECTION_PRESETS[section]}
                        value={adding!}
                        onChange={v => setAdding(v)}
                        onAdd={handleAdd}
                        onCancel={() => setAdding(null)}
                      />
                    ) : (
                      <button
                        onClick={() => startAdding(section)}
                        className="w-full px-4 py-2 text-xs text-red-500 hover:bg-red-50 flex items-center gap-1 border-t border-gray-100 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        追加
                      </button>
                    )}
                  </section>
                )
              })}
              <div className="px-4 py-3 bg-red-100 rounded-xl flex justify-between">
                <span className="text-sm font-bold text-red-900">総負債</span>
                <span className="text-sm font-bold text-red-800">{fmt(totalLiabilities)}円</span>
              </div>

              {/* ローン同期ボタン */}
              <div>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="w-full py-2.5 border border-gray-200 rounded-xl text-xs text-gray-500 hover:border-sage-400 hover:text-sage-600 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                  </svg>
                  {syncing ? '同期中...' : '契約管理からローンを同期'}
                </button>
                {syncMsg && (
                  <p className="text-xs text-center text-gray-500 mt-1.5">{syncMsg}</p>
                )}
              </div>
            </div>
          </div>

          {/* 収支確認表へのリンク */}
          <button
            onClick={() => navigate(`/income-statement/${year}`)}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-sage-400 hover:text-sage-600 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            {year}年の収支確認表を確認
          </button>

          <div className="h-4" />
        </div>
      </div>
    </div>
  )
}

type AddItemFormProps = {
  presets: string[]
  value: NonNullable<AddingState>
  onChange: (v: NonNullable<AddingState>) => void
  onAdd: () => void
  onCancel: () => void
}

function AddItemForm({ presets, value, onChange, onAdd, onCancel }: AddItemFormProps) {
  return (
    <div className="px-4 py-3 border-t border-gray-100 space-y-2 bg-gray-50">
      <div className="flex flex-wrap gap-1 mb-1">
        {presets.map(p => (
          <button
            key={p}
            onClick={() => onChange({ ...value, name: p })}
            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
              value.name === p
                ? 'bg-sage-600 text-white border-sage-600'
                : 'border-gray-300 text-gray-500 hover:border-sage-400 hover:text-sage-600'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <input
        type="text"
        placeholder="項目名"
        value={value.name}
        onChange={e => onChange({ ...value, name: e.target.value })}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-sage-400"
      />
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="金額（円）"
          value={value.amount}
          onChange={e => onChange({ ...value, amount: e.target.value })}
          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-sage-400"
        />
        <button
          onClick={onAdd}
          disabled={!value.name.trim()}
          className="px-3 py-1.5 text-sm bg-sage-600 text-white rounded hover:bg-sage-700 disabled:opacity-40"
        >追加</button>
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">戻る</button>
      </div>
    </div>
  )
}

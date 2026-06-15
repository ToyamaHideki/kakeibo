import { useEffect, useState } from 'react'
import type { SecuritiesAccount } from '../types'
import { currentYearMonth } from '../utils/date'
import { formatYen, HOLDING_CATEGORY_OPTIONS } from './securitiesUtils'

type RecordMode = 'account' | 'holdings'

interface Props {
  account: SecuritiesAccount
  onRecordAccount: (yearMonth: string, value: number) => Promise<void>
  onRecordHoldings: (yearMonth: string, valuesById: Record<string, number>) => Promise<void>
  onDeleteRecord: (yearMonth: string) => Promise<void>
}

export function SecuritiesRecordTab({ account, onRecordAccount, onRecordHoldings, onDeleteRecord }: Props) {
  const sortedHoldings = [...(account.holdings ?? [])].sort((a, b) => a.order - b.order)
  const hasHoldings = sortedHoldings.length > 0

  // 商品があれば既定は「口座全体」。商品が無ければ常に口座モード固定。
  const [mode, setMode] = useState<RecordMode>('account')
  const [recordMonth, setRecordMonth] = useState(currentYearMonth())
  const [accountInput, setAccountInput] = useState('')
  const [holdingInputs, setHoldingInputs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // 商品が無くなったら強制的に口座モードに戻す
  useEffect(() => {
    if (!hasHoldings) setMode('account')
  }, [hasHoldings])

  // 月切替・モード切替時に既存の月次値を入力欄へ読み込み直す。
  // 記録成功による account 更新では入力欄を保持（クリアは記録ハンドラ側で実施）
  useEffect(() => {
    if (mode === 'holdings') {
      const inputs: Record<string, string> = {}
      sortedHoldings.forEach(h => {
        const v = h.monthlyValues?.[recordMonth]
        inputs[h.id] = v !== undefined ? String(v) : ''
      })
      setHoldingInputs(inputs)
      setAccountInput('')
    } else {
      const v = account.monthlyValues[recordMonth]
      setAccountInput(v !== undefined ? String(v) : '')
      setHoldingInputs({})
    }
    // recordMonth/mode 切替時のみ既存値をロードする。account 変更を含めると
    // 記録直後に再ロードされてクリアが取り消されてしまうため意図的に除外。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordMonth, mode])

  async function handleRecord() {
    if (saving) return
    setSaving(true)
    try {
      if (mode === 'holdings') {
        const valuesById: Record<string, number> = {}
        for (const h of sortedHoldings) {
          const inp = holdingInputs[h.id] ?? ''
          if (inp.trim() === '') continue
          const num = Number(inp)
          if (Number.isNaN(num) || num < 0) continue
          valuesById[h.id] = num
        }
        if (Object.keys(valuesById).length === 0) return
        await onRecordHoldings(recordMonth, valuesById)
        // 記録成功後、商品ごとの入力欄をクリア
        const cleared: Record<string, string> = {}
        sortedHoldings.forEach(h => { cleared[h.id] = '' })
        setHoldingInputs(cleared)
      } else {
        const num = Number(accountInput)
        if (Number.isNaN(num) || num < 0) return
        await onRecordAccount(recordMonth, num)
        // 記録成功後、口座入力欄をクリア
        setAccountInput('')
      }
    } finally {
      setSaving(false)
    }
  }

  const sortedRecords = Object.entries(account.monthlyValues ?? {})
    .sort(([a], [b]) => b.localeCompare(a))

  const canSave = mode === 'holdings'
    ? Object.values(holdingInputs).some(v => v.trim() !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0)
    : accountInput !== '' && !Number.isNaN(Number(accountInput)) && Number(accountInput) >= 0

  // 商品ごとモードでの口座合計プレビュー
  const previewSum = mode === 'holdings'
    ? sortedHoldings.reduce((s, h) => {
        const inp = holdingInputs[h.id] ?? ''
        const v = inp.trim() === '' ? (h.monthlyValues?.[recordMonth] ?? 0) : Number(inp)
        return s + (Number.isFinite(v) ? v : 0)
      }, 0)
    : 0

  return (
    <div className="overflow-y-auto px-5 py-4 space-y-4">
      <div className="bg-sage-50 rounded-xl px-4 py-3 text-sm">
        <span className="text-gray-500">最新評価額：</span>
        <span className="font-bold text-sage-700 ml-1">{formatYen(account.currentValue)}</span>
      </div>

      {/* モード切替（商品が登録されているときだけ表示）*/}
      {hasHoldings && (
        <div>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- セグメンテッドトグルのラベル */}
          <label className="block text-xs font-medium text-gray-600 mb-1.5">入力方法</label>
          <div className="grid grid-cols-2 gap-2">
            {(['account', 'holdings'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`py-2 px-3 rounded-xl text-xs font-medium transition-colors border ${
                  mode === m
                    ? 'bg-sage-600 border-sage-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {m === 'account' ? '口座全体で記録' : '商品ごとに記録'}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 mt-1.5">
            {mode === 'account'
              ? '口座全体の評価額を1つの値で記録します'
              : '商品ごとに評価額を入力し、合計が口座の月次値になります。記録した商品は月次推移グラフ／構成比グラフに「商品別」表示として現れます'}
          </p>
        </div>
      )}

      <div>
        <label htmlFor="securities-record-month" className="block text-xs font-medium text-gray-600 mb-1">記録する月</label>
        <input
          id="securities-record-month"
          type="month"
          value={recordMonth}
          onChange={e => setRecordMonth(e.target.value)}
          max={currentYearMonth()}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
        />
      </div>

      {mode === 'holdings' ? (
        // ─── 商品ごとモード ─────────────────────────────────────────────
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">商品ごとの評価額を入力（空欄の商品はスキップ）</p>
          {sortedHoldings.map(h => {
            const categoryLabel = HOLDING_CATEGORY_OPTIONS.find(o => o.value === h.category)?.label
            const existing = h.monthlyValues?.[recordMonth]
            return (
              <div key={h.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium text-gray-800 truncate flex-1">{h.name}</span>
                  <span className="shrink-0 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{categoryLabel}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">¥</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={holdingInputs[h.id] ?? ''}
                    onChange={e => setHoldingInputs(prev => ({ ...prev, [h.id]: e.target.value }))}
                    placeholder={existing !== undefined ? String(existing) : '0'}
                    className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                  />
                </div>
                {existing !== undefined && (
                  <p className="text-[10px] text-gray-500 mt-1">既存: {formatYen(existing)}（上書きされます）</p>
                )}
              </div>
            )
          })}
          <div className="bg-sage-50 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
            <span className="text-gray-500">この月の口座合計（プレビュー）</span>
            <span className="font-bold text-sage-700 tabular-nums">{formatYen(previewSum)}</span>
          </div>
          <button
            onClick={handleRecord}
            disabled={!canSave || saving}
            className="w-full px-4 py-2.5 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-xl text-sm font-medium transition-colors"
          >
            記録
          </button>
        </div>
      ) : (
        // ─── 口座全体モード ─────────────────────────────────────────────
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            評価額 {account.monthlyValues[recordMonth] !== undefined && <span className="text-[10px] text-gray-500 ml-1">（上書きされます）</span>}
          </label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-1">
              <span className="text-sm text-gray-500">¥</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={accountInput}
                onChange={e => setAccountInput(e.target.value)}
                placeholder="1000000"
                autoFocus
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
              />
            </div>
            <button
              onClick={handleRecord}
              disabled={!canSave || saving}
              className="px-4 py-2.5 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-xl text-sm font-medium transition-colors"
            >
              記録
            </button>
          </div>
        </div>
      )}

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

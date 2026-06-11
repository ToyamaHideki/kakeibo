import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCategories } from '../hooks/useCategories'
import { useIncomeStatement } from '../hooks/useIncomeStatement'
import GhostLoader from '../components/GhostLoader'

export default function IncomeStatementPage() {
  const { year: yearParam } = useParams<{ year: string }>()
  const year = Number(yearParam) || new Date().getFullYear()
  const navigate = useNavigate()

  const { categories, loading: catLoading } = useCategories()
  const {
    statement, autoIncome, autoExpenses, loading,
    incomeCategories, expenseCategories,
    effectiveIncome, effectiveExpenses,
    totalIncome, totalDeductions, netIncome, totalExpenses, annualBalance, savingsRate,
    setIncomeOverride, setExpenseOverride,
    addDeduction, updateDeduction, deleteDeduction,
  } = useIncomeStatement(year, categories)

  const [editingIncome, setEditingIncome] = useState<Record<string, string>>({})
  const [editingExpense, setEditingExpense] = useState<Record<string, string>>({})
  const [editingDeduction, setEditingDeduction] = useState<Record<string, string>>({})
  const [addingDeduction, setAddingDeduction] = useState(false)
  const [newDedName, setNewDedName] = useState('')
  const [newDedAmount, setNewDedAmount] = useState('')
  const [showAllExpenses, setShowAllExpenses] = useState(false)

  const fmt = (n: number) => n.toLocaleString()
  const isLoading = loading || catLoading

  const visibleExpenseCategories = showAllExpenses
    ? expenseCategories
    : expenseCategories.filter(cat => (effectiveExpenses[cat.id] ?? 0) > 0 || cat.id in editingExpense)

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><GhostLoader label="読み込み中..." /></div>
  }

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => navigate(`/income-statement/${year - 1}`)}
          className="p-2 text-gray-500 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="text-base font-bold text-gray-800">{year}年 収支確認表</h2>
        <button
          onClick={() => navigate(`/income-statement/${year + 1}`)}
          className="p-2 text-gray-500 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

          {/* 収入セクション */}
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-green-50 border-b border-green-100 flex items-center justify-between">
              <h3 className="font-semibold text-green-800 text-sm">収入</h3>
              <span className="text-xs text-green-600">月別取引から自動集計（上書き可）</span>
            </div>
            <div className="divide-y divide-gray-100">
              {incomeCategories.map(cat => {
                const auto = autoIncome[cat.id] ?? 0
                const overridden = statement.incomeOverrides[cat.id] !== undefined
                const effective = effectiveIncome[cat.id] ?? 0
                const isEditing = cat.id in editingIncome

                return (
                  <div key={cat.id} className="flex items-center px-4 py-3 gap-3 min-h-[48px]">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="flex-1 text-sm text-gray-700">{cat.name}</span>
                    {overridden && !isEditing && (
                      <span className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">上書き</span>
                    )}
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <input
                          type="number"
                          value={editingIncome[cat.id]}
                          onChange={e => setEditingIncome(p => ({ ...p, [cat.id]: e.target.value }))}
                          className="w-28 px-2 py-1 text-sm text-right border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                          autoFocus
                        />
                        <button
                          onClick={async () => {
                            const val = parseFloat(editingIncome[cat.id] ?? '')
                            await setIncomeOverride(cat.id, isNaN(val) ? null : val)
                            setEditingIncome(p => { const n = { ...p }; delete n[cat.id]; return n })
                          }}
                          className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >保存</button>
                        <button
                          onClick={() => setEditingIncome(p => { const n = { ...p }; delete n[cat.id]; return n })}
                          className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
                        >キャンセル</button>
                        {overridden && (
                          <button
                            onClick={async () => {
                              await setIncomeOverride(cat.id, null)
                              setEditingIncome(p => { const n = { ...p }; delete n[cat.id]; return n })
                            }}
                            className="text-xs text-red-400 hover:text-red-600"
                          >自動に戻る</button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">{fmt(effective)}円</span>
                          {overridden && (
                            <p className="text-xs text-gray-500">自動：{fmt(auto)}円</p>
                          )}
                        </div>
                        <button
                          onClick={() => setEditingIncome(p => ({ ...p, [cat.id]: String(effective) }))}
                          className="text-gray-300 hover:text-gray-500 transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="px-4 py-3 bg-green-50/60 border-t border-green-100 flex justify-between">
              <span className="text-sm font-semibold text-green-800">収入合計</span>
              <span className="text-sm font-bold text-green-700">{fmt(totalIncome)}円</span>
            </div>
          </section>

          {/* 控除セクション */}
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-red-50 border-b border-red-100">
              <h3 className="font-semibold text-red-800 text-sm">控除（税金・社会保険料）</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {statement.deductions.length === 0 && !addingDeduction && (
                <p className="px-4 py-3 text-sm text-gray-500">控除を追加してください</p>
              )}
              {statement.deductions.map(ded => {
                const isEditing = ded.id in editingDeduction
                return (
                  <div key={ded.id} className="flex items-center px-4 py-3 gap-3 min-h-[48px]">
                    <span className="flex-1 text-sm text-gray-700">{ded.name}</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editingDeduction[ded.id]}
                          onChange={e => setEditingDeduction(p => ({ ...p, [ded.id]: e.target.value }))}
                          className="w-28 px-2 py-1 text-sm text-right border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                          autoFocus
                        />
                        <button
                          onClick={async () => {
                            await updateDeduction(ded.id, { amount: parseFloat(editingDeduction[ded.id] ?? '') || 0 })
                            setEditingDeduction(p => { const n = { ...p }; delete n[ded.id]; return n })
                          }}
                          className="text-xs px-2 py-1 bg-blue-500 text-white rounded"
                        >保存</button>
                        <button
                          onClick={() => setEditingDeduction(p => { const n = { ...p }; delete n[ded.id]; return n })}
                          className="text-xs text-gray-500"
                        >キャンセル</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900">{fmt(ded.amount)}円</span>
                        <button
                          onClick={() => setEditingDeduction(p => ({ ...p, [ded.id]: String(ded.amount) }))}
                          className="text-gray-300 hover:text-gray-500"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteDeduction(ded.id)}
                          className="text-red-300 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {addingDeduction ? (
              <div className="px-4 py-3 border-t border-gray-100 space-y-2">
                <input
                  type="text"
                  placeholder="項目名（例：所得税）"
                  value={newDedName}
                  onChange={e => setNewDedName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-300"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="金額（円）"
                    value={newDedAmount}
                    onChange={e => setNewDedAmount(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-300"
                  />
                  <button
                    onClick={async () => {
                      if (!newDedName.trim()) return
                      await addDeduction({ name: newDedName.trim(), category: 'other_deduction', amount: parseFloat(newDedAmount) || 0 })
                      setNewDedName('')
                      setNewDedAmount('')
                      setAddingDeduction(false)
                    }}
                    className="px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                  >追加</button>
                  <button
                    onClick={() => { setAddingDeduction(false); setNewDedName(''); setNewDedAmount('') }}
                    className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                  >キャンセル</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingDeduction(true)}
                className="w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                控除を追加
              </button>
            )}

            <div className="px-4 py-3 bg-red-50/60 border-t border-red-100 flex justify-between">
              <span className="text-sm font-semibold text-red-800">控除合計</span>
              <span className="text-sm font-bold text-red-700">{fmt(totalDeductions)}円</span>
            </div>
          </section>

          {/* 手取り収入 */}
          <div className="bg-sage-600 rounded-xl px-4 py-4 text-white">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sm">手取り収入</span>
              <span className="text-xl font-bold">{fmt(netIncome)}円</span>
            </div>
            <p className="text-xs text-sage-200 mt-1">収入合計 {fmt(totalIncome)}円 / 控除合計 {fmt(totalDeductions)}円</p>
          </div>

          {/* 支出セクション */}
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
              <h3 className="font-semibold text-orange-800 text-sm">支出</h3>
              <span className="text-xs text-orange-600">月別取引から自動集計（上書き可）</span>
            </div>
            <div className="divide-y divide-gray-100">
              {visibleExpenseCategories.length === 0 && (
                <p className="px-4 py-3 text-sm text-gray-500">取引データなし</p>
              )}
              {visibleExpenseCategories.map(cat => {
                const auto = autoExpenses[cat.id] ?? 0
                const overridden = statement.expenseOverrides[cat.id] !== undefined
                const effective = effectiveExpenses[cat.id] ?? 0
                const isEditing = cat.id in editingExpense

                return (
                  <div key={cat.id} className="flex items-center px-4 py-3 gap-3 min-h-[48px]">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="flex-1 text-sm text-gray-700">{cat.name}</span>
                    {overridden && !isEditing && (
                      <span className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">上書き</span>
                    )}
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <input
                          type="number"
                          value={editingExpense[cat.id]}
                          onChange={e => setEditingExpense(p => ({ ...p, [cat.id]: e.target.value }))}
                          className="w-28 px-2 py-1 text-sm text-right border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                          autoFocus
                        />
                        <button
                          onClick={async () => {
                            const val = parseFloat(editingExpense[cat.id] ?? '')
                            await setExpenseOverride(cat.id, isNaN(val) ? null : val)
                            setEditingExpense(p => { const n = { ...p }; delete n[cat.id]; return n })
                          }}
                          className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >保存</button>
                        <button
                          onClick={() => setEditingExpense(p => { const n = { ...p }; delete n[cat.id]; return n })}
                          className="text-xs text-gray-500"
                        >キャンセル</button>
                        {overridden && (
                          <button
                            onClick={async () => {
                              await setExpenseOverride(cat.id, null)
                              setEditingExpense(p => { const n = { ...p }; delete n[cat.id]; return n })
                            }}
                            className="text-xs text-red-400 hover:text-red-600"
                          >自動に戻る</button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">{fmt(effective)}円</span>
                          {overridden && (
                            <p className="text-xs text-gray-500">自動：{fmt(auto)}円</p>
                          )}
                        </div>
                        <button
                          onClick={() => setEditingExpense(p => ({ ...p, [cat.id]: String(effective) }))}
                          className="text-gray-300 hover:text-gray-500 transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {!showAllExpenses && expenseCategories.length > visibleExpenseCategories.length && (
              <button
                onClick={() => setShowAllExpenses(true)}
                className="w-full px-4 py-2.5 text-xs text-gray-500 hover:text-gray-600 border-t border-gray-100 hover:bg-gray-50 transition-colors"
              >
                ゼロ円の項目も表示（{expenseCategories.length - visibleExpenseCategories.length}件）
              </button>
            )}
            <div className="px-4 py-3 bg-orange-50/60 border-t border-orange-100 flex justify-between">
              <span className="text-sm font-semibold text-orange-800">支出合計</span>
              <span className="text-sm font-bold text-orange-700">{fmt(totalExpenses)}円</span>
            </div>
          </section>

          {/* 年間収支サマリー */}
          <div className={`rounded-xl px-4 py-4 text-white ${annualBalance >= 0 ? 'bg-blue-600' : 'bg-red-500'}`}>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sm">年間収支</span>
              <span className="text-xl font-bold">
                {annualBalance >= 0 ? '+' : ''}{fmt(annualBalance)}円
              </span>
            </div>
            {netIncome > 0 && (
              <p className="text-xs mt-1 opacity-80">
                貯蓄率 {savingsRate.toFixed(1)}%　手取り {fmt(netIncome)}円 / 支出 {fmt(totalExpenses)}円
              </p>
            )}
          </div>

          {/* バランスシートへのリンク */}
          <button
            onClick={() => navigate(`/balance-sheet/${year}`)}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-sage-400 hover:text-sage-600 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
            {year}年のバランスシートを確認
          </button>

          <div className="h-4" />
        </div>
      </div>
    </div>
  )
}

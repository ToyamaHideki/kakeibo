import { useCallback, useEffect, useState } from 'react'
import { fetchMonthData } from '../firebase/firestore'
import { fetchIncomeStatement, saveIncomeStatement } from '../firebase/incomeStatementFirestore'
import { useHousehold } from './useHousehold'
import type { Category, IncomeStatement, IncomeStatementDeductionItem } from '../types'

function emptyStatement(year: number): IncomeStatement {
  return { year, incomeOverrides: {}, deductions: [], expenseOverrides: {} }
}

export function useIncomeStatement(year: number, categories: Category[]) {
  const { householdId } = useHousehold()
  const [statement, setStatement] = useState<IncomeStatement>(emptyStatement(year))
  const [autoIncome, setAutoIncome] = useState<Record<string, number>>({})
  const [autoExpenses, setAutoExpenses] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!householdId) return
    setLoading(true)
    try {
      const months = Array.from({ length: 12 }, (_, i) => {
        const m = String(i + 1).padStart(2, '0')
        return `${year}-${m}`
      })
      const [monthDatas, saved] = await Promise.all([
        Promise.all(months.map(ym => fetchMonthData(householdId!, ym))),
        fetchIncomeStatement(householdId!, year),
      ])

      const incomeAgg: Record<string, number> = {}
      const expenseAgg: Record<string, number> = {}
      for (const monthData of monthDatas) {
        if (!monthData) continue
        for (const t of monthData.transactions) {
          if (t.type === 'income') {
            incomeAgg[t.categoryId] = (incomeAgg[t.categoryId] ?? 0) + t.amount
          } else {
            expenseAgg[t.categoryId] = (expenseAgg[t.categoryId] ?? 0) + t.amount
          }
        }
      }

      setAutoIncome(incomeAgg)
      setAutoExpenses(expenseAgg)
      setStatement(saved ?? emptyStatement(year))
    } finally {
      setLoading(false)
    }
  }, [year, householdId])

  useEffect(() => { load() }, [load])

  const persist = useCallback(async (updated: IncomeStatement) => {
    if (!householdId) return
    setStatement(updated)
    await saveIncomeStatement(householdId, updated)
  }, [householdId])

  const setIncomeOverride = useCallback(async (categoryId: string, amount: number | null) => {
    const overrides = { ...statement.incomeOverrides }
    if (amount === null) {
      delete overrides[categoryId]
    } else {
      overrides[categoryId] = amount
    }
    await persist({ ...statement, incomeOverrides: overrides })
  }, [statement, persist])

  const setExpenseOverride = useCallback(async (categoryId: string, amount: number | null) => {
    const overrides = { ...statement.expenseOverrides }
    if (amount === null) {
      delete overrides[categoryId]
    } else {
      overrides[categoryId] = amount
    }
    await persist({ ...statement, expenseOverrides: overrides })
  }, [statement, persist])

  const addDeduction = useCallback(async (item: Omit<IncomeStatementDeductionItem, 'id'>) => {
    const newItem = { ...item, id: crypto.randomUUID() }
    await persist({ ...statement, deductions: [...statement.deductions, newItem] })
  }, [statement, persist])

  const updateDeduction = useCallback(async (id: string, data: Partial<Omit<IncomeStatementDeductionItem, 'id'>>) => {
    await persist({ ...statement, deductions: statement.deductions.map(d => d.id === id ? { ...d, ...data } : d) })
  }, [statement, persist])

  const deleteDeduction = useCallback(async (id: string) => {
    await persist({ ...statement, deductions: statement.deductions.filter(d => d.id !== id) })
  }, [statement, persist])

  const incomeCategories = categories.filter(c => c.type === 'income').sort((a, b) => a.order - b.order)
  const expenseCategories = categories.filter(c => c.type === 'expense').sort((a, b) => a.order - b.order)

  const effectiveIncome: Record<string, number> = {}
  for (const cat of incomeCategories) {
    effectiveIncome[cat.id] = statement.incomeOverrides[cat.id] ?? autoIncome[cat.id] ?? 0
  }

  const effectiveExpenses: Record<string, number> = {}
  for (const cat of expenseCategories) {
    effectiveExpenses[cat.id] = statement.expenseOverrides[cat.id] ?? autoExpenses[cat.id] ?? 0
  }

  const totalIncome = Object.values(effectiveIncome).reduce((s, v) => s + v, 0)
  const totalDeductions = statement.deductions.reduce((s, d) => s + d.amount, 0)
  const netIncome = totalIncome - totalDeductions
  const totalExpenses = Object.values(effectiveExpenses).reduce((s, v) => s + v, 0)
  const annualBalance = netIncome - totalExpenses
  const savingsRate = netIncome > 0 ? (annualBalance / netIncome) * 100 : 0

  return {
    statement, autoIncome, autoExpenses, loading,
    incomeCategories, expenseCategories,
    effectiveIncome, effectiveExpenses,
    totalIncome, totalDeductions, netIncome, totalExpenses, annualBalance, savingsRate,
    setIncomeOverride, setExpenseOverride,
    addDeduction, updateDeduction, deleteDeduction,
  }
}

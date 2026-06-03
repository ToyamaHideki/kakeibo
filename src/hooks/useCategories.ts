import { useQuery, useQueryClient } from '@tanstack/react-query'
import { addCategory, fetchCategories, updateCategory } from '../firebase/firestore'
import type { Category } from '../types'
import { useHousehold } from './useHousehold'

const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: '食費',     type: 'expense', expenseType: 'variable', color: '#f97316', order: 1 },
  { name: '外食',     type: 'expense', expenseType: 'variable', color: '#fb923c', order: 2 },
  { name: '交通費',   type: 'expense', expenseType: 'variable', color: '#3b82f6', order: 3 },
  { name: '光熱費',   type: 'expense', expenseType: 'fixed',    color: '#eab308', order: 4 },
  { name: '通信費',   type: 'expense', expenseType: 'variable', color: '#8b5cf6', order: 5 },
  { name: '固定通信費', type: 'expense', expenseType: 'fixed',  color: '#6366f1', order: 6 },
  { name: '日用品',   type: 'expense', expenseType: 'variable', color: '#06b6d4', order: 7 },
  { name: '医療費',   type: 'expense', expenseType: 'variable', color: '#ef4444', order: 8 },
  { name: '娯楽',     type: 'expense', expenseType: 'variable', color: '#ec4899', order: 9 },
  { name: '衣服',     type: 'expense', expenseType: 'variable', color: '#a855f7', order: 10 },
  { name: 'その他',   type: 'expense', expenseType: 'variable', color: '#9ca3af', order: 11 },
  { name: '給与',     type: 'income',  color: '#10b981', order: 1 },
  { name: '賞与',     type: 'income',  color: '#059669', order: 2 },
  { name: '副収入',   type: 'income',  color: '#34d399', order: 3 },
  { name: 'その他',   type: 'income',  color: '#9ca3af', order: 4 },
]

const EXPENSE_TYPE_MAP: Record<string, 'fixed' | 'variable'> = {
  '食費': 'variable',
  '外食': 'variable',
  '交通費': 'variable',
  '光熱費': 'fixed',
  '通信費': 'variable',
  '固定通信費': 'fixed',
  '日用品': 'variable',
  '医療費': 'variable',
  '娯楽': 'variable',
  '衣服': 'variable',
  'その他': 'variable',
}

async function initCategories(householdId: string): Promise<Category[]> {
  const existing = await fetchCategories(householdId)

  if (existing.length === 0) {
    const ids = await Promise.all(DEFAULT_CATEGORIES.map(cat => addCategory(householdId, cat)))
    return DEFAULT_CATEGORIES.map((cat, i) => ({ ...cat, id: ids[i]! }))
  }

  let cats = existing
  const updates: Promise<void>[] = []

  cats = cats.map(cat => {
    if (cat.type === 'expense' && !cat.expenseType) {
      const expenseType = EXPENSE_TYPE_MAP[cat.name] ?? 'variable'
      updates.push(updateCategory(householdId, cat.id, { expenseType }))
      return { ...cat, expenseType }
    }
    return cat
  })

  const hasFixedComms = cats.some(c => c.name === '固定通信費')
  if (!hasFixedComms) {
    const maxOrder = Math.max(0, ...cats.filter(c => c.type === 'expense').map(c => c.order))
    const newCat = {
      name: '固定通信費',
      type: 'expense' as const,
      expenseType: 'fixed' as const,
      color: '#6366f1',
      order: maxOrder + 1,
    }
    const id = await addCategory(householdId, newCat)
    cats = [...cats, { ...newCat, id }]
  }

  await Promise.all(updates)
  return sortCategories(cats)
}

export function useCategories() {
  const { householdId } = useHousehold()
  const queryClient = useQueryClient()

  const { data: categories = [], isLoading: loading } = useQuery({
    queryKey: ['categories', householdId],
    queryFn: () => initCategories(householdId!),
    enabled: !!householdId,
    staleTime: Infinity,
  })

  function addCategoryLocally(category: Category) {
    queryClient.setQueryData<Category[]>(
      ['categories', householdId],
      prev => sortCategories([...(prev ?? []), category]),
    )
  }

  function removeCategoryLocally(id: string) {
    queryClient.setQueryData<Category[]>(
      ['categories', householdId],
      prev => (prev ?? []).filter(c => c.id !== id),
    )
  }

  function updateCategoryLocally(category: Category) {
    queryClient.setQueryData<Category[]>(
      ['categories', householdId],
      prev => sortCategories((prev ?? []).map(c => c.id === category.id ? category : c)),
    )
  }

  async function reload() {
    await queryClient.invalidateQueries({ queryKey: ['categories', householdId] })
  }

  return { categories, loading, addCategoryLocally, removeCategoryLocally, updateCategoryLocally, reload }
}

function sortCategories(cats: Category[]): Category[] {
  return [...cats].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'expense' ? -1 : 1
    return a.order - b.order
  })
}

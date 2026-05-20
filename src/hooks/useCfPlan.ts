import { useEffect, useState } from 'react'
import { fetchCfPlan, saveCfPlan } from '../firebase/firestore'
import type { CfItem, CfPlan } from '../types'
import { useHousehold } from './useHousehold'

const thisYear = new Date().getFullYear()

const DEFAULT_PLAN: CfPlan = {
  startYear: thisYear,
  initialSavings: 0,
  members: [],
  incomeItems: [
    { id: 'income-1', name: '給与収入（本人）', rate: 1, order: 1, values: {} },
    { id: 'income-2', name: '給与収入（配偶者）', rate: 0, order: 2, values: {} },
    { id: 'income-3', name: '一時的な収入', rate: 0, order: 3, values: {} },
  ],
  expenseItems: [
    { id: 'expense-1', name: '基本生活費', rate: 2, order: 1, values: {} },
    { id: 'expense-2', name: '住居関連費', rate: 0, order: 2, values: {} },
    { id: 'expense-3', name: '車両費', rate: 0, order: 3, values: {} },
    { id: 'expense-4', name: '教育費', rate: 0, order: 4, values: {} },
    { id: 'expense-5', name: '保険料', rate: 0, order: 5, values: {} },
    { id: 'expense-6', name: 'その他の支出', rate: 0, order: 6, values: {} },
    { id: 'expense-7', name: '一時的な支出', rate: 0, order: 7, values: {} },
  ],
}

function sortPlan(plan: CfPlan): CfPlan {
  return {
    ...plan,
    incomeItems: [...plan.incomeItems].sort((a, b) => a.order - b.order),
    expenseItems: [...plan.expenseItems].sort((a, b) => a.order - b.order),
  }
}

export function useCfPlan() {
  const { householdId } = useHousehold()
  const [plan, setPlan] = useState<CfPlan>(sortPlan(DEFAULT_PLAN))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId) return
    async function load() {
      try {
        const data = await fetchCfPlan(householdId!)
        if (data) setPlan(sortPlan(data))
        else await saveCfPlan(householdId!, DEFAULT_PLAN)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [householdId])

  async function updatePlan(newPlan: CfPlan) {
    const sorted = sortPlan(newPlan)
    setPlan(sorted)
    if (householdId) await saveCfPlan(householdId, sorted)
  }

  function applyToItems(
    currentPlan: CfPlan,
    type: 'income' | 'expense',
    updater: (items: CfItem[]) => CfItem[],
  ): CfPlan {
    return type === 'income'
      ? { ...currentPlan, incomeItems: updater(currentPlan.incomeItems) }
      : { ...currentPlan, expenseItems: updater(currentPlan.expenseItems) }
  }

  async function updateItemValue(type: 'income' | 'expense', itemId: string, year: number, amount: number) {
    const newPlan = applyToItems(plan, type, items =>
      items.map(item => {
        if (item.id !== itemId) return item
        if (amount === 0) {
          const { [String(year)]: _, ...rest } = item.values
          return { ...item, values: rest }
        }
        return { ...item, values: { ...item.values, [String(year)]: amount } }
      }),
    )
    await updatePlan(newPlan)
  }

  async function updateItemName(type: 'income' | 'expense', itemId: string, name: string) {
    const newPlan = applyToItems(plan, type, items =>
      items.map(item => (item.id === itemId ? { ...item, name } : item)),
    )
    await updatePlan(newPlan)
  }

  async function updateItemRate(type: 'income' | 'expense', itemId: string, rate: number) {
    const newPlan = applyToItems(plan, type, items =>
      items.map(item => (item.id === itemId ? { ...item, rate } : item)),
    )
    await updatePlan(newPlan)
  }

  async function reorderItems(type: 'income' | 'expense', orderedIds: string[]) {
    const newPlan = applyToItems(plan, type, items => {
      const map = new Map(items.map(i => [i.id, i]))
      return orderedIds.map((id, index) => ({ ...map.get(id)!, order: index + 1 }))
    })
    await updatePlan(newPlan)
  }

  async function addItem(type: 'income' | 'expense', name: string): Promise<string> {
    const items = type === 'income' ? plan.incomeItems : plan.expenseItems
    const maxOrder = items.reduce((max, i) => Math.max(max, i.order), 0)
    const id = `${type}-${Date.now()}`
    const newItem: CfItem = { id, name, rate: 0, order: maxOrder + 1, values: {} }
    const newPlan = applyToItems(plan, type, items => [...items, newItem])
    await updatePlan(newPlan)
    return id
  }

  async function removeItem(type: 'income' | 'expense', itemId: string) {
    const newPlan = applyToItems(plan, type, items => items.filter(i => i.id !== itemId))
    await updatePlan(newPlan)
  }

  async function updateLifeEvent(year: number, text: string) {
    const currentEvents = plan.lifeEvents ?? {}
    const newEvents = text.trim()
      ? { ...currentEvents, [String(year)]: text.trim() }
      : Object.fromEntries(Object.entries(currentEvents).filter(([k]) => k !== String(year)))
    await updatePlan({ ...plan, lifeEvents: newEvents })
  }

  return {
    plan,
    loading,
    updatePlan,
    updateItemValue,
    updateItemName,
    updateItemRate,
    reorderItems,
    addItem,
    removeItem,
    updateLifeEvent,
  }
}

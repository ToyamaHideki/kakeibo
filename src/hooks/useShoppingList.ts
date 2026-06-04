import { useEffect, useState } from 'react'
import {
  addShoppingItem,
  deleteCheckedShoppingItems,
  deleteShoppingItem,
  fetchShoppingItems,
  updateShoppingItem,
} from '../firebase/lifestyleFirestore'
import type { ShoppingItem } from '../types'
import { useHousehold } from './useHousehold'

export function useShoppingList() {
  const { householdId } = useHousehold()
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId) return
    async function init() {
      try {
        const data = await fetchShoppingItems(householdId!)
        setItems(sorted(data))
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [householdId])

  async function addItem(name: string, category?: string) {
    if (!householdId) return
    const uncheckedOrders = items.filter(i => !i.checked).map(i => i.order)
    const order = uncheckedOrders.length > 0 ? Math.min(...uncheckedOrders) - 1 : 0
    const newItem: Omit<ShoppingItem, 'id'> = { name, checked: false, order, ...(category ? { category } : {}) }
    const id = await addShoppingItem(householdId, newItem)
    setItems(prev => sorted([...prev, { id, ...newItem }]))
  }

  async function setCategory(id: string, category: string) {
    if (!householdId) return
    await updateShoppingItem(householdId, id, { category })
    setItems(prev => prev.map(i => i.id === id ? { ...i, category } : i))
  }

  async function toggleItem(id: string) {
    if (!householdId) return
    const item = items.find(i => i.id === id)
    if (!item) return
    const checked = !item.checked
    await updateShoppingItem(householdId, id, { checked })
    setItems(prev => sorted(prev.map(i => i.id === id ? { ...i, checked } : i)))
  }

  async function deleteItem(id: string) {
    if (!householdId) return
    await deleteShoppingItem(householdId, id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function clearChecked() {
    if (!householdId) return
    const checkedIds = items.filter(i => i.checked).map(i => i.id)
    await deleteCheckedShoppingItems(householdId, checkedIds)
    setItems(prev => prev.filter(i => !i.checked))
  }

  async function reorderItems(newUnchecked: ShoppingItem[]) {
    if (!householdId) return
    setItems(prev => [...newUnchecked, ...prev.filter(i => i.checked)])
    await Promise.all(
      newUnchecked.map((item, idx) =>
        updateShoppingItem(householdId!, item.id, { order: idx * 1000 })
      )
    )
  }

  const uncheckedItems = items.filter(i => !i.checked)
  const checkedItems = items.filter(i => i.checked)

  return { uncheckedItems, checkedItems, loading, addItem, toggleItem, setCategory, deleteItem, clearChecked, reorderItems }
}

function sorted(items: ShoppingItem[]): ShoppingItem[] {
  return [...items.filter(i => !i.checked).sort((a, b) => a.order - b.order),
          ...items.filter(i => i.checked).sort((a, b) => a.order - b.order)]
}

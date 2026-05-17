import { useEffect, useState } from 'react'
import {
  addShoppingItem,
  deleteCheckedShoppingItems,
  deleteShoppingItem,
  fetchShoppingItems,
  updateShoppingItem,
} from '../firebase/lifestyleFirestore'
import { useHousehold } from './useHousehold'
import type { ShoppingItem } from '../types'

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

  async function addItem(name: string) {
    if (!householdId) return
    const order = Date.now()
    const id = await addShoppingItem(householdId, { name, checked: false, order })
    setItems(prev => sorted([...prev, { id, name, checked: false, order }]))
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

  const uncheckedItems = items.filter(i => !i.checked)
  const checkedItems = items.filter(i => i.checked)

  return { uncheckedItems, checkedItems, loading, addItem, toggleItem, deleteItem, clearChecked }
}

function sorted(items: ShoppingItem[]): ShoppingItem[] {
  return [...items.filter(i => !i.checked).sort((a, b) => a.order - b.order),
          ...items.filter(i => i.checked).sort((a, b) => a.order - b.order)]
}

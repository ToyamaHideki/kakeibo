import { useEffect, useState } from 'react'
import { useHousehold } from './useHousehold'

interface CrudOps<T extends { id: string }> {
  fetch: (householdId: string) => Promise<T[]>
  add: (householdId: string, data: Omit<T, 'id'>) => Promise<string>
  update: (householdId: string, id: string, data: Partial<Omit<T, 'id'>>) => Promise<void>
  remove: (householdId: string, id: string) => Promise<void>
}

export function useFirestoreCollection<T extends { id: string; order: number }>(ops: CrudOps<T>) {
  const { householdId } = useHousehold()
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId) return
    ops.fetch(householdId)
      .then(data => setItems(data.sort((a, b) => a.order - b.order)))
      .finally(() => setLoading(false))
  }, [householdId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function add(data: Omit<T, 'id'>) {
    if (!householdId) return
    const id = await ops.add(householdId, data)
    setItems(prev => [...prev, { id, ...data } as T].sort((a, b) => a.order - b.order))
  }

  async function update(id: string, data: Partial<Omit<T, 'id'>>) {
    if (!householdId) return
    await ops.update(householdId, id, data)
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...data } : item))
  }

  async function remove(id: string) {
    if (!householdId) return
    await ops.remove(householdId, id)
    setItems(prev => prev.filter(item => item.id !== id))
  }

  async function reorderItems(newItems: T[]) {
    if (!householdId) return
    setItems(newItems)
    await Promise.all(
      newItems.map((item, idx) =>
        ops.update(householdId!, item.id, { order: idx * 1000 } as Partial<Omit<T, 'id'>>)
      )
    )
  }

  return { items, setItems, loading, householdId, add, update, remove, reorderItems }
}

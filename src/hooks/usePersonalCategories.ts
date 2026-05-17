import { useEffect, useState } from 'react'
import { fetchPersonalCategories } from '../firebase/personalFirestore'
import type { Category } from '../types'

export function usePersonalCategories(uid: string) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      try {
        const existing = await fetchPersonalCategories(uid)
        setCategories(sortCategories(existing))
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [uid])

  function addCategoryLocally(category: Category) {
    setCategories(prev => sortCategories([...prev, category]))
  }

  function removeCategoryLocally(id: string) {
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  return { categories, loading, addCategoryLocally, removeCategoryLocally }
}

function sortCategories(cats: Category[]): Category[] {
  return cats.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'expense' ? -1 : 1
    return a.order - b.order
  })
}

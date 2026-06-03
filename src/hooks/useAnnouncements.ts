import { useEffect, useState } from 'react'
import { fetchAnnouncements } from '../firebase/announcementsFirestore'
import type { Announcement } from '../types'
import { useHousehold } from './useHousehold'

// 新しい順に並べる：releasedAt 降順、同タイムスタンプ内では order 降順
function sortByLatest(items: Announcement[]): Announcement[] {
  return [...items].sort((a, b) => {
    if (b.releasedAt !== a.releasedAt) return b.releasedAt - a.releasedAt
    return b.order - a.order
  })
}

export function useAnnouncements() {
  const { user } = useHousehold()
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }
    fetchAnnouncements()
      .then(data => setItems(sortByLatest(data)))
      .finally(() => setLoading(false))
  }, [user])

  return { announcements: items, loading }
}

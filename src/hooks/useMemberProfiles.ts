import { useEffect, useState } from 'react'
import { fetchMemberProfiles } from '../firebase/householdFirestore'
import { useHousehold } from './useHousehold'

// 世帯メンバーの uid → 表示名（ニックネーム優先、無ければメール先頭、最後はメンバー）のマップを返す。
// ゲスト・未ログインは空マップ。
export function useMemberProfiles(): Record<string, string> {
  const { householdId, isGuest } = useHousehold()
  const [names, setNames] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!householdId || isGuest) {
      setNames({})
      return
    }
    let active = true
    fetchMemberProfiles(householdId)
      .then(profiles => {
        if (!active) return
        const map: Record<string, string> = {}
        for (const [uid, p] of Object.entries(profiles)) {
          map[uid] = p.nickname?.trim() || p.email?.split('@')[0] || 'メンバー'
        }
        setNames(map)
      })
      .catch(() => { if (active) setNames({}) })
    return () => { active = false }
  }, [householdId, isGuest])

  return names
}

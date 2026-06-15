import { useCallback, useEffect, useState } from 'react'
import {
  fetchSecuritiesAccounts,
  addSecuritiesAccount,
  updateSecuritiesAccount,
  deleteSecuritiesAccount,
} from '../firebase/securitiesFirestore'
import {
  fetchPrivateSecuritiesAccounts,
  addPrivateSecuritiesAccount,
  updatePrivateSecuritiesAccount,
  deletePrivateSecuritiesAccount,
} from '../firebase/privateSecuritiesFirestore'
import { GUEST_HOUSEHOLD_ID } from '../firebase/guestStore'
import type { SecuritiesAccount, SecuritiesHolding, SecuritiesVisibility } from '../types'
import { nextOrder } from '../utils/order'
import { useHousehold } from './useHousehold'

// 共有口座は households/{hid}/securitiesAccounts、
// 本人限定口座は users/{uid}/privateSecuritiesAccounts に保存する。
// このフックは両者を統合してひとつのリストとして UI に提供し、
// visibility を切り替えた場合は古いストレージから削除して新しいストレージへ作り直す。

// ゲスト世帯では uid が無いため、private も同じ guest store の別キーへ保存する。
function effectiveUid(householdId: string | null, uid: string | null): string | null {
  if (householdId === GUEST_HOUSEHOLD_ID) return GUEST_HOUSEHOLD_ID
  return uid
}

export function useSecuritiesAccounts() {
  const { householdId, user } = useHousehold()
  const uid = effectiveUid(householdId, user?.uid ?? null)
  const [accounts, setAccounts] = useState<SecuritiesAccount[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!householdId) return
    setLoading(true)
    try {
      const [shared, priv] = await Promise.all([
        fetchSecuritiesAccounts(householdId),
        uid ? fetchPrivateSecuritiesAccounts(uid) : Promise.resolve([]),
      ])
      const tagged: SecuritiesAccount[] = [
        ...shared.map(a => ({ ...a, visibility: 'shared' as const })),
        ...priv.map(a => ({ ...a, visibility: 'private' as const })),
      ]
      setAccounts(tagged.sort((a, b) => a.order - b.order))
    } finally {
      setLoading(false)
    }
  }, [householdId, uid])

  useEffect(() => { load() }, [load])

  function getVisibility(id: string): SecuritiesVisibility | undefined {
    return accounts.find(a => a.id === id)?.visibility
  }

  async function addAccount(account: Omit<SecuritiesAccount, 'id' | 'order'>) {
    if (!householdId) return
    const visibility = account.visibility ?? 'shared'
    const data = { ...account, order: nextOrder(accounts), visibility }
    if (visibility === 'private') {
      if (!uid) throw new Error('private 口座の作成には uid が必要です')
      const id = await addPrivateSecuritiesAccount(uid, data)
      setAccounts(prev => [...prev, { ...data, id, visibility: 'private' }])
    } else {
      const id = await addSecuritiesAccount(householdId, data)
      setAccounts(prev => [...prev, { ...data, id, visibility: 'shared' }])
    }
  }

  // 公開範囲を変えない更新
  async function updateAccountInPlace(id: string, patch: Partial<Omit<SecuritiesAccount, 'id'>>) {
    if (!householdId) return
    const current = getVisibility(id)
    if (current === 'private') {
      if (!uid) return
      await updatePrivateSecuritiesAccount(uid, id, patch)
    } else {
      await updateSecuritiesAccount(householdId, id, patch)
    }
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...(patch as Partial<SecuritiesAccount>) } : a))
  }

  // 公開範囲が変わるかもしれない更新（モーダルの保存ボタンから呼ぶ）
  async function updateAccount(id: string, patch: Partial<Omit<SecuritiesAccount, 'id'>>) {
    if (!householdId) return
    const before = accounts.find(a => a.id === id)
    if (!before) return
    const nextVis: SecuritiesVisibility = (patch.visibility as SecuritiesVisibility | undefined) ?? before.visibility ?? 'shared'

    if (nextVis === (before.visibility ?? 'shared')) {
      // 場所は変わらないのでそのまま更新
      await updateAccountInPlace(id, patch)
      return
    }

    // ストレージを切り替え: 旧を削除 → 新ストレージへ作成（id は新しく付与される）
    const merged: SecuritiesAccount = { ...before, ...(patch as Partial<SecuritiesAccount>), visibility: nextVis }
    if (before.visibility === 'private') {
      if (!uid) return
      await deletePrivateSecuritiesAccount(uid, id)
    } else {
      await deleteSecuritiesAccount(householdId, id)
    }

    const { id: _drop, ...withoutId } = merged
    void _drop
    if (nextVis === 'private') {
      if (!uid) return
      const newId = await addPrivateSecuritiesAccount(uid, withoutId)
      setAccounts(prev => prev.map(a => a.id === id ? { ...merged, id: newId } : a))
    } else {
      const newId = await addSecuritiesAccount(householdId, withoutId)
      setAccounts(prev => prev.map(a => a.id === id ? { ...merged, id: newId } : a))
    }
  }

  async function deleteAccount(id: string) {
    if (!householdId) return
    const current = getVisibility(id)
    if (current === 'private') {
      if (!uid) return
      await deletePrivateSecuritiesAccount(uid, id)
    } else {
      await deleteSecuritiesAccount(householdId, id)
    }
    setAccounts(prev => prev.filter(a => a.id !== id))
  }

  async function recordMonthlyValue(id: string, yearMonth: string, value: number) {
    if (!householdId) return
    const acc = accounts.find(a => a.id === id)
    if (!acc || value < 0) return
    const monthlyValues = { ...acc.monthlyValues, [yearMonth]: value }
    const latestYm = Object.keys(monthlyValues).sort().pop()!
    const currentValue = monthlyValues[latestYm]!
    await updateAccountInPlace(id, { monthlyValues, currentValue })
  }

  async function deleteMonthlyValue(id: string, yearMonth: string) {
    if (!householdId) return
    const acc = accounts.find(a => a.id === id)
    if (!acc) return
    const monthlyValues = { ...acc.monthlyValues }
    delete monthlyValues[yearMonth]
    const latestYm = Object.keys(monthlyValues).sort().pop()
    const currentValue = latestYm ? (monthlyValues[latestYm] ?? 0) : 0

    // 商品側にも同月の monthlyValues があれば併せて削除
    const updatedHoldings = acc.holdings?.map(h => {
      if (!h.monthlyValues || h.monthlyValues[yearMonth] === undefined) return h
      const hMonthly = { ...h.monthlyValues }
      delete hMonthly[yearMonth]
      return { ...h, monthlyValues: hMonthly }
    })

    const patch: Partial<Omit<SecuritiesAccount, 'id'>> = { monthlyValues, currentValue }
    if (updatedHoldings) patch.holdings = updatedHoldings
    await updateAccountInPlace(id, patch)
  }

  // 保有商品ごとに月次評価額を一括記録する。
  // 各商品の monthlyValues[ym] を更新 → 口座の monthlyValues[ym] = 商品合計、
  // 口座の currentValue は最新月の値で更新する。
  async function recordHoldingsMonthlyValues(
    id: string,
    yearMonth: string,
    valuesById: Record<string, number>,
  ) {
    if (!householdId) return
    const acc = accounts.find(a => a.id === id)
    if (!acc || !acc.holdings) return

    const updatedHoldings = acc.holdings.map(h => {
      const v = valuesById[h.id]
      if (v === undefined) return h
      const hMonthly = { ...h.monthlyValues, [yearMonth]: v }
      return { ...h, monthlyValues: hMonthly }
    })

    // 口座の monthlyValues[ym] は商品の monthlyValues[ym] 合計（未入力商品は 0 として扱う）
    const monthSum = updatedHoldings.reduce((s, h) => s + (h.monthlyValues?.[yearMonth] ?? 0), 0)
    const accountMonthly = { ...acc.monthlyValues, [yearMonth]: monthSum }
    const latestYm = Object.keys(accountMonthly).sort().pop()!
    const accountCurrent = accountMonthly[latestYm]!

    await updateAccountInPlace(id, {
      holdings: updatedHoldings,
      monthlyValues: accountMonthly,
      currentValue: accountCurrent,
    })
  }

  async function saveHoldings(accountId: string, holdings: SecuritiesHolding[]) {
    if (!householdId) return
    // 商品は name/category/memo のみのラベル情報。
    // 評価額・評価損益は口座レベルが正で、商品変更とは独立。
    await updateAccountInPlace(accountId, { holdings })
  }

  async function reorderAccounts(next: SecuritiesAccount[]) {
    // 公開範囲はそのまま、order だけ振り直し
    const updates = next.map((acc, idx) => ({ ...acc, order: idx + 1 }))
    setAccounts(updates)
    await Promise.all(updates.map(acc => {
      if (acc.visibility === 'private') {
        if (!uid) return Promise.resolve()
        return updatePrivateSecuritiesAccount(uid, acc.id, { order: acc.order })
      }
      return updateSecuritiesAccount(householdId!, acc.id, { order: acc.order })
    }))
  }

  return {
    accounts,
    loading,
    addAccount,
    updateAccount,
    deleteAccount,
    recordMonthlyValue,
    deleteMonthlyValue,
    recordHoldingsMonthlyValues,
    reorderAccounts,
    saveHoldings,
  }
}

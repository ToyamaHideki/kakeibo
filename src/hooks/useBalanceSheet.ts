import { useCallback, useEffect, useState } from 'react'
import { fetchBalanceSheet, saveBalanceSheet } from '../firebase/balanceSheetFirestore'
import { fetchContracts } from '../firebase/contractFirestore'
import { fetchSecuritiesAccounts } from '../firebase/securitiesFirestore'
import { useHousehold } from './useHousehold'
import type { AssetItem, BalanceSheet, LiabilityItem } from '../types'

function emptySheet(year: number): BalanceSheet {
  return { year, assets: [], liabilities: [] }
}

export function useBalanceSheet(year: number) {
  const { householdId } = useHousehold()
  const [sheet, setSheet] = useState<BalanceSheet>(emptySheet(year))
  const [prevNetWorth, setPrevNetWorth] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!householdId) return
    setLoading(true)
    try {
      const [current, prev] = await Promise.all([
        fetchBalanceSheet(householdId, year),
        fetchBalanceSheet(householdId, year - 1),
      ])
      setSheet(current ?? emptySheet(year))
      if (prev) {
        const prevAssets = prev.assets.reduce((s, a) => s + a.amount, 0)
        const prevLiab = prev.liabilities.reduce((s, l) => s + l.amount, 0)
        setPrevNetWorth(prevAssets - prevLiab)
      } else {
        setPrevNetWorth(null)
      }
    } finally {
      setLoading(false)
    }
  }, [year, householdId])

  useEffect(() => { load() }, [load])

  const persist = useCallback(async (updated: BalanceSheet) => {
    if (!householdId) return
    setSheet(updated)
    await saveBalanceSheet(householdId, updated)
  }, [householdId])

  const addAsset = useCallback(async (item: Omit<AssetItem, 'id'>) => {
    const newItem: AssetItem = { ...item, id: crypto.randomUUID() }
    await persist({ ...sheet, assets: [...sheet.assets, newItem] })
  }, [sheet, persist])

  const updateAsset = useCallback(async (id: string, data: Partial<Omit<AssetItem, 'id'>>) => {
    await persist({ ...sheet, assets: sheet.assets.map(a => a.id === id ? { ...a, ...data } : a) })
  }, [sheet, persist])

  const deleteAsset = useCallback(async (id: string) => {
    await persist({ ...sheet, assets: sheet.assets.filter(a => a.id !== id) })
  }, [sheet, persist])

  const addLiability = useCallback(async (item: Omit<LiabilityItem, 'id'>) => {
    const newItem: LiabilityItem = { ...item, id: crypto.randomUUID() }
    await persist({ ...sheet, liabilities: [...sheet.liabilities, newItem] })
  }, [sheet, persist])

  const updateLiability = useCallback(async (id: string, data: Partial<Omit<LiabilityItem, 'id'>>) => {
    await persist({ ...sheet, liabilities: sheet.liabilities.map(l => l.id === id ? { ...l, ...data } : l) })
  }, [sheet, persist])

  const deleteLiability = useCallback(async (id: string) => {
    await persist({ ...sheet, liabilities: sheet.liabilities.filter(l => l.id !== id) })
  }, [sheet, persist])

  const syncLoans = useCallback(async () => {
    if (!householdId) return 0
    const contracts = await fetchContracts(householdId)
    const loans = contracts.filter(c => c.contractType === 'loan')
    const existingNames = new Set(sheet.liabilities.map(l => l.name))
    const added: LiabilityItem[] = []
    for (const loan of loans) {
      if (!existingNames.has(loan.name)) {
        added.push({
          id: crypto.randomUUID(),
          section: 'long',
          name: loan.name,
          amount: 0,
          order: sheet.liabilities.filter(l => l.section === 'long').length + added.length,
          note: `月額${loan.amount.toLocaleString()}円`,
        })
      }
    }
    if (added.length > 0) {
      await persist({ ...sheet, liabilities: [...sheet.liabilities, ...added] })
    }
    return added.length
  }, [sheet, persist, householdId])

  const syncSecuritiesAccounts = useCallback(async () => {
    if (!householdId) return 0
    const accounts = await fetchSecuritiesAccounts(householdId)
    const existingNames = new Set(sheet.assets.filter(a => a.section === 'financial').map(a => a.name))
    const added: AssetItem[] = []
    for (const acc of accounts) {
      if (!existingNames.has(acc.name)) {
        added.push({
          id: crypto.randomUUID(),
          section: 'financial',
          name: acc.name,
          amount: acc.currentValue,
          order: sheet.assets.filter(a => a.section === 'financial').length + added.length,
          note: acc.broker,
        })
      }
    }
    if (added.length > 0) {
      await persist({ ...sheet, assets: [...sheet.assets, ...added] })
    }
    return added.length
  }, [sheet, persist, householdId])

  const totalAssets = sheet.assets.reduce((s, a) => s + a.amount, 0)
  const totalLiabilities = sheet.liabilities.reduce((s, l) => s + l.amount, 0)
  const netWorth = totalAssets - totalLiabilities

  return {
    sheet, loading,
    totalAssets, totalLiabilities, netWorth, prevNetWorth,
    addAsset, updateAsset, deleteAsset,
    addLiability, updateLiability, deleteLiability,
    syncLoans, syncSecuritiesAccounts,
  }
}

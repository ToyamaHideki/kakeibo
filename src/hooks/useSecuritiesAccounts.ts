import {
  fetchSecuritiesAccounts,
  addSecuritiesAccount,
  updateSecuritiesAccount,
  deleteSecuritiesAccount,
} from '../firebase/securitiesFirestore'
import type { SecuritiesAccount } from '../types'
import { useFirestoreCollection } from './useFirestoreCollection'
import { nextOrder } from '../utils/order'

const ops = {
  fetch: fetchSecuritiesAccounts,
  add: addSecuritiesAccount,
  update: updateSecuritiesAccount,
  remove: deleteSecuritiesAccount,
}

export function useSecuritiesAccounts() {
  const { items: accounts, setItems: setAccounts, loading, householdId, add, update, remove, reorderItems } = useFirestoreCollection<SecuritiesAccount>(ops)

  async function addAccount(account: Omit<SecuritiesAccount, 'id' | 'order'>) {
    await add({ ...account, order: nextOrder(accounts) })
  }

  async function recordMonthlyValue(id: string, yearMonth: string, value: number) {
    if (!householdId) return
    const acc = accounts.find(a => a.id === id)
    if (!acc || value < 0) return
    const monthlyValues = { ...acc.monthlyValues, [yearMonth]: value }
    const latestYm = Object.keys(monthlyValues).sort().pop()!
    const currentValue = monthlyValues[latestYm]
    await updateSecuritiesAccount(householdId, id, { monthlyValues, currentValue })
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, monthlyValues, currentValue } : a))
  }

  async function deleteMonthlyValue(id: string, yearMonth: string) {
    if (!householdId) return
    const acc = accounts.find(a => a.id === id)
    if (!acc) return
    const monthlyValues = { ...acc.monthlyValues }
    delete monthlyValues[yearMonth]
    const latestYm = Object.keys(monthlyValues).sort().pop()
    const currentValue = latestYm ? monthlyValues[latestYm] : 0
    await updateSecuritiesAccount(householdId, id, { monthlyValues, currentValue })
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, monthlyValues, currentValue } : a))
  }

  return { accounts, loading, addAccount, updateAccount: update, deleteAccount: remove, recordMonthlyValue, deleteMonthlyValue, reorderAccounts: reorderItems }
}

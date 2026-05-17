import {
  fetchSavingsAccounts,
  addSavingsAccount,
  updateSavingsAccount,
  deleteSavingsAccount,
} from '../firebase/savingsAccountFirestore'
import type { SavingsAccount } from '../types'
import { useFirestoreCollection } from './useFirestoreCollection'

const ops = {
  fetch: fetchSavingsAccounts,
  add: addSavingsAccount,
  update: updateSavingsAccount,
  remove: deleteSavingsAccount,
}

export function useSavingsAccounts() {
  const { items: accounts, loading, add, update, remove } = useFirestoreCollection<SavingsAccount>(ops)
  return { accounts, loading, addAccount: add, updateAccount: update, deleteAccount: remove }
}

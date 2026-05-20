import {
  fetchContracts,
  addContract as addFn,
  updateContract as updateFn,
  deleteContract as deleteFn,
} from '../firebase/contractFirestore'
import type { Contract } from '../types'
import { nextOrder } from '../utils/order'
import { useFirestoreCollection } from './useFirestoreCollection'

const ops = { fetch: fetchContracts, add: addFn, update: updateFn, remove: deleteFn }

export function useContracts() {
  const { items: contracts, loading, add, update, remove, reorderItems } = useFirestoreCollection<Contract>(ops)

  async function addContract(contract: Omit<Contract, 'id' | 'order'>) {
    await add({ ...contract, order: nextOrder(contracts) })
  }

  return { contracts, loading, addContract, updateContract: update, deleteContract: remove, reorderContracts: reorderItems }
}

import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import {
  GUEST_HOUSEHOLD_ID,
  guestGetCollection,
  guestAddCollectionItem,
  guestUpdateCollectionItem,
  guestRemoveCollectionItem,
} from './guestStore'

export function createHouseholdCrud<T extends { id: string }>(subPath: string) {
  return {
    fetch: async (householdId: string): Promise<T[]> => {
      if (householdId === GUEST_HOUSEHOLD_ID) return guestGetCollection<T>(subPath)
      const snap = await getDocs(collection(db, 'households', householdId, subPath))
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as T)
    },

    add: async (householdId: string, data: Omit<T, 'id'>): Promise<string> => {
      if (householdId === GUEST_HOUSEHOLD_ID) return guestAddCollectionItem<T>(subPath, data)
      const ref = await addDoc(collection(db, 'households', householdId, subPath), data)
      return ref.id
    },

    update: async (householdId: string, id: string, data: Partial<Omit<T, 'id'>>): Promise<void> => {
      if (householdId === GUEST_HOUSEHOLD_ID) { guestUpdateCollectionItem(subPath, id, data as Record<string, unknown>); return }
      await updateDoc(doc(db, 'households', householdId, subPath, id), data)
    },

    remove: async (householdId: string, id: string): Promise<void> => {
      if (householdId === GUEST_HOUSEHOLD_ID) { guestRemoveCollectionItem(subPath, id); return }
      await deleteDoc(doc(db, 'households', householdId, subPath, id))
    },
  }
}

import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from './firebase'

export function createHouseholdCrud<T extends { id: string }>(subPath: string) {
  return {
    fetch: async (householdId: string): Promise<T[]> => {
      const snap = await getDocs(collection(db, 'households', householdId, subPath))
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as T)
    },

    add: async (householdId: string, data: Omit<T, 'id'>): Promise<string> => {
      const ref = await addDoc(collection(db, 'households', householdId, subPath), data)
      return ref.id
    },

    update: async (householdId: string, id: string, data: Partial<Omit<T, 'id'>>): Promise<void> => {
      await updateDoc(doc(db, 'households', householdId, subPath, id), data)
    },

    remove: async (householdId: string, id: string): Promise<void> => {
      await deleteDoc(doc(db, 'households', householdId, subPath, id))
    },
  }
}

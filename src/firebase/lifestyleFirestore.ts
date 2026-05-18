import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import type { HouseholdTask, ShoppingItem } from '../types'
import {
  GUEST_HOUSEHOLD_ID,
  guestGetShoppingItems, guestAddShoppingItem, guestUpdateShoppingItem,
  guestDeleteShoppingItem, guestDeleteCheckedShoppingItems,
  guestGetHouseholdTasks, guestAddHouseholdTask, guestUpdateHouseholdTask, guestDeleteHouseholdTask,
} from './guestStore'

// ─── Shopping Items ───────────────────────────────────────────────────────────

export async function fetchShoppingItems(householdId: string): Promise<ShoppingItem[]> {
  if (householdId === GUEST_HOUSEHOLD_ID) return guestGetShoppingItems()
  const snapshot = await getDocs(collection(db, 'households', householdId, 'shoppingItems'))
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as ShoppingItem)
}

export async function addShoppingItem(householdId: string, item: Omit<ShoppingItem, 'id'>): Promise<string> {
  if (householdId === GUEST_HOUSEHOLD_ID) return guestAddShoppingItem(item)
  const ref = await addDoc(collection(db, 'households', householdId, 'shoppingItems'), item)
  return ref.id
}

export async function updateShoppingItem(householdId: string, id: string, data: Partial<Omit<ShoppingItem, 'id'>>): Promise<void> {
  if (householdId === GUEST_HOUSEHOLD_ID) { guestUpdateShoppingItem(id, data); return }
  await updateDoc(doc(db, 'households', householdId, 'shoppingItems', id), data)
}

export async function deleteShoppingItem(householdId: string, id: string): Promise<void> {
  if (householdId === GUEST_HOUSEHOLD_ID) { guestDeleteShoppingItem(id); return }
  await deleteDoc(doc(db, 'households', householdId, 'shoppingItems', id))
}

export async function deleteCheckedShoppingItems(householdId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  if (householdId === GUEST_HOUSEHOLD_ID) { guestDeleteCheckedShoppingItems(ids); return }
  const batch = writeBatch(db)
  ids.forEach(id => batch.delete(doc(db, 'households', householdId, 'shoppingItems', id)))
  await batch.commit()
}

// ─── Household Tasks ──────────────────────────────────────────────────────────

export async function fetchHouseholdTasks(householdId: string): Promise<HouseholdTask[]> {
  if (householdId === GUEST_HOUSEHOLD_ID) return guestGetHouseholdTasks()
  const snapshot = await getDocs(collection(db, 'households', householdId, 'householdTasks'))
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as HouseholdTask)
}

export async function addHouseholdTask(householdId: string, task: Omit<HouseholdTask, 'id'>): Promise<string> {
  if (householdId === GUEST_HOUSEHOLD_ID) return guestAddHouseholdTask(task)
  const ref = await addDoc(collection(db, 'households', householdId, 'householdTasks'), task)
  return ref.id
}

export async function updateHouseholdTask(householdId: string, id: string, data: Partial<Omit<HouseholdTask, 'id'>>): Promise<void> {
  if (householdId === GUEST_HOUSEHOLD_ID) { guestUpdateHouseholdTask(id, data); return }
  await updateDoc(doc(db, 'households', householdId, 'householdTasks', id), data)
}

export async function deleteHouseholdTask(householdId: string, id: string): Promise<void> {
  if (householdId === GUEST_HOUSEHOLD_ID) { guestDeleteHouseholdTask(id); return }
  await deleteDoc(doc(db, 'households', householdId, 'householdTasks', id))
}

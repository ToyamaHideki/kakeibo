import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { BalanceSheet } from '../types'
import { GUEST_HOUSEHOLD_ID, guestGetBalanceSheet, guestSaveBalanceSheet } from './guestStore'

export async function fetchBalanceSheet(householdId: string, year: number): Promise<BalanceSheet | null> {
  if (householdId === GUEST_HOUSEHOLD_ID) return guestGetBalanceSheet()
  const snap = await getDoc(doc(db, 'households', householdId, 'balanceSheets', String(year)))
  if (!snap.exists()) return null
  return snap.data() as BalanceSheet
}

export async function saveBalanceSheet(householdId: string, data: BalanceSheet): Promise<void> {
  if (householdId === GUEST_HOUSEHOLD_ID) { guestSaveBalanceSheet(data); return }
  await setDoc(doc(db, 'households', householdId, 'balanceSheets', String(data.year)), data)
}

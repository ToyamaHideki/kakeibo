import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { BalanceSheet } from '../types'

export async function fetchBalanceSheet(householdId: string, year: number): Promise<BalanceSheet | null> {
  const snap = await getDoc(doc(db, 'households', householdId, 'balanceSheets', String(year)))
  if (!snap.exists()) return null
  return snap.data() as BalanceSheet
}

export async function saveBalanceSheet(householdId: string, data: BalanceSheet): Promise<void> {
  await setDoc(doc(db, 'households', householdId, 'balanceSheets', String(data.year)), data)
}

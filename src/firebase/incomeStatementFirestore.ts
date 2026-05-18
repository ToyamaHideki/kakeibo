import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { IncomeStatement } from '../types'
import { GUEST_HOUSEHOLD_ID, guestGetIncomeStatement, guestSaveIncomeStatement } from './guestStore'

export async function fetchIncomeStatement(householdId: string, year: number): Promise<IncomeStatement | null> {
  if (householdId === GUEST_HOUSEHOLD_ID) return guestGetIncomeStatement()
  const snap = await getDoc(doc(db, 'households', householdId, 'incomeStatements', String(year)))
  if (!snap.exists()) return null
  return snap.data() as IncomeStatement
}

export async function saveIncomeStatement(householdId: string, data: IncomeStatement): Promise<void> {
  if (householdId === GUEST_HOUSEHOLD_ID) { guestSaveIncomeStatement(data); return }
  await setDoc(doc(db, 'households', householdId, 'incomeStatements', String(data.year)), data)
}

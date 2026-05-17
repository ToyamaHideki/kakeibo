import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { IncomeStatement } from '../types'

export async function fetchIncomeStatement(householdId: string, year: number): Promise<IncomeStatement | null> {
  const snap = await getDoc(doc(db, 'households', householdId, 'incomeStatements', String(year)))
  if (!snap.exists()) return null
  return snap.data() as IncomeStatement
}

export async function saveIncomeStatement(householdId: string, data: IncomeStatement): Promise<void> {
  await setDoc(doc(db, 'households', householdId, 'incomeStatements', String(data.year)), data)
}

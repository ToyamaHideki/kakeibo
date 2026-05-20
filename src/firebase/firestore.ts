import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import type { Category, CfPlan, FixedCost, MonthDocument, PaymentMethod, Transaction } from '../types'
import { db } from './firebase'
import {
  GUEST_HOUSEHOLD_ID,
  guestGetCategories, guestAddCategory, guestUpdateCategory, guestDeleteCategory,
  guestGetPaymentMethods, guestAddPaymentMethod, guestDeletePaymentMethod,
  guestGetMonthData, guestSaveTransaction, guestUpdateTransaction, guestDeleteTransaction, guestMoveTransaction,
  guestGetCfPlan, guestSaveCfPlan, guestAppendCfLifeEvent,
  guestGetFixedCosts, guestAddFixedCost, guestUpdateFixedCost, guestDeleteFixedCost,
  guestGetBudget, guestUpdateBudget,
} from './guestStore'

// ─── Categories ───────────────────────────────────────────────────────────────

export async function fetchCategories(householdId: string): Promise<Category[]> {
  if (householdId === GUEST_HOUSEHOLD_ID) return guestGetCategories()
  const snapshot = await getDocs(collection(db, 'households', householdId, 'categories'))
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Category)
}

export async function addCategory(householdId: string, category: Omit<Category, 'id'>): Promise<string> {
  if (householdId === GUEST_HOUSEHOLD_ID) return guestAddCategory(category)
  const ref = await addDoc(collection(db, 'households', householdId, 'categories'), category)
  return ref.id
}

export async function updateCategory(householdId: string, id: string, data: Partial<Omit<Category, 'id'>>): Promise<void> {
  if (householdId === GUEST_HOUSEHOLD_ID) { guestUpdateCategory(id, data); return }
  await updateDoc(doc(db, 'households', householdId, 'categories', id), data)
}

export async function deleteCategory(householdId: string, id: string): Promise<void> {
  if (householdId === GUEST_HOUSEHOLD_ID) { guestDeleteCategory(id); return }
  await deleteDoc(doc(db, 'households', householdId, 'categories', id))
}

// ─── PaymentMethods ───────────────────────────────────────────────────────────

export async function fetchPaymentMethods(householdId: string): Promise<PaymentMethod[]> {
  if (householdId === GUEST_HOUSEHOLD_ID) return guestGetPaymentMethods()
  const snapshot = await getDocs(collection(db, 'households', householdId, 'paymentMethods'))
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as PaymentMethod)
}

export async function addPaymentMethod(householdId: string, paymentMethod: Omit<PaymentMethod, 'id'>): Promise<string> {
  if (householdId === GUEST_HOUSEHOLD_ID) return guestAddPaymentMethod(paymentMethod)
  const ref = await addDoc(collection(db, 'households', householdId, 'paymentMethods'), paymentMethod)
  return ref.id
}

export async function deletePaymentMethod(householdId: string, id: string): Promise<void> {
  if (householdId === GUEST_HOUSEHOLD_ID) { guestDeletePaymentMethod(id); return }
  await deleteDoc(doc(db, 'households', householdId, 'paymentMethods', id))
}

// ─── Monthly transactions ──────────────────────────────────────────────────────

export async function fetchMonthData(householdId: string, yearMonth: string): Promise<MonthDocument | null> {
  if (householdId === GUEST_HOUSEHOLD_ID) return guestGetMonthData(yearMonth)
  const snap = await getDoc(doc(db, 'households', householdId, 'months', yearMonth))
  if (!snap.exists()) return null
  return snap.data() as MonthDocument
}

export async function saveTransaction(householdId: string, yearMonth: string, transaction: Transaction): Promise<void> {
  if (householdId === GUEST_HOUSEHOLD_ID) { guestSaveTransaction(yearMonth, transaction); return }
  const [year, month] = yearMonth.split('-').map(Number)
  const ref = doc(db, 'households', householdId, 'months', yearMonth)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    await setDoc(ref, { year, month, transactions: [transaction] })
  } else {
    const data = snap.data() as MonthDocument
    await updateDoc(ref, { transactions: [...data.transactions, transaction] })
  }
}

export async function updateTransaction(householdId: string, yearMonth: string, transaction: Transaction): Promise<void> {
  if (householdId === GUEST_HOUSEHOLD_ID) { guestUpdateTransaction(yearMonth, transaction); return }
  const ref = doc(db, 'households', householdId, 'months', yearMonth)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const data = snap.data() as MonthDocument
  await updateDoc(ref, {
    transactions: data.transactions.map(t => (t.id === transaction.id ? transaction : t)),
  })
}

export async function deleteTransaction(householdId: string, yearMonth: string, transactionId: string): Promise<void> {
  if (householdId === GUEST_HOUSEHOLD_ID) { guestDeleteTransaction(yearMonth, transactionId); return }
  const ref = doc(db, 'households', householdId, 'months', yearMonth)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const data = snap.data() as MonthDocument
  await updateDoc(ref, {
    transactions: data.transactions.filter(t => t.id !== transactionId),
  })
}

export async function moveTransaction(
  householdId: string,
  fromYearMonth: string,
  toYearMonth: string,
  transaction: Transaction,
): Promise<void> {
  if (householdId === GUEST_HOUSEHOLD_ID) { guestMoveTransaction(fromYearMonth, toYearMonth, transaction); return }
  await deleteTransaction(householdId, fromYearMonth, transaction.id)
  await saveTransaction(householdId, toYearMonth, transaction)
}

// ─── CF Plan ──────────────────────────────────────────────────────────────────

export async function fetchCfPlan(householdId: string): Promise<CfPlan | null> {
  if (householdId === GUEST_HOUSEHOLD_ID) return guestGetCfPlan()
  const snap = await getDoc(doc(db, 'households', householdId, 'cfPlan', 'main'))
  if (!snap.exists()) return null
  return snap.data() as CfPlan
}

export async function saveCfPlan(householdId: string, plan: CfPlan): Promise<void> {
  if (householdId === GUEST_HOUSEHOLD_ID) { guestSaveCfPlan(plan); return }
  await setDoc(doc(db, 'households', householdId, 'cfPlan', 'main'), plan)
}

// ─── Fixed Costs ──────────────────────────────────────────────────────────────

export async function fetchFixedCosts(householdId: string): Promise<FixedCost[]> {
  if (householdId === GUEST_HOUSEHOLD_ID) return guestGetFixedCosts()
  const snapshot = await getDocs(collection(db, 'households', householdId, 'fixedCosts'))
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as FixedCost)
}

export async function addFixedCost(householdId: string, cost: Omit<FixedCost, 'id'>): Promise<string> {
  if (householdId === GUEST_HOUSEHOLD_ID) return guestAddFixedCost(cost)
  const ref = await addDoc(collection(db, 'households', householdId, 'fixedCosts'), cost)
  return ref.id
}

export async function updateFixedCost(householdId: string, id: string, data: Partial<Omit<FixedCost, 'id'>>): Promise<void> {
  if (householdId === GUEST_HOUSEHOLD_ID) { guestUpdateFixedCost(id, data); return }
  await updateDoc(doc(db, 'households', householdId, 'fixedCosts', id), data)
}

export async function deleteFixedCost(householdId: string, id: string): Promise<void> {
  if (householdId === GUEST_HOUSEHOLD_ID) { guestDeleteFixedCost(id); return }
  await deleteDoc(doc(db, 'households', householdId, 'fixedCosts', id))
}

// ─── CF Life Events ───────────────────────────────────────────────────────────

export async function appendCfLifeEvent(householdId: string, year: number, text: string): Promise<void> {
  if (householdId === GUEST_HOUSEHOLD_ID) { guestAppendCfLifeEvent(year, text); return }
  const snap = await getDoc(doc(db, 'households', householdId, 'cfPlan', 'main'))
  if (!snap.exists()) return
  const plan = snap.data() as CfPlan
  const lifeEvents = { ...(plan.lifeEvents ?? {}) }
  const key = String(year)
  lifeEvents[key] = lifeEvents[key] ? `${lifeEvents[key]} / ${text}` : text
  await updateDoc(doc(db, 'households', householdId, 'cfPlan', 'main'), { lifeEvents })
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export async function fetchBudget(householdId: string, yearMonth: string): Promise<Record<string, number>> {
  if (householdId === GUEST_HOUSEHOLD_ID) return guestGetBudget(yearMonth)
  const snap = await getDoc(doc(db, 'households', householdId, 'budgets', yearMonth))
  if (!snap.exists()) return {}
  return snap.data() as Record<string, number>
}

export async function updateBudgetAmount(householdId: string, yearMonth: string, categoryId: string, amount: number): Promise<void> {
  if (householdId === GUEST_HOUSEHOLD_ID) { guestUpdateBudget(yearMonth, categoryId, amount); return }
  await setDoc(doc(db, 'households', householdId, 'budgets', yearMonth), { [categoryId]: amount }, { merge: true })
}

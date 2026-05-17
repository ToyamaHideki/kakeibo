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
import { db } from './firebase'
import type { Category, MonthDocument, PaymentMethod, Transaction } from '../types'

// ─── Categories ───────────────────────────────────────────────────────────────

export async function fetchPersonalCategories(uid: string): Promise<Category[]> {
  const snapshot = await getDocs(collection(db, 'users', uid, 'categories'))
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Category)
}

export async function addPersonalCategory(uid: string, category: Omit<Category, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'users', uid, 'categories'), category)
  return ref.id
}

export async function updatePersonalCategory(uid: string, id: string, data: Partial<Omit<Category, 'id'>>): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'categories', id), data)
}

// ─── PaymentMethods ───────────────────────────────────────────────────────────

export async function fetchPersonalPaymentMethods(uid: string): Promise<PaymentMethod[]> {
  const snapshot = await getDocs(collection(db, 'users', uid, 'paymentMethods'))
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as PaymentMethod)
}

export async function addPersonalPaymentMethod(uid: string, paymentMethod: Omit<PaymentMethod, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'users', uid, 'paymentMethods'), paymentMethod)
  return ref.id
}

export async function deletePersonalCategory(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'categories', id))
}

export async function deletePersonalPaymentMethod(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'paymentMethods', id))
}

// ─── Monthly transactions ─────────────────────────────────────────────────────

export async function fetchPersonalMonthData(uid: string, yearMonth: string): Promise<MonthDocument | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'months', yearMonth))
  if (!snap.exists()) return null
  return snap.data() as MonthDocument
}

export async function savePersonalTransaction(uid: string, yearMonth: string, transaction: Transaction): Promise<void> {
  const [year, month] = yearMonth.split('-').map(Number)
  const ref = doc(db, 'users', uid, 'months', yearMonth)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    await setDoc(ref, { year, month, transactions: [transaction] })
  } else {
    const data = snap.data() as MonthDocument
    await updateDoc(ref, { transactions: [...data.transactions, transaction] })
  }
}

export async function updatePersonalTransaction(uid: string, yearMonth: string, transaction: Transaction): Promise<void> {
  const ref = doc(db, 'users', uid, 'months', yearMonth)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const data = snap.data() as MonthDocument
  await updateDoc(ref, {
    transactions: data.transactions.map(t => (t.id === transaction.id ? transaction : t)),
  })
}

export async function deletePersonalTransaction(uid: string, yearMonth: string, transactionId: string): Promise<void> {
  const ref = doc(db, 'users', uid, 'months', yearMonth)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const data = snap.data() as MonthDocument
  await updateDoc(ref, {
    transactions: data.transactions.filter(t => t.id !== transactionId),
  })
}

export async function movePersonalTransaction(uid: string, fromYearMonth: string, toYearMonth: string, transaction: Transaction): Promise<void> {
  await deletePersonalTransaction(uid, fromYearMonth, transaction.id)
  await savePersonalTransaction(uid, toYearMonth, transaction)
}

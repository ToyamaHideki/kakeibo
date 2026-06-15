import { addDoc, collection, deleteDoc, doc, documentId, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore'
import type { HealthDailyRecord, HealthMetric } from '../types'
import { db } from './firebase'
import {
  GUEST_HOUSEHOLD_ID,
  guestGetCollection,
  guestAddCollectionItem,
  guestUpdateCollectionItem,
  guestRemoveCollectionItem,
  guestSetCollectionItem,
} from './guestStore'

// 本人のみ表示の健康データは users/{uid}/privateHealthMetrics と
// users/{uid}/privateHealthDailyRecords に保存（世帯共有とは完全分離）。
//
// ゲストモードでは uid が無いため、guestStore の collections に
// 'privateHealthMetrics' / 'privateHealthDailyRecords' キーで保存する。

function isGuest(uid: string): boolean {
  return uid === GUEST_HOUSEHOLD_ID
}

// ─── 測定項目（本人のみ） ────────────────────────────────────────────────────

const METRICS_PATH = 'privateHealthMetrics'

export async function fetchPrivateHealthMetrics(uid: string): Promise<HealthMetric[]> {
  if (isGuest(uid)) return guestGetCollection<HealthMetric>(METRICS_PATH).map(m => ({ ...m }))
  const snap = await getDocs(collection(db, 'users', uid, METRICS_PATH))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as HealthMetric)
}

export async function addPrivateHealthMetric(
  uid: string,
  data: Omit<HealthMetric, 'id'>,
): Promise<string> {
  if (isGuest(uid)) return guestAddCollectionItem<HealthMetric>(METRICS_PATH, data)
  const ref = await addDoc(collection(db, 'users', uid, METRICS_PATH), data)
  return ref.id
}

export async function updatePrivateHealthMetric(
  uid: string,
  id: string,
  data: Partial<Omit<HealthMetric, 'id'>>,
): Promise<void> {
  if (isGuest(uid)) {
    guestUpdateCollectionItem(METRICS_PATH, id, data as Record<string, unknown>)
    return
  }
  await updateDoc(doc(db, 'users', uid, METRICS_PATH, id), data)
}

export async function deletePrivateHealthMetric(uid: string, id: string): Promise<void> {
  if (isGuest(uid)) {
    guestRemoveCollectionItem(METRICS_PATH, id)
    return
  }
  await deleteDoc(doc(db, 'users', uid, METRICS_PATH, id))
}

// ─── 日次レコード（本人のみ） ────────────────────────────────────────────────

const RECORDS_PATH = 'privateHealthDailyRecords'

export async function fetchPrivateHealthDailyRecords(
  uid: string,
  range?: { from: string; to: string } | undefined,
): Promise<HealthDailyRecord[]> {
  if (isGuest(uid)) {
    const all = guestGetCollection<HealthDailyRecord>(RECORDS_PATH).map(r => ({ ...r }))
    if (!range) return all
    return all.filter(r => r.date >= range.from && r.date <= range.to)
  }
  const coll = collection(db, 'users', uid, RECORDS_PATH)
  if (range) {
    const q = query(coll, where(documentId(), '>=', range.from), where(documentId(), '<=', range.to))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as HealthDailyRecord)
  }
  const snap = await getDocs(coll)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as HealthDailyRecord)
}

export async function upsertPrivateHealthDailyRecord(
  uid: string,
  date: string,
  valuesPatch: Record<string, number>,
  memo?: string | undefined,
): Promise<HealthDailyRecord> {
  if (isGuest(uid)) {
    const existing = guestGetCollection<HealthDailyRecord>(RECORDS_PATH).find(r => r.id === date)
    const merged: HealthDailyRecord = {
      id: date,
      date,
      valuesByMetricId: { ...(existing?.valuesByMetricId ?? {}), ...valuesPatch },
      visibility: 'private',
      ...(memo !== undefined ? { memo } : existing?.memo !== undefined ? { memo: existing.memo } : {}),
    }
    guestSetCollectionItem<HealthDailyRecord>(RECORDS_PATH, merged)
    return merged
  }

  const ref = doc(db, 'users', uid, RECORDS_PATH, date)
  const snap = await getDoc(ref)
  const existing = snap.exists() ? (snap.data() as Omit<HealthDailyRecord, 'id'>) : undefined
  const merged: HealthDailyRecord = {
    id: date,
    date,
    valuesByMetricId: { ...(existing?.valuesByMetricId ?? {}), ...valuesPatch },
    visibility: 'private',
    ...(memo !== undefined ? { memo } : existing?.memo !== undefined ? { memo: existing.memo } : {}),
  }
  const { id: _drop, ...withoutId } = merged
  void _drop
  await setDoc(ref, withoutId)
  return merged
}

export async function deletePrivateHealthDailyRecord(uid: string, date: string): Promise<void> {
  if (isGuest(uid)) {
    guestRemoveCollectionItem(RECORDS_PATH, date)
    return
  }
  await deleteDoc(doc(db, 'users', uid, RECORDS_PATH, date))
}

export async function removePrivateMetricValueFromRecord(
  uid: string,
  date: string,
  metricId: string,
): Promise<void> {
  if (isGuest(uid)) {
    const existing = guestGetCollection<HealthDailyRecord>(RECORDS_PATH).find(r => r.id === date)
    if (!existing) return
    const nextValues = { ...existing.valuesByMetricId }
    delete nextValues[metricId]
    if (Object.keys(nextValues).length === 0) {
      guestRemoveCollectionItem(RECORDS_PATH, date)
      return
    }
    guestSetCollectionItem<HealthDailyRecord>(RECORDS_PATH, { ...existing, valuesByMetricId: nextValues })
    return
  }

  const ref = doc(db, 'users', uid, RECORDS_PATH, date)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const data = snap.data() as Omit<HealthDailyRecord, 'id'>
  const nextValues = { ...data.valuesByMetricId }
  delete nextValues[metricId]
  if (Object.keys(nextValues).length === 0) {
    await deleteDoc(ref)
    return
  }
  await setDoc(ref, { ...data, valuesByMetricId: nextValues })
}

export async function purgePrivateMetricFromAllRecords(uid: string, metricId: string): Promise<void> {
  const records = await fetchPrivateHealthDailyRecords(uid)
  for (const r of records) {
    if (r.valuesByMetricId[metricId] === undefined) continue
    await removePrivateMetricValueFromRecord(uid, r.date, metricId)
  }
}

// ─── 統合フェッチ ────────────────────────────────────────────────────────────

export async function fetchAllHealthMetricsForUser(
  householdId: string,
  uid: string | null,
): Promise<HealthMetric[]> {
  const { fetchHealthMetrics } = await import('./healthFirestore')
  const sharedPromise = fetchHealthMetrics(householdId)
  const privateUid = householdId === GUEST_HOUSEHOLD_ID ? GUEST_HOUSEHOLD_ID : uid
  const privatePromise = privateUid ? fetchPrivateHealthMetrics(privateUid) : Promise.resolve([])
  const [shared, priv] = await Promise.all([sharedPromise, privatePromise])
  return [
    ...shared.map(m => ({ ...m, visibility: 'shared' as const })),
    ...priv.map(m => ({ ...m, visibility: 'private' as const })),
  ]
}

export async function fetchAllHealthDailyRecordsForUser(
  householdId: string,
  uid: string | null,
): Promise<HealthDailyRecord[]> {
  const { fetchHealthDailyRecords } = await import('./healthFirestore')
  const sharedPromise = fetchHealthDailyRecords(householdId)
  const privateUid = householdId === GUEST_HOUSEHOLD_ID ? GUEST_HOUSEHOLD_ID : uid
  const privatePromise = privateUid ? fetchPrivateHealthDailyRecords(privateUid) : Promise.resolve([])
  const [shared, priv] = await Promise.all([sharedPromise, privatePromise])
  return [
    ...shared.map(r => ({ ...r, visibility: 'shared' as const })),
    ...priv.map(r => ({ ...r, visibility: 'private' as const })),
  ]
}

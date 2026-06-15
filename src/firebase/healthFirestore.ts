import { collection, deleteDoc, doc, documentId, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'
import type { HealthDailyRecord, HealthMetric } from '../types'
import { db } from './firebase'
import { createHouseholdCrud } from './crud'
import {
  GUEST_HOUSEHOLD_ID,
  guestGetCollection,
  guestRemoveCollectionItem,
  guestSetCollectionItem,
} from './guestStore'

// ─── 測定項目（世帯共有） ────────────────────────────────────────────────────
// 保存先: households/{hid}/healthMetrics/{metricId}

const metricsOps = createHouseholdCrud<HealthMetric>('healthMetrics')
export const fetchHealthMetrics = metricsOps.fetch
export const addHealthMetric = metricsOps.add
export const updateHealthMetric = metricsOps.update
export const deleteHealthMetric = metricsOps.remove

// ─── 日次レコード（世帯共有） ────────────────────────────────────────────────
// 保存先: households/{hid}/healthDailyRecords/{yyyy-MM-dd}
// doc id を日付にすることで、複数項目の値を 1 ドキュメントにまとめる。

const RECORDS_PATH = 'healthDailyRecords'

// range を指定すると documentId 範囲クエリで Firestore 読み取り量を絞る。
// 未指定なら全件取得（visibility 移行・項目削除など全範囲を必要とする操作向け）。
export async function fetchHealthDailyRecords(
  householdId: string,
  range?: { from: string; to: string } | undefined,
): Promise<HealthDailyRecord[]> {
  if (householdId === GUEST_HOUSEHOLD_ID) {
    const all = guestGetCollection<HealthDailyRecord>(RECORDS_PATH).map(r => ({ ...r }))
    if (!range) return all
    return all.filter(r => r.date >= range.from && r.date <= range.to)
  }
  const coll = collection(db, 'households', householdId, RECORDS_PATH)
  if (range) {
    const q = query(coll, where(documentId(), '>=', range.from), where(documentId(), '<=', range.to))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as HealthDailyRecord)
  }
  const snap = await getDocs(coll)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as HealthDailyRecord)
}

/** 指定日のレコードに valuesPatch をマージ。既存値は保持される。 */
export async function upsertHealthDailyRecord(
  householdId: string,
  date: string,
  valuesPatch: Record<string, number>,
  memo?: string | undefined,
): Promise<HealthDailyRecord> {
  if (householdId === GUEST_HOUSEHOLD_ID) {
    const existing = guestGetCollection<HealthDailyRecord>(RECORDS_PATH).find(r => r.id === date)
    const merged: HealthDailyRecord = {
      id: date,
      date,
      valuesByMetricId: { ...(existing?.valuesByMetricId ?? {}), ...valuesPatch },
      visibility: 'shared',
      ...(memo !== undefined ? { memo } : existing?.memo !== undefined ? { memo: existing.memo } : {}),
    }
    guestSetCollectionItem<HealthDailyRecord>(RECORDS_PATH, merged)
    return merged
  }

  const ref = doc(db, 'households', householdId, RECORDS_PATH, date)
  const snap = await getDoc(ref)
  const existing = snap.exists() ? (snap.data() as Omit<HealthDailyRecord, 'id'>) : undefined
  const merged: HealthDailyRecord = {
    id: date,
    date,
    valuesByMetricId: { ...(existing?.valuesByMetricId ?? {}), ...valuesPatch },
    visibility: 'shared',
    ...(memo !== undefined ? { memo } : existing?.memo !== undefined ? { memo: existing.memo } : {}),
  }
  const { id: _drop, ...withoutId } = merged
  void _drop
  await setDoc(ref, withoutId)
  return merged
}

/** 指定日のレコードを丸ごと削除。 */
export async function deleteHealthDailyRecord(householdId: string, date: string): Promise<void> {
  if (householdId === GUEST_HOUSEHOLD_ID) {
    guestRemoveCollectionItem(RECORDS_PATH, date)
    return
  }
  await deleteDoc(doc(db, 'households', householdId, RECORDS_PATH, date))
}

/** 指定日のレコードから 1 つの metric の値だけ削除。レコードが空になれば doc ごと削除。 */
export async function removeMetricValueFromRecord(
  householdId: string,
  date: string,
  metricId: string,
): Promise<void> {
  if (householdId === GUEST_HOUSEHOLD_ID) {
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

  const ref = doc(db, 'households', householdId, RECORDS_PATH, date)
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

/** 既存レコードのうち、指定 metricId の値が含まれるものから一括で除去する（metric 削除時に呼ぶ）。 */
export async function purgeMetricFromAllRecords(
  householdId: string,
  metricId: string,
): Promise<void> {
  const records = await fetchHealthDailyRecords(householdId)
  for (const r of records) {
    if (r.valuesByMetricId[metricId] === undefined) continue
    await removeMetricValueFromRecord(householdId, r.date, metricId)
  }
}

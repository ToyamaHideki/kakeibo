import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchHealthMetrics,
  addHealthMetric,
  updateHealthMetric,
  deleteHealthMetric,
  fetchHealthDailyRecords,
  upsertHealthDailyRecord,
  deleteHealthDailyRecord,
  removeMetricValueFromRecord,
  purgeMetricFromAllRecords,
} from '../firebase/healthFirestore'
import {
  fetchPrivateHealthMetrics,
  addPrivateHealthMetric,
  updatePrivateHealthMetric,
  deletePrivateHealthMetric,
  fetchPrivateHealthDailyRecords,
  upsertPrivateHealthDailyRecord,
  deletePrivateHealthDailyRecord,
  removePrivateMetricValueFromRecord,
  purgePrivateMetricFromAllRecords,
} from '../firebase/privateHealthFirestore'
import { GUEST_HOUSEHOLD_ID } from '../firebase/guestStore'
import type { HealthDailyRecord, HealthMetric, HealthVisibility } from '../types'
import { nextOrder } from '../utils/order'
import { useHousehold } from './useHousehold'

// 健康データ統合フック。
// - 測定項目（metric）と日次レコード（record）の双方を shared+private で統合管理
// - record は metric の visibility に従って対応するストレージに保存される
// - visibility 切替は metric の id を振り直す移行処理（関連 record の値も付け替え）
//
// rangeDays を渡すと records は指定日数分のみ Firestore から取得する（読み取り量削減）。
// 全期間が必要な操作（visibility 移行・metric 削除）は内部で別途全件取得する。
function effectiveUid(householdId: string | null, uid: string | null): string | null {
  if (householdId === GUEST_HOUSEHOLD_ID) return GUEST_HOUSEHOLD_ID
  return uid
}

function todayIsoLocal(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function isoDayOffsetLocal(offset: number, from: string): string {
  const [y, m, day] = from.split('-').map(Number)
  const d = new Date(y!, (m ?? 1) - 1, day ?? 1)
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

function computeRange(days: number): { from: string; to: string } {
  const to = todayIsoLocal()
  const from = isoDayOffsetLocal(-(days - 1), to)
  return { from, to }
}

export function useHealth(rangeDays?: number) {
  const { householdId, user } = useHousehold()
  const uid = effectiveUid(householdId, user?.uid ?? null)
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [records, setRecords] = useState<HealthDailyRecord[]>([])
  const [loading, setLoading] = useState(true)
  // 初回ロード後は loading を切替えず、既存データを表示したまま裏で再フェッチする。
  // 範囲変更時に画面全体がフラッシュするのを防ぐため。
  const initialLoadedRef = useRef(false)

  const load = useCallback(async () => {
    if (!householdId) return
    if (!initialLoadedRef.current) setLoading(true)
    try {
      const range = rangeDays ? computeRange(rangeDays) : undefined
      const [sharedMet, privMet, sharedRec, privRec] = await Promise.all([
        fetchHealthMetrics(householdId),
        uid ? fetchPrivateHealthMetrics(uid) : Promise.resolve([] as HealthMetric[]),
        fetchHealthDailyRecords(householdId, range),
        uid ? fetchPrivateHealthDailyRecords(uid, range) : Promise.resolve([] as HealthDailyRecord[]),
      ])
      const taggedMetrics: HealthMetric[] = [
        ...sharedMet.map(m => ({ ...m, visibility: 'shared' as const })),
        ...privMet.map(m => ({ ...m, visibility: 'private' as const })),
      ].sort((a, b) => a.order - b.order)
      const taggedRecords: HealthDailyRecord[] = [
        ...sharedRec.map(r => ({ ...r, visibility: 'shared' as const })),
        ...privRec.map(r => ({ ...r, visibility: 'private' as const })),
      ]
      setMetrics(taggedMetrics)
      setRecords(taggedRecords)
      initialLoadedRef.current = true
    } finally {
      setLoading(false)
    }
  }, [householdId, uid, rangeDays])

  useEffect(() => { load() }, [load])

  // ─── metric 操作 ───────────────────────────────────────────────────────────

  async function addMetric(metric: Omit<HealthMetric, 'id' | 'order'>) {
    if (!householdId) return
    const visibility = metric.visibility
    // visibility をまたいだ並び順を一意にするため global で採番する
    const order = nextOrder(metrics)
    const data: Omit<HealthMetric, 'id'> = { ...metric, order }
    if (visibility === 'private') {
      if (!uid) throw new Error('private metric の作成には uid が必要です')
      const id = await addPrivateHealthMetric(uid, data)
      setMetrics(prev => [...prev, { ...data, id }].sort((a, b) => a.order - b.order))
    } else {
      const id = await addHealthMetric(householdId, data)
      setMetrics(prev => [...prev, { ...data, id }].sort((a, b) => a.order - b.order))
    }
  }

  async function updateMetricInPlace(id: string, patch: Partial<Omit<HealthMetric, 'id'>>) {
    if (!householdId) return
    const before = metrics.find(m => m.id === id)
    if (!before) return
    if (before.visibility === 'private') {
      if (!uid) return
      await updatePrivateHealthMetric(uid, id, patch)
    } else {
      await updateHealthMetric(householdId, id, patch)
    }
    setMetrics(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))
  }

  // visibility が変わる可能性のある更新。
  // 変わる場合は新 visibility 側に metric を新 id で作成 → 関連 record の値を新 id へ振り替え → 旧を削除。
  async function updateMetric(id: string, patch: Partial<Omit<HealthMetric, 'id'>>) {
    if (!householdId) return
    const before = metrics.find(m => m.id === id)
    if (!before) return
    const nextVis: HealthVisibility = (patch.visibility as HealthVisibility | undefined) ?? before.visibility
    if (nextVis === before.visibility) {
      await updateMetricInPlace(id, patch)
      return
    }

    const merged: HealthMetric = { ...before, ...patch, visibility: nextVis }
    const { id: _drop, ...withoutId } = merged
    void _drop

    let newId: string
    if (nextVis === 'private') {
      if (!uid) return
      newId = await addPrivateHealthMetric(uid, withoutId)
    } else {
      newId = await addHealthMetric(householdId, withoutId)
    }

    // フックの records は range フィルタにより全期間を含まないことがある。
    // 移行は古いデータも対象にする必要があるため、ここで全期間を別途取得する。
    const [allSharedRec, allPrivRec] = await Promise.all([
      fetchHealthDailyRecords(householdId),
      uid ? fetchPrivateHealthDailyRecords(uid) : Promise.resolve([] as HealthDailyRecord[]),
    ])
    const allRecords: HealthDailyRecord[] = [
      ...allSharedRec.map(r => ({ ...r, visibility: 'shared' as const })),
      ...allPrivRec.map(r => ({ ...r, visibility: 'private' as const })),
    ]
    const affected = allRecords.filter(r => r.valuesByMetricId[id] !== undefined)
    for (const r of affected) {
      const value = r.valuesByMetricId[id]!
      if (nextVis === 'private') {
        if (uid) await upsertPrivateHealthDailyRecord(uid, r.date, { [newId]: value })
      } else {
        await upsertHealthDailyRecord(householdId, r.date, { [newId]: value })
      }
      if (before.visibility === 'private') {
        if (uid) await removePrivateMetricValueFromRecord(uid, r.date, id)
      } else {
        await removeMetricValueFromRecord(householdId, r.date, id)
      }
    }

    // 旧 metric 削除
    if (before.visibility === 'private') {
      if (uid) await deletePrivateHealthMetric(uid, id)
    } else {
      await deleteHealthMetric(householdId, id)
    }

    await load()
  }

  async function removeMetric(id: string) {
    if (!householdId) return
    const before = metrics.find(m => m.id === id)
    if (!before) return
    if (before.visibility === 'private') {
      if (uid) {
        await purgePrivateMetricFromAllRecords(uid, id)
        await deletePrivateHealthMetric(uid, id)
      }
    } else {
      await purgeMetricFromAllRecords(householdId, id)
      await deleteHealthMetric(householdId, id)
    }
    await load()
  }

  async function reorderMetrics(next: HealthMetric[]) {
    const updates = next.map((m, idx) => ({ ...m, order: idx + 1 }))
    setMetrics(updates)
    await Promise.all(updates.map(m => {
      if (m.visibility === 'private') {
        if (!uid) return Promise.resolve()
        return updatePrivateHealthMetric(uid, m.id, { order: m.order })
      }
      return updateHealthMetric(householdId!, m.id, { order: m.order })
    }))
  }

  // ─── record 操作 ───────────────────────────────────────────────────────────

  // metric.visibility ごとに対応ストレージへ振り分けて記録する。
  async function recordValues(date: string, valuesByMetricId: Record<string, number>) {
    if (!householdId) return
    const sharedPatch: Record<string, number> = {}
    const privatePatch: Record<string, number> = {}
    for (const [mid, v] of Object.entries(valuesByMetricId)) {
      const m = metrics.find(x => x.id === mid)
      if (!m) continue
      if (m.visibility === 'private') privatePatch[mid] = v
      else sharedPatch[mid] = v
    }
    const ops: Promise<unknown>[] = []
    if (Object.keys(sharedPatch).length > 0) {
      ops.push(upsertHealthDailyRecord(householdId, date, sharedPatch))
    }
    if (Object.keys(privatePatch).length > 0 && uid) {
      ops.push(upsertPrivateHealthDailyRecord(uid, date, privatePatch))
    }
    await Promise.all(ops)
    await load()
  }

  async function removeValue(date: string, metricId: string) {
    if (!householdId) return
    const m = metrics.find(x => x.id === metricId)
    if (!m) return
    if (m.visibility === 'private') {
      if (uid) await removePrivateMetricValueFromRecord(uid, date, metricId)
    } else {
      await removeMetricValueFromRecord(householdId, date, metricId)
    }
    await load()
  }

  async function deleteDay(date: string, visibility: HealthVisibility) {
    if (!householdId) return
    if (visibility === 'private') {
      if (uid) await deletePrivateHealthDailyRecord(uid, date)
    } else {
      await deleteHealthDailyRecord(householdId, date)
    }
    await load()
  }

  // ─── ユーティリティ ────────────────────────────────────────────────────────

  // 指定日のレコードを 1 行にマージ（shared と private の両方を統合）
  function recordForDate(date: string): Record<string, number> {
    const merged: Record<string, number> = {}
    for (const r of records) {
      if (r.date !== date) continue
      Object.assign(merged, r.valuesByMetricId)
    }
    return merged
  }

  // 指定 metric の (date, value) 履歴を時系列に
  function seriesForMetric(metricId: string): { date: string; value: number }[] {
    const out: { date: string; value: number }[] = []
    for (const r of records) {
      const v = r.valuesByMetricId[metricId]
      if (v === undefined) continue
      out.push({ date: r.date, value: v })
    }
    out.sort((a, b) => a.date.localeCompare(b.date))
    return out
  }

  return {
    metrics,
    records,
    loading,
    reload: load,
    addMetric,
    updateMetric,
    updateMetricInPlace,
    removeMetric,
    reorderMetrics,
    recordValues,
    removeValue,
    deleteDay,
    recordForDate,
    seriesForMetric,
  }
}

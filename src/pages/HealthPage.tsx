import { useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import '../lib/chart'
import { useHealth } from '../hooks/useHealth'
import GhostLoader from '../components/GhostLoader'
import SidePanelLayout from '../components/SidePanelLayout'
import { HealthRecordPanel } from '../features/HealthRecordPanel'
import { HealthRecordModal } from '../features/HealthRecordModal'
import { HealthMetricFormModal, type MetricFormValues } from '../features/HealthMetricFormModal'
import type { HealthMetric } from '../types'

function todayIso(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function isoDayOffset(offset: number, from: string): string {
  const [y, m, day] = from.split('-').map(Number)
  const d = new Date(y!, (m ?? 1) - 1, day ?? 1)
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

function formatValue(v: number | undefined, decimals: number): string {
  if (v === undefined) return '—'
  return v.toFixed(decimals)
}

function formatShortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${m}/${d}`
}

type RangeKey = '30d' | '3m' | '1y'

const RANGE_OPTIONS: { key: RangeKey; label: string; days: number }[] = [
  { key: '30d', label: '30日', days: 30 },
  { key: '3m',  label: '3ヶ月', days: 90 },
  { key: '1y',  label: '1年',  days: 365 },
]

export default function HealthPage() {
  const [range, setRange] = useState<RangeKey>('30d')

  // 選択範囲（30日 / 3ヶ月 / 1年）
  const rangeDays = RANGE_OPTIONS.find(r => r.key === range)!.days
  const rangeLabel = RANGE_OPTIONS.find(r => r.key === range)!.label

  // フックには範囲を渡す。範囲を変えると Firestore から該当期間のみ再取得される。
  const {
    metrics, loading,
    recordValues, recordForDate, seriesForMetric,
    addMetric, updateMetric, removeMetric,
  } = useHealth(rangeDays)

  // モーダル制御
  const [recordOpen, setRecordOpen] = useState(false)
  const [metricFormOpen, setMetricFormOpen] = useState(false)
  const [metricEditTarget, setMetricEditTarget] = useState<HealthMetric | null>(null)

  const sortedMetrics = useMemo(
    () => [...metrics].sort((a, b) => a.order - b.order),
    [metrics],
  )

  // 範囲内で「少なくとも 1 項目に値がある日付」を昇順で抽出。
  // データがない日付を埋めると見た目がスカスカになるため、表/グラフとも実データのみ表示する。
  const recordedDatesInRange = useMemo(() => {
    const today = todayIso()
    const cutoff = isoDayOffset(-(rangeDays - 1), today)
    const set = new Set<string>()
    for (const m of sortedMetrics) {
      for (const p of seriesForMetric(m.id)) {
        if (p.date >= cutoff && p.date <= today) set.add(p.date)
      }
    }
    return Array.from(set).sort()
  }, [sortedMetrics, seriesForMetric, rangeDays])

  // サマリ表（新しい日付が上）
  const tableRows = useMemo(
    () => [...recordedDatesInRange].reverse(),
    [recordedDatesInRange],
  )

  // グラフデータ
  const chartData = useMemo(() => {
    const labels = recordedDatesInRange
    const datasets = sortedMetrics.map(m => {
      const series = seriesForMetric(m.id)
      const byDate: Record<string, number> = {}
      for (const p of series) byDate[p.date] = p.value
      return {
        label: `${m.name} (${m.unit})`,
        data: labels.map(d => byDate[d] ?? null),
        borderColor: m.color,
        backgroundColor: m.color,
        spanGaps: true,
        tension: 0.3,
        pointRadius: labels.length > 60 ? 0 : 3,
        borderWidth: 2,
      }
    })
    return { labels: labels.map(formatShortDate), datasets }
  }, [sortedMetrics, seriesForMetric, recordedDatesInRange])

  const chartOptions: ChartOptions<'line'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 10, font: { size: 11 } },
      },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { ticks: { font: { size: 10 }, maxTicksLimit: recordedDatesInRange.length > 30 ? 8 : 10 }, grid: { display: false } },
      y: { ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
    },
  }), [recordedDatesInRange.length])

  // ─── ハンドラ ────────────────────────────────────────────────────────────────

  function openAddMetric() {
    setMetricEditTarget(null)
    setMetricFormOpen(true)
  }

  function openEditMetric(m: HealthMetric) {
    setMetricEditTarget(m)
    setMetricFormOpen(true)
  }

  async function handleMetricSave(values: MetricFormValues, editingTarget: HealthMetric | null) {
    if (editingTarget) {
      await updateMetric(editingTarget.id, {
        name: values.name,
        unit: values.unit,
        decimalPlaces: values.decimalPlaces,
        color: values.color,
        visibility: values.visibility,
        memo: values.memo.trim() === '' ? undefined : values.memo.trim(),
      })
    } else {
      await addMetric({
        name: values.name,
        unit: values.unit,
        decimalPlaces: values.decimalPlaces,
        color: values.color,
        visibility: values.visibility,
        ...(values.memo.trim() !== '' && { memo: values.memo.trim() }),
      })
    }
  }

  async function handleMetricDelete(metric: HealthMetric) {
    await removeMetric(metric.id)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-48"><GhostLoader label="読み込み中..." /></div>
  }

  return (
    <SidePanelLayout
      title="体重測定"
      sidePanelTitle="記録"
      fabAriaLabel="体重を記録"
      onFabClick={() => setRecordOpen(true)}
      sidePanel={(
        <HealthRecordPanel
          metrics={sortedMetrics}
          recordForDate={recordForDate}
          onSave={recordValues}
          onAddMetric={openAddMetric}
          onEditMetric={openEditMetric}
        />
      )}
    >
          {/* ─── 月次推移グラフ（xl は固定高） ─── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 xl:shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">推移</h2>
              <div className="flex gap-1">
                {RANGE_OPTIONS.map(r => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRange(r.key)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      range === r.key
                        ? 'bg-sage-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            {sortedMetrics.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-center text-xs text-gray-500">
                測定項目がまだありません。<br />
                <span className="xl:hidden">右下の + ボタンから記録を始めましょう。</span>
                <span className="hidden xl:inline">右の入力パネルから記録を始めましょう。</span>
              </div>
            ) : recordedDatesInRange.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-center text-xs text-gray-500">
                {rangeLabel}以内に記録がありません。
              </div>
            ) : (
              <div className="h-64">
                <Line data={chartData} options={chartOptions} />
              </div>
            )}
          </div>

          {/* ─── サマリ表（範囲セレクタに連動。データのある日のみ表示） ─── */}
          {sortedMetrics.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 xl:flex-1 xl:min-h-0 xl:flex xl:flex-col">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 xl:shrink-0">{rangeLabel}のサマリ</h2>
              {tableRows.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center text-xs text-gray-500 py-6">
                  {rangeLabel}以内に記録がありません。
                </div>
              ) : (
                <div className="overflow-x-auto xl:overflow-y-auto xl:flex-1 xl:min-h-0">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white">
                      <tr className="text-gray-500">
                        <th className="text-left font-medium py-1.5 pr-3">日付</th>
                        {sortedMetrics.map(m => (
                          <th key={m.id} className="text-right font-medium py-1.5 px-2 whitespace-nowrap">
                            <span
                              className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                              style={{ backgroundColor: m.color }}
                              aria-hidden="true"
                            />
                            {m.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map(d => {
                        const values = recordForDate(d)
                        return (
                          <tr key={d} className="border-t border-gray-100">
                            <td className="py-1.5 pr-3 text-gray-600 whitespace-nowrap">{formatShortDate(d)}</td>
                            {sortedMetrics.map(m => (
                              <td key={m.id} className="py-1.5 px-2 text-right tabular-nums text-gray-800">
                                {formatValue(values[m.id], m.decimalPlaces)}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

      {/* 記録モーダル（xl 未満のみ機能。FAB を非表示なら開かれない） */}
      <HealthRecordModal
        isOpen={recordOpen}
        metrics={sortedMetrics}
        recordForDate={recordForDate}
        onClose={() => setRecordOpen(false)}
        onSave={recordValues}
        onAddMetric={openAddMetric}
        onEditMetric={openEditMetric}
      />

      {/* 項目フォームモーダル（PC でも引き続きモーダルで表示） */}
      <HealthMetricFormModal
        isOpen={metricFormOpen}
        editTarget={metricEditTarget}
        onClose={() => setMetricFormOpen(false)}
        onSave={handleMetricSave}
        onDelete={metricEditTarget ? handleMetricDelete : undefined}
      />
    </SidePanelLayout>
  )
}

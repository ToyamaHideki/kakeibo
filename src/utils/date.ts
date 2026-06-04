export function currentYear(): number {
  return new Date().getFullYear()
}

export function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// 給与日を起算とした「当月分」の yyyy-MM を返す。
// payDay 未設定（null）の場合はカレンダー月をそのまま返す。
// 例: payDay=20・今日=2026-06-04 → 期間 2026-05(5/20〜6/19) に属するため "2026-05"
export function currentPayPeriodMonth(payDay: number | null): string {
  const calendarMonth = currentYearMonth()
  if (!payDay) return calendarMonth
  // 給与日より前の日付は前月分の期間に属する
  if (new Date().getDate() < payDay) {
    return adjacentMonth(calendarMonth, -1)
  }
  return calendarMonth
}

// "yyyy-MM" 形式の文字列を year/month の数値に分解する内部ヘルパー
// 入力形式が保証されているため、分割結果が undefined になることはない
function parseYearMonth(yearMonth: string): { year: number; month: number } {
  const parts = yearMonth.split('-')
  return { year: Number(parts[0]), month: Number(parts[1]) }
}

export function formatYearMonth(yearMonth: string): string {
  const { year, month } = parseYearMonth(yearMonth)
  return `${year}年${month}月`
}

export function adjacentMonth(yearMonth: string, delta: number): string {
  const { year, month } = parseYearMonth(yearMonth)
  const date = new Date(year, month - 1 + delta)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function getPayPeriodRange(yearMonth: string, payDay: number): { start: string; end: string } {
  const { year, month } = parseYearMonth(yearMonth)
  const start = `${yearMonth}-${String(payDay).padStart(2, '0')}`
  const endMonth = month === 12 ? 1 : month + 1
  const endYear = month === 12 ? year + 1 : year
  const end = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(payDay - 1).padStart(2, '0')}`
  return { start, end }
}

export function formatPayPeriodLabel(yearMonth: string, payDay: number): string {
  const { year, month } = parseYearMonth(yearMonth)
  const endMonth = month === 12 ? 1 : month + 1
  const endYear = month === 12 ? year + 1 : year
  const endYearPrefix = endYear !== year ? `${endYear}/` : ''
  return `${year}年${month}/${payDay}〜${endYearPrefix}${endMonth}/${payDay - 1}`
}

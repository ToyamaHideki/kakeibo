export function currentYear(): number {
  return new Date().getFullYear()
}

export function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
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

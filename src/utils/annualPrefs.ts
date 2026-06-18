// 年間収支ページの表示設定（端末内）。Firestore スキーマ変更なし。

const KEY_COLLAPSED = 'annualCollapsedCategoryIds'
const KEY_USE_PAY_DAY = 'annualUsePayDay'

export function getAnnualUsePayDay(): boolean {
  try {
    return localStorage.getItem(KEY_USE_PAY_DAY) === 'true'
  } catch {
    return false
  }
}

export function setAnnualUsePayDay(value: boolean): void {
  try {
    localStorage.setItem(KEY_USE_PAY_DAY, value ? 'true' : 'false')
  } catch {
    // プライベートモード等で書き込めない場合は無視
  }
}

export function getAnnualCollapsedCategoryIds(): string[] {
  try {
    const raw = localStorage.getItem(KEY_COLLAPSED)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

export function setAnnualCollapsedCategoryIds(ids: string[]): void {
  try {
    localStorage.setItem(KEY_COLLAPSED, JSON.stringify(ids))
  } catch {
    // プライベートモード等で書き込めない場合は無視
  }
}

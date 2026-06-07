// PC トップアクセス時にダッシュボードを初期表示するかどうかの設定。
// デバイス依存の表示設定のため localStorage に保存する（Firestore は使わない）。

const HOME_PREF_KEY = 'dashboardAsHome'

export function getDashboardAsHome(): boolean {
  try {
    return localStorage.getItem(HOME_PREF_KEY) === 'true'
  } catch {
    return false
  }
}

export function setDashboardAsHome(value: boolean): void {
  try {
    localStorage.setItem(HOME_PREF_KEY, value ? 'true' : 'false')
  } catch {
    // プライベートモード等で書き込めない場合は黙って無視（従来挙動にフォールバック）
  }
}

export function isDesktopViewport(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(min-width: 768px)').matches
}

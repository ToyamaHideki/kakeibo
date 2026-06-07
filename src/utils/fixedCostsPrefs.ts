// 固定費一覧に「個人の契約も表示するか」のユーザー設定（端末内）。
// 表示の好みのため localStorage に保存する（Firestore スキーマ変更なし）。

const KEY = 'showPersonalInFixedCosts'

export function getShowPersonalInFixedCosts(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true'
  } catch {
    return false
  }
}

export function setShowPersonalInFixedCosts(value: boolean): void {
  try {
    localStorage.setItem(KEY, value ? 'true' : 'false')
  } catch {
    // プライベートモード等で書き込めない場合は無視
  }
}

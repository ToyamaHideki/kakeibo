export function formatYen(n: number): string {
  return `¥${n.toLocaleString()}`
}

/** 1万以上は「¥〇.〇万」と省略表示 */
export function formatYenCompact(n: number): string {
  if (n >= 10000) return `¥${(n / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}万`
  return `¥${n.toLocaleString()}`
}

/** items の最大 order + 1 を返す。items が空なら 0。 */
export function nextOrder(items: { order: number }[]): number {
  return items.length === 0 ? 0 : Math.max(...items.map(i => i.order)) + 1
}

import { useEffect, useRef, useState } from 'react'

// スクロール方向・速度を監視してボトムナビの表示/非表示を返すフック。
//   - 下スクロール: 隠す（表示領域を確保）
//   - 素早い上スクロール: 再表示
//   - 最上部付近: 常に表示
//
// 各ページが独自の overflow-y-auto を持つため、capture フェーズで
// window の scroll を拾い、あらゆるスクロールコンテナに対応する。
const HIDE_THRESHOLD = 6        // 下スクロールで隠し始める移動量(px)
const SHOW_VELOCITY = -1.2      // 再表示する上スクロール速度(px/ms, 上向き負)
const TOP_OFFSET = 8            // この位置より上は常に表示(px)

export function useNavAutoHide(): boolean {
  const [hidden, setHidden] = useState(false)
  const lastTop = useRef(0)
  const lastTime = useRef(0)
  const lastTarget = useRef<EventTarget | null>(null)

  useEffect(() => {
    function onScroll(e: Event) {
      const target = e.target
      let top: number
      if (target instanceof HTMLElement) top = target.scrollTop
      else if (target === document) top = window.scrollY
      else return

      const now = performance.now()

      // スクロール対象が変わったら基準をリセット（画面遷移・別コンテナ対策）
      if (target !== lastTarget.current) {
        lastTarget.current = target
        lastTop.current = top
        lastTime.current = now
        return
      }

      const delta = top - lastTop.current
      const dt = now - lastTime.current || 1
      const velocity = delta / dt // 下向き正・上向き負
      lastTop.current = top
      lastTime.current = now

      if (top <= TOP_OFFSET) {
        setHidden(false)
      } else if (delta > HIDE_THRESHOLD) {
        setHidden(true)
      } else if (velocity < SHOW_VELOCITY) {
        setHidden(false)
      }
    }

    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => window.removeEventListener('scroll', onScroll, { capture: true })
  }, [])

  return hidden
}

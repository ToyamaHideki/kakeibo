import './GhostLoader.css'

interface Props {
  /** ローダーの拡縮率（既定 0.8） */
  scale?: number
  /** 任意の補足テキスト（例: "読み込み中…"） */
  label?: string
  /** 外側コンテナの追加クラス */
  className?: string
}

/**
 * Pac-Man の Blinky 風ピクセルローダー。
 * 出典: uiverse.io / BlackisPlay / sweet-frog-67
 */
export default function GhostLoader({ scale = 0.8, label, className = '' }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center gap-6 ${className}`} role="status" aria-live="polite">
      <div className="gh" style={{ scale: String(scale) }}>
        <div className="gh-red">
          <div className="gh-pupil" />
          <div className="gh-pupil1" />
          <div className="gh-eye" />
          <div className="gh-eye1" />
          <div className="gh-top0" />
          <div className="gh-top1" />
          <div className="gh-top2" />
          <div className="gh-top3" />
          <div className="gh-top4" />
          <div className="gh-st0" />
          <div className="gh-st1" />
          <div className="gh-st2" />
          <div className="gh-st3" />
          <div className="gh-st4" />
          <div className="gh-st5" />
          <div className="gh-an1" />
          <div className="gh-an2" />
          <div className="gh-an3" />
          <div className="gh-an4" />
          <div className="gh-an5" />
          <div className="gh-an6" />
          <div className="gh-an7" />
          <div className="gh-an8" />
          <div className="gh-an9" />
          <div className="gh-an10" />
          <div className="gh-an11" />
          <div className="gh-an12" />
          <div className="gh-an13" />
          <div className="gh-an14" />
          <div className="gh-an15" />
          <div className="gh-an16" />
          <div className="gh-an17" />
          <div className="gh-an18" />
        </div>
        <div className="gh-shadow" />
      </div>
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  )
}

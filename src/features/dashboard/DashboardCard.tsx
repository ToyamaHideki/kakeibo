import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

interface Props {
  title: string
  titleNote?: ReactNode // タイトル右に添える薄い補足（例：給与日起算の注記）
  to?: string // 指定時はカード右上に対応画面への遷移リンクを表示
  headerAction?: ReactNode // タイトル右に置く操作ボタン等（詳細リンクの左側に表示）
  className?: string
  children: ReactNode
}

export default function DashboardCard({ title, titleNote, to, headerAction, className = '', children }: Props) {
  return (
    <section className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col ${className}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-gray-700">{title}</h2>
          {titleNote && (
            <p className="text-[11px] font-normal text-gray-400 leading-tight mt-0.5">{titleNote}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {headerAction}
          {to && (
            <Link
              to={to}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-sage-200 text-sage-600 hover:bg-sage-50 text-[11px] font-medium transition-colors"
              aria-label={`${title}の画面へ`}
            >
              詳細
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </Link>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  )
}

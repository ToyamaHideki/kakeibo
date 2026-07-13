import type { ReactNode } from 'react'

interface Props {
  /** ページ最上部の見出し（h1） */
  title: string
  /** 右サイドパネルのタイトル */
  sidePanelTitle: string
  /** 右サイドパネルに描画する追加フォーム */
  sidePanel: ReactNode
  /** xl 未満で表示する FAB のアクセシビリティラベル */
  fabAriaLabel: string
  /** FAB タップ時のハンドラ（通常は追加モーダルを開く） */
  onFabClick: () => void
  /** 左カラム本体（リスト / グラフ / サマリ等） */
  children: ReactNode
}

// xl (1280px+) で右に固定追加パネル、xl 未満で右下に FAB を表示する
// 共通レイアウト。各機能ページから呼び出して画面構成を揃える。
//
// レイアウト構造:
//   ┌────────────────────────────────────────┐
//   │ タイトル                                │
//   │ ┌────────────────────┐ ┌─────────────┐ │
//   │ │ メインコンテンツ    │ │ 追加パネル  │ │
//   │ │ (children)         │ │ (sidePanel) │ │
//   │ │                    │ │             │ │
//   │ └────────────────────┘ └─────────────┘ │
//   └────────────────────────────────────────┘
//   xl 未満は単カラム + 右下 FAB
export default function SidePanelLayout({
  title,
  sidePanelTitle,
  sidePanel,
  fabAriaLabel,
  onFabClick,
  children,
}: Props) {
  return (
    <div className="px-4 pt-4 pb-24 md:px-6 md:pt-6 xl:pb-6 h-full overflow-y-auto xl:overflow-hidden xl:flex xl:flex-col">
      <div className="max-w-7xl mx-auto w-full xl:flex xl:flex-col xl:flex-1 xl:min-h-0">
        <h1 className="text-lg font-bold text-gray-800 mb-4 xl:shrink-0">{title}</h1>

        <div className="space-y-4 xl:space-y-0 xl:flex-1 xl:min-h-0 xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6">
          {/* メインカラム */}
          <div className="space-y-4 xl:space-y-4 xl:flex xl:flex-col xl:min-w-0 xl:min-h-0 xl:h-full">
            {children}
          </div>

          {/* 右サイドパネル（xl 以上のみ） */}
          <aside className="hidden xl:flex xl:flex-col xl:h-full xl:min-h-0">
            <div className="bg-white rounded-2xl border border-gray-200 flex flex-col flex-1 min-h-0">
              <h2 className="text-sm font-semibold text-gray-700 px-4 pt-4 pb-2 shrink-0">{sidePanelTitle}</h2>
              <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
                {sidePanel}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* FAB（xl 未満のみ） */}
      <button
        onClick={onFabClick}
        aria-label={fabAriaLabel}
        className="xl:hidden fixed right-4 fab-mobile md:bottom-6 z-20 w-14 h-14 bg-sage-600 hover:bg-sage-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
      >
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  )
}

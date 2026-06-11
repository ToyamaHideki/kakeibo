import { useAnnouncements } from '../hooks/useAnnouncements'
import { APP_VERSION_LABEL } from '../constants/version'
import GhostLoader from '../components/GhostLoader'
import type { Announcement } from '../types'

function formatReleasedAt(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function AnnouncementCard({ item }: { item: Announcement }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 text-xs font-semibold">
          Ver {item.version}
        </span>
        <span className="text-xs text-gray-500">{formatReleasedAt(item.releasedAt)}</span>
      </div>
      <h2 className="text-base font-bold text-gray-800 mb-2">{item.title}</h2>
      <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{item.content}</p>
    </div>
  )
}

export default function AnnouncementsPage() {
  const { announcements, loading } = useAnnouncements()

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-4 md:py-8 pb-24 md:pb-8">
        <div className="flex items-baseline justify-between mb-4 md:mb-6 flex-wrap gap-2">
          <h1 className="text-xl font-bold text-gray-800">お知らせ</h1>
          <span className="text-xs text-gray-500">現在のバージョン: {APP_VERSION_LABEL}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <GhostLoader label="読み込み中..." />
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-500 text-sm">
            お知らせはまだありません
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {announcements.map(item => (
              <AnnouncementCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

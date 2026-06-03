import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import AnnouncementsPage from '../pages/AnnouncementsPage'
import type { Announcement } from '../types'

vi.mock('../hooks/useAnnouncements', () => ({
  useAnnouncements: vi.fn(),
}))

import { useAnnouncements } from '../hooks/useAnnouncements'

const SAMPLE: Announcement[] = [
  {
    id: 'a1',
    version: '1.0000',
    title: 'Ver 1.0000 リリース',
    content: '個人管理タグを新設しました。\nお知らせ機能を追加しました。',
    releasedAt: new Date('2026-06-03').getTime(),
    order: 0,
  },
]

beforeEach(() => { vi.clearAllMocks() })

describe('AnnouncementsPage', () => {
  it('ヘッダーに「お知らせ」と現在のバージョンを表示する', () => {
    vi.mocked(useAnnouncements).mockReturnValue({ announcements: [], loading: false })
    render(<AnnouncementsPage />)
    expect(screen.getByRole('heading', { name: 'お知らせ' })).toBeInTheDocument()
    expect(screen.getByText(/現在のバージョン/)).toBeInTheDocument()
    expect(screen.getByText(/Ver 1\.0100/)).toBeInTheDocument()
  })

  it('読み込み中はローディング表示', () => {
    vi.mocked(useAnnouncements).mockReturnValue({ announcements: [], loading: true })
    render(<AnnouncementsPage />)
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('お知らせが 0 件の場合は空状態メッセージを表示', () => {
    vi.mocked(useAnnouncements).mockReturnValue({ announcements: [], loading: false })
    render(<AnnouncementsPage />)
    expect(screen.getByText('お知らせはまだありません')).toBeInTheDocument()
  })

  it('お知らせがある場合はバージョン・日付・タイトル・本文を表示', () => {
    vi.mocked(useAnnouncements).mockReturnValue({ announcements: SAMPLE, loading: false })
    render(<AnnouncementsPage />)
    expect(screen.getByText('Ver 1.0000')).toBeInTheDocument()
    expect(screen.getByText('2026/06/03')).toBeInTheDocument()
    expect(screen.getByText('Ver 1.0000 リリース')).toBeInTheDocument()
    expect(screen.getByText(/個人管理タグを新設しました/)).toBeInTheDocument()
  })
})

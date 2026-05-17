import { useEffect, useState } from 'react'
import {
  fetchHousehold,
  refreshInviteCode,
  updateHouseholdSettings,
  updateMemberProfile,
} from '../firebase/householdFirestore'
import { useHousehold } from '../hooks/useHousehold'
import { useConfirm } from '../hooks/useConfirm'
import ConfirmDialog from '../components/ConfirmDialog'
import { signOut } from '../firebase/auth'
import type { Household } from '../firebase/householdFirestore'

export default function HouseholdSettingsPage() {
  const { householdId, user, reloadHousehold } = useHousehold()
  const { confirm, dialogProps } = useConfirm()
  const [household, setHousehold] = useState<(Household & { id: string }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedPayDay, setSelectedPayDay] = useState<number | null>(null)
  const [savingPayDay, setSavingPayDay] = useState(false)
  const [payDaySaved, setPayDaySaved] = useState(false)
  const [nickname, setNickname] = useState('')
  const [savingNickname, setSavingNickname] = useState(false)
  const [nicknameSaved, setNicknameSaved] = useState(false)

  useEffect(() => {
    if (!householdId || !user) return
    fetchHousehold(householdId)
      .then(async data => {
        setHousehold(data)
        setSelectedPayDay(data?.payDay ?? null)

        // 現在ユーザーのメール・ニックネームを同期
        const existing = data?.memberProfiles?.[user.uid]
        setNickname(existing?.nickname ?? '')
        if (!existing || existing.email !== user.email) {
          await updateMemberProfile(householdId, user.uid, {
            email: user.email ?? '',
            nickname: existing?.nickname,
          })
          setHousehold(prev => {
            if (!prev) return prev
            return {
              ...prev,
              memberProfiles: {
                ...prev.memberProfiles,
                [user.uid]: { email: user.email ?? '', nickname: existing?.nickname },
              },
            }
          })
        }
      })
      .finally(() => setLoading(false))
  }, [householdId, user])

  async function handleRefreshCode() {
    if (!householdId) return
    if (!await confirm('招待コードを再生成しますか？\n現在のコードは無効になります。')) return
    setRefreshing(true)
    try {
      const newCode = await refreshInviteCode(householdId)
      setHousehold(prev => prev ? { ...prev, inviteCode: newCode } : prev)
    } finally {
      setRefreshing(false)
    }
  }

  async function handleCopy() {
    if (!household?.inviteCode) return
    await navigator.clipboard.writeText(household.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSavePayDay() {
    if (!householdId) return
    setSavingPayDay(true)
    try {
      await updateHouseholdSettings(householdId, { payDay: selectedPayDay })
      await reloadHousehold()
      setPayDaySaved(true)
      setTimeout(() => setPayDaySaved(false), 2000)
    } finally {
      setSavingPayDay(false)
    }
  }

  async function handleSaveNickname() {
    if (!householdId || !user) return
    setSavingNickname(true)
    try {
      const trimmed = nickname.trim()
      await updateMemberProfile(householdId, user.uid, {
        email: user.email ?? '',
        nickname: trimmed || undefined,
      })
      setHousehold(prev => {
        if (!prev) return prev
        return {
          ...prev,
          memberProfiles: {
            ...prev.memberProfiles,
            [user.uid]: { email: user.email ?? '', nickname: trimmed || undefined },
          },
        }
      })
      setNicknameSaved(true)
      setTimeout(() => setNicknameSaved(false), 2000)
    } finally {
      setSavingNickname(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
        読み込み中...
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
    <div className="max-w-2xl mx-auto px-4 py-4 md:py-8">
      <h1 className="text-xl font-bold text-gray-800 mb-4 md:mb-6">世帯設定</h1>

      <div className="space-y-3 md:space-y-4">
        {/* 招待コード */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">招待コード</h2>
          <p className="text-gray-600 text-sm mb-3">
            このコードを家族に共有すると、同じ世帯データを参照できます。
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-stone-50 rounded-xl px-3 py-3 md:px-6 md:py-4 text-center font-mono text-2xl md:text-3xl font-bold tracking-[0.2em] md:tracking-[0.3em] text-sage-700 select-all min-w-0">
              {household?.inviteCode ?? '------'}
            </div>
            <button
              onClick={handleCopy}
              className="px-3 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
            >
              {copied ? '済み' : 'コピー'}
            </button>
          </div>
          <button
            onClick={handleRefreshCode}
            disabled={refreshing}
            className="mt-2 text-xs text-gray-500 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            {refreshing ? '再生成中...' : 'コードを再生成する'}
          </button>
        </div>

        {/* アカウント情報 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">アカウント情報</h2>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-sage-100 flex items-center justify-center shrink-0">
                <span className="text-sage-600 text-sm font-medium">
                  {(user?.displayName ?? user?.email ?? '?').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{user?.email}</p>
                {nickname && (
                  <p className="text-xs text-sage-600 truncate">{nickname}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors shrink-0 ml-3"
            >
              ログアウト
            </button>
          </div>

          {/* ニックネーム */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ニックネーム（任意）</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="例：夫、妻、パパ、ママ"
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 min-w-0"
              />
              <button
                onClick={handleSaveNickname}
                disabled={savingNickname}
                className="px-4 py-2.5 bg-sage-600 hover:bg-sage-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 shrink-0"
              >
                {nicknameSaved ? '保存済み' : savingNickname ? '保存中...' : '保存'}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              口座の名義人表示や世帯メンバー一覧に使用されます
            </p>
          </div>
        </div>

        {/* 世帯メンバー */}
        {household && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              世帯メンバー
              <span className="ml-2 text-gray-500 font-normal normal-case">{household.memberIds.length}名</span>
            </h2>
            <div className="space-y-2">
              {household.memberIds.map(uid => {
                const profile = household.memberProfiles?.[uid]
                const email = profile?.email ?? uid
                const nick = profile?.nickname
                const isMe = uid === user?.uid
                return (
                  <div key={uid} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center shrink-0">
                      <span className="text-sage-600 text-xs font-medium">
                        {(nick ?? email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">
                        {email}
                        {nick && (
                          <span className="ml-1.5 text-xs text-sage-600 font-medium">（{nick}）</span>
                        )}
                      </p>
                    </div>
                    {isMe && (
                      <span className="text-[10px] text-gray-500 shrink-0">自分</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 給与日設定 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">給与日設定</h2>
          <p className="text-gray-500 text-xs mb-3">
            設定すると月別収支・個人支出・予算管理が給与日起算で表示されます。
          </p>
          <div className="flex items-center gap-2">
            <select
              value={selectedPayDay ?? 0}
              onChange={e => setSelectedPayDay(Number(e.target.value) || null)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-sage-300 bg-white min-w-0"
            >
              <option value={0}>カレンダー月（1日〜末日）</option>
              {Array.from({ length: 27 }, (_, i) => i + 2).map(d => (
                <option key={d} value={d}>毎月{d}日</option>
              ))}
            </select>
            <button
              onClick={handleSavePayDay}
              disabled={savingPayDay}
              className="px-4 py-2.5 bg-sage-600 hover:bg-sage-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 shrink-0"
            >
              {payDaySaved ? '保存済み' : savingPayDay ? '保存中...' : '保存'}
            </button>
          </div>
          {selectedPayDay && selectedPayDay >= 2 && (
            <p className="mt-2 text-xs text-sage-600">
              例：5月の {selectedPayDay}日〜翌{selectedPayDay - 1}日として集計されます
            </p>
          )}
        </div>
      </div>
      <ConfirmDialog {...dialogProps} confirmLabel="再生成する" />
    </div>
    </div>
  )
}

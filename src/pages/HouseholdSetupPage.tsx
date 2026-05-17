import { useState } from 'react'
import { createHousehold, joinHousehold } from '../firebase/householdFirestore'
import { useHousehold } from '../hooks/useHousehold'
import { signOut } from '../firebase/auth'

export default function HouseholdSetupPage() {
  const { user, reloadHousehold } = useHousehold()
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      await createHousehold(user.uid, user.displayName)
      await reloadHousehold()
    } catch {
      setError('世帯の作成に失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!user || !inviteCode.trim()) return
    setLoading(true)
    setError('')
    try {
      const householdId = await joinHousehold(user.uid, inviteCode.trim(), user.displayName)
      if (!householdId) {
        setError('招待コードが見つかりません。コードを確認してください。')
        return
      }
      await reloadHousehold()
    } catch {
      setError('参加に失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-stone-50 px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-sage-600 mb-2 text-center">家計簿</h1>
        <p className="text-gray-500 text-sm text-center mb-8">
          {user?.displayName ?? user?.email ?? ''} でログイン中
        </p>

        {mode === 'select' && (
          <div className="space-y-3">
            <p className="text-gray-700 font-medium text-center mb-5">世帯を設定してください</p>
            <button
              onClick={() => setMode('create')}
              className="w-full py-3 bg-sage-600 text-white rounded-xl font-medium hover:bg-sage-700 transition-colors"
            >
              新しい世帯を作成
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full py-3 border border-sage-300 text-sage-600 rounded-xl font-medium hover:bg-sage-50 transition-colors"
            >
              招待コードで参加
            </button>
            <button
              onClick={() => signOut()}
              className="w-full py-2 text-gray-500 text-sm hover:text-gray-600 transition-colors"
            >
              ログアウト
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm text-center">
              新しい世帯を作成します。<br />
              家族を後から招待コードで追加できます。
            </p>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-3 bg-sage-600 text-white rounded-xl font-medium hover:bg-sage-700 transition-colors disabled:opacity-50"
            >
              {loading ? '作成中...' : '世帯を作成する'}
            </button>
            <button
              onClick={() => { setMode('select'); setError('') }}
              className="w-full py-2 text-gray-500 text-sm hover:text-gray-600 transition-colors"
            >
              戻る
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm text-center">
              既存の世帯に参加します。<br />
              世帯メンバーから招待コードを受け取ってください。
            </p>
            <input
              type="text"
              placeholder="招待コード（例：ABC123）"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center tracking-widest font-mono text-lg uppercase focus:outline-none focus:ring-2 focus:ring-sage-300"
              maxLength={6}
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              onClick={handleJoin}
              disabled={loading || inviteCode.length < 6}
              className="w-full py-3 bg-sage-600 text-white rounded-xl font-medium hover:bg-sage-700 transition-colors disabled:opacity-50"
            >
              {loading ? '参加中...' : '参加する'}
            </button>
            <button
              onClick={() => { setMode('select'); setError(''); setInviteCode('') }}
              className="w-full py-2 text-gray-500 text-sm hover:text-gray-600 transition-colors"
            >
              戻る
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

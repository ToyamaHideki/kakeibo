import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEscapeKey } from '../hooks/useEscapeKey'
import type { CfMember, CfPlan } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  plan: CfPlan
  onSave: (plan: CfPlan) => Promise<void>
}

export default function CfSettingsModal({ isOpen, onClose, plan, onSave }: Props) {
  const [tab, setTab] = useState<'basic' | 'family'>('basic')
  const [startYear, setStartYear] = useState(plan.startYear)
  const [initialSavings, setInitialSavings] = useState(plan.initialSavings)
  const [members, setMembers] = useState<CfMember[]>(plan.members)
  const [newName, setNewName] = useState('')
  const [newBirthYear, setNewBirthYear] = useState(new Date().getFullYear() - 30)
  const [newRole, setNewRole] = useState('夫')
  const [newRoleCustom, setNewRoleCustom] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setStartYear(plan.startYear)
      setInitialSavings(plan.initialSavings)
      setMembers(plan.members)
      setNewName('')
      setNewRole('夫')
      setNewRoleCustom('')
      setTab('basic')
    }
  }, [isOpen, plan])

  useEscapeKey(onClose, isOpen)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({ ...plan, startYear, initialSavings, members })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  function addMember() {
    if (!newName.trim()) return
    const resolvedRole = newRole === 'その他' ? newRoleCustom.trim() : newRole
    const newMember: CfMember = {
      id: `member-${Date.now()}`,
      name: newName.trim(),
      birthYear: newBirthYear,
      role: resolvedRole || undefined,
    }
    setMembers(prev => [...prev, newMember])
    setNewName('')
    setNewRoleCustom('')
  }

  function removeMember(id: string) {
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full md:max-w-md md:rounded-xl rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Pull indicator (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">CF設定</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          {(['basic', 'family'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-sage-600 text-sage-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'basic' ? '基本設定' : '家族構成'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {tab === 'basic' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">計画開始年</label>
                <input
                  type="number"
                  value={startYear}
                  onChange={e => setStartYear(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  初期貯蓄残高（万円）
                </label>
                <input
                  type="number"
                  value={initialSavings}
                  onChange={e => setInitialSavings(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                />
              </div>
            </>
          ) : (
            <>
              {members.length === 0 && (
                <p className="text-xs text-gray-500 py-2">家族が登録されていません</p>
              )}
              <div className="space-y-1">
                {members.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-gray-50"
                  >
                    <span className="flex-1 text-sm text-gray-700">{member.name}</span>
                    {member.role && (
                      <span className="text-xs bg-sage-50 text-sage-600 px-1.5 py-0.5 rounded">
                        {member.role}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{member.birthYear}年生まれ</span>
                    <button
                      onClick={() => removeMember(member.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-1 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">家族を追加</p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="名前"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addMember()}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-300"
                  />
                  <input
                    type="number"
                    placeholder="生年"
                    value={newBirthYear}
                    onChange={e => setNewBirthYear(Number(e.target.value))}
                    className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-300"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-300"
                  >
                    <option>夫</option>
                    <option>妻</option>
                    <option>子</option>
                    <option>その他</option>
                  </select>
                  {newRole === 'その他' && (
                    <input
                      type="text"
                      placeholder="役割を入力"
                      value={newRoleCustom}
                      onChange={e => setNewRoleCustom(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-300"
                    />
                  )}
                  <button
                    onClick={addMember}
                    disabled={!newName.trim()}
                    className="px-3 py-2 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    追加
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

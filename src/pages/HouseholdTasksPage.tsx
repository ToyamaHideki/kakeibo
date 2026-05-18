import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useHouseholdTasks } from '../hooks/useHouseholdTasks'
import { useHousehold } from '../hooks/useHousehold'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useConfirm } from '../hooks/useConfirm'
import ConfirmDialog from '../components/ConfirmDialog'
import { fetchHousehold, fetchMemberProfiles, addExtraAssignee, removeExtraAssignee } from '../firebase/householdFirestore'
import type { HouseholdTask } from '../types'

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
      <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/>
      <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
    </svg>
  )
}

function RecurringIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" className="text-sage-500">
      <path fillRule="evenodd" d="M8 3a5 5 0 104.546 2.914.5.5 0 000-.986A4 4 0 118 4.25v-.75a.5.5 0 00-.854-.354L5.646 4.646a.5.5 0 000 .708l1.5 1.5a.5.5 0 10.708-.708L7.207 5.5H8V3z"/>
    </svg>
  )
}

type AddForm = {
  name: string
  assignee: string
  dueDate: string
  isRecurring: boolean
  recurrenceType: 'daily' | 'weekly' | 'monthly'
}

const defaultForm: AddForm = {
  name: '',
  assignee: '',
  dueDate: '',
  isRecurring: false,
  recurrenceType: 'weekly',
}

export default function HouseholdTasksPage() {
  const { tasks, loading, filter, setFilter, today, addTask, completeTask, uncompleteTask, deleteTask } = useHouseholdTasks()
  const { householdId } = useHousehold()
  const { confirm, dialogProps } = useConfirm()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<AddForm>(defaultForm)

  // 担当者候補リスト（ニックネーム + extraAssignees）
  const [assignees, setAssignees] = useState<string[]>([])
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const newNameInputRef = useRef<HTMLInputElement>(null)

  // 世帯データから担当者候補を構築
  useEffect(() => {
    if (!householdId) return
    Promise.all([fetchHousehold(householdId), fetchMemberProfiles(householdId)]).then(([data, profiles]) => {
      if (!data) return
      const nicknames = Object.values(profiles)
        .map(p => p.nickname)
        .filter((n): n is string => !!n)
      const extras = data.extraAssignees ?? []
      const merged = [...nicknames, ...extras.filter(e => !nicknames.includes(e))]
      setAssignees(merged)
    })
  }, [householdId])

  // 「追加」の入力欄が表示されたらフォーカス
  useEffect(() => {
    if (addingNew) newNameInputRef.current?.focus()
  }, [addingNew])

  const closeModal = useCallback(() => {
    setShowModal(false)
    setForm(defaultForm)
    setAddingNew(false)
    setNewName('')
  }, [])

  useEscapeKey(closeModal, showModal)

  async function handleAddAssignee() {
    const trimmed = newName.trim()
    if (!trimmed || !householdId) return
    if (!assignees.includes(trimmed)) {
      await addExtraAssignee(householdId, trimmed)
      setAssignees(prev => [...prev, trimmed])
    }
    setForm(f => ({ ...f, assignee: trimmed }))
    setAddingNew(false)
    setNewName('')
  }

  async function handleRemoveAssignee(name: string) {
    if (!householdId) return
    if (!await confirm(`「${name}」を担当者リストから削除しますか？`)) return
    await removeExtraAssignee(householdId, name)
    setAssignees(prev => prev.filter(a => a !== name))
    setForm(f => ({ ...f, assignee: f.assignee === name ? '' : f.assignee }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = form.name.trim()
    if (!trimmed) return
    const task: Parameters<typeof addTask>[0] = {
      name: trimmed,
      isRecurring: form.isRecurring,
    }
    if (form.assignee.trim()) task.assignee = form.assignee.trim()
    if (form.dueDate) task.dueDate = form.dueDate
    if (form.isRecurring) task.recurrenceType = form.recurrenceType
    await addTask(task)
    setForm(defaultForm)
    setShowModal(false)
  }

  function dueDateBadge(task: HouseholdTask) {
    if (!task.dueDate) return null
    const isOverdue = task.dueDate < today
    const isToday = task.dueDate === today
    const label = isToday ? '今日' : formatDate(task.dueDate)
    const cls = isOverdue
      ? 'bg-red-50 text-red-500 border-red-200'
      : isToday
      ? 'bg-orange-50 text-orange-500 border-orange-200'
      : 'bg-gray-50 text-gray-500 border-gray-200'
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border ${cls}`}>
        {label}
      </span>
    )
  }

  function formatDate(dateStr: string) {
    const [, m, d] = dateStr.split('-')
    return `${Number(m)}/${Number(d)}`
  }

  const recurrenceLabel: Record<string, string> = { daily: '毎日', weekly: '毎週', monthly: '毎月' }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">読み込み中...</div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto h-full flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-xl font-bold text-gray-800">家事タスク</h2>
      </div>

      {/* フィルタータブ */}
      <div className="flex gap-1 mb-4 shrink-0 bg-gray-100 rounded-xl p-1">
        {(['active', 'done'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
            }`}
          >
            {f === 'active' ? '未完了' : '完了済み'}
          </button>
        ))}
      </div>

      {/* タスクリスト */}
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            <p className="text-sm">{filter === 'active' ? 'タスクはありません' : '完了済みのタスクはありません'}</p>
            {filter === 'active' && (
              <p className="text-xs mt-1">右下のボタンからタスクを追加してください</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filter === 'done' && tasks.some(t => t.isRecurring) && (
              <p className="text-[11px] text-gray-500 px-1 pb-1">
                繰り返しタスクは次回の期日になると自動で未完了に戻ります
              </p>
            )}
            {tasks.map(task => (
              <div
                key={task.id}
                className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border ${
                  task.isCompleted
                    ? 'bg-gray-50 border-gray-100'
                    : 'bg-white border-gray-100 shadow-sm'
                }`}
              >
                <button
                  onClick={() => task.isCompleted ? uncompleteTask(task.id) : completeTask(task.id)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    task.isCompleted
                      ? 'border-sage-400 bg-sage-400'
                      : 'border-gray-300 hover:border-sage-500'
                  }`}
                >
                  {task.isCompleted && (
                    <svg viewBox="0 0 12 12" width="9" height="9" fill="none" stroke="white" strokeWidth="2.5">
                      <polyline points="2 6 5 9 10 3" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-sm ${task.isCompleted ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                      {task.name}
                    </span>
                    {task.isRecurring && <RecurringIcon />}
                  </div>
                  {(task.assignee || task.dueDate || task.isRecurring) && (
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {task.assignee && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-500 border border-blue-200">
                          {task.assignee}
                        </span>
                      )}
                      {/* 完了済み繰り返しタスクは次回期日を表示、それ以外は通常の期日バッジ */}
                      {task.isCompleted && task.isRecurring && task.dueDate
                        ? <span className="text-[10px] text-sage-500">次回：{formatDate(task.dueDate)}</span>
                        : task.dueDate && dueDateBadge(task)
                      }
                      {task.isRecurring && task.recurrenceType && (
                        <span className="text-[10px] text-sage-500">
                          {recurrenceLabel[task.recurrenceType]}繰り返し
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => deleteTask(task.id)}
                  className="mt-0.5 text-gray-300 hover:text-red-400 transition-colors shrink-0"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed fab-mobile right-4 md:bottom-6 md:right-6 w-14 h-14 bg-sage-600 hover:bg-sage-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-10"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* 追加モーダル */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85svh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
              <h3 className="text-base font-bold text-gray-800">タスクを追加</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-600">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-4 space-y-4">
              {/* タスク名 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">タスク名 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="例：洗濯機を回す"
                  autoFocus
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                />
              </div>

              {/* 担当者 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">担当者（任意）</label>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {assignees.map(name => (
                    <div key={name} className="relative group">
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, assignee: f.assignee === name ? '' : name }))}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          form.assignee === name
                            ? 'bg-sage-600 text-white border-sage-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-sage-300'
                        }`}
                      >
                        {name}
                      </button>
                      {/* extraAssignees のみ長押しor ×で削除できる（ニックネームは設定から変更） */}
                      <button
                        type="button"
                        onClick={() => handleRemoveAssignee(name)}
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gray-400 hover:bg-red-400 text-white rounded-full items-center justify-center text-[8px] leading-none hidden group-hover:flex transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* 新規追加 */}
                  {addingNew ? (
                    <div className="flex items-center gap-1">
                      <input
                        ref={newNameInputRef}
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); handleAddAssignee() }
                          if (e.key === 'Escape') { setAddingNew(false); setNewName('') }
                        }}
                        placeholder="名前"
                        className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-sage-300 w-20"
                      />
                      <button
                        type="button"
                        onClick={handleAddAssignee}
                        disabled={!newName.trim()}
                        className="text-sage-600 hover:text-sage-700 disabled:text-gray-300 text-xs font-medium transition-colors"
                      >
                        追加
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddingNew(false); setNewName('') }}
                        className="text-gray-500 hover:text-gray-600 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingNew(true)}
                      className="px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-500 hover:border-sage-400 hover:text-sage-600 transition-colors"
                    >
                      + 追加
                    </button>
                  )}
                </div>
                {assignees.length === 0 && !addingNew && (
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    設定画面でニックネームを登録するか、「+ 追加」から担当者を追加できます
                  </p>
                )}
              </div>

              {/* 期日 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">期日（任意）</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                />
              </div>

              {/* 繰り返し */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isRecurring}
                    onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))}
                    className="w-4 h-4 rounded accent-sage-600"
                  />
                  <span className="text-sm text-gray-700">繰り返しタスク</span>
                </label>
                {form.isRecurring && (
                  <div className="flex gap-2 mt-2">
                    {(['daily', 'weekly', 'monthly'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, recurrenceType: type }))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          form.recurrenceType === type
                            ? 'bg-sage-600 text-white border-sage-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-sage-300'
                        }`}
                      >
                        {recurrenceLabel[type]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 追加ボタン */}
              <button
                type="submit"
                disabled={!form.name.trim()}
                className="w-full py-3 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-xl font-medium text-sm transition-colors"
              >
                追加する
              </button>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog {...dialogProps} confirmLabel="削除する" />
    </div>
  )
}

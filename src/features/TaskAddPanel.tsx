import { useEffect, useRef, useState } from 'react'

const RECURRENCE_LABEL: Record<string, string> = { daily: '毎日', weekly: '毎週', monthly: '毎月' }

interface Props {
  assignees: string[]
  onAdd: (task: {
    name: string
    isRecurring: boolean
    assignee?: string
    dueDate?: string
    recurrenceType?: 'daily' | 'weekly' | 'monthly'
  }) => Promise<void>
  /** 新規担当者を世帯の extraAssignees へ追加するハンドラ */
  onAddAssignee: (name: string) => Promise<void>
  /** 既存担当者を削除するハンドラ（× クリック時の確認はページ側で実施） */
  onRemoveAssignee: (name: string) => Promise<void>
}

// 家事タスク追加用サイドパネル。担当者の追加・削除も可能（既存モーダルと同じ挙動）。
export default function TaskAddPanel({ assignees, onAdd, onAddAssignee, onRemoveAssignee }: Props) {
  const [name, setName] = useState('')
  const [assignee, setAssignee] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [saving, setSaving] = useState(false)

  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const newNameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (addingNew) newNameInputRef.current?.focus()
  }, [addingNew])

  function reset() {
    setName('')
    setAssignee('')
    setDueDate('')
    setIsRecurring(false)
    setRecurrenceType('weekly')
  }

  async function handleAddAssignee() {
    const trimmed = newName.trim()
    if (!trimmed) return
    if (!assignees.includes(trimmed)) {
      await onAddAssignee(trimmed)
    }
    setAssignee(trimmed)
    setAddingNew(false)
    setNewName('')
  }

  async function handleSubmit() {
    if (saving) return
    const trimmed = name.trim()
    if (!trimmed) return
    const task: Parameters<typeof onAdd>[0] = {
      name: trimmed,
      isRecurring,
    }
    if (assignee.trim()) task.assignee = assignee.trim()
    if (dueDate) task.dueDate = dueDate
    if (isRecurring) task.recurrenceType = recurrenceType

    setSaving(true)
    try {
      await onAdd(task)
      reset()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="task-add-name" className="block text-xs font-medium text-gray-600 mb-1">タスク名 <span className="text-red-400">*</span></label>
        <input
          id="task-add-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="例：洗濯機を回す"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
        />
      </div>

      <div>
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label className="block text-xs font-medium text-gray-600 mb-2">担当者（任意）</label>
        <div className="flex flex-wrap gap-1.5 items-center">
          {assignees.map(n => (
            <div key={n} className="relative group">
              <button
                type="button"
                onClick={() => setAssignee(assignee === n ? '' : n)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  assignee === n
                    ? 'bg-sage-600 text-white border-sage-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-sage-300'
                }`}
              >
                {n}
              </button>
              <button
                type="button"
                onClick={() => onRemoveAssignee(n)}
                className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gray-400 hover:bg-red-400 text-white rounded-full items-center justify-center text-[8px] leading-none hidden group-hover:flex transition-colors"
                aria-label={`${n} を削除`}
              >
                ×
              </button>
            </div>
          ))}

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
      </div>

      <div>
        <label htmlFor="task-add-due" className="block text-xs font-medium text-gray-600 mb-1">期日（任意）</label>
        <input
          id="task-add-due"
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
        />
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={e => setIsRecurring(e.target.checked)}
            className="w-4 h-4 rounded accent-sage-600"
          />
          <span className="text-sm text-gray-700">繰り返しタスク</span>
        </label>
        {isRecurring && (
          <div className="flex gap-2 mt-2">
            {(['daily', 'weekly', 'monthly'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setRecurrenceType(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  recurrenceType === t
                    ? 'bg-sage-600 text-white border-sage-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-sage-300'
                }`}
              >
                {RECURRENCE_LABEL[t]}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving || !name.trim()}
        className="w-full py-3 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-300 text-white rounded-xl font-medium text-sm transition-colors"
      >
        追加する
      </button>
    </div>
  )
}

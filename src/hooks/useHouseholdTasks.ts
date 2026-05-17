import { useEffect, useState } from 'react'
import {
  addHouseholdTask as addTaskFn,
  deleteHouseholdTask as deleteTaskFn,
  fetchHouseholdTasks,
  updateHouseholdTask,
} from '../firebase/lifestyleFirestore'
import { useHousehold } from './useHousehold'
import type { HouseholdTask } from '../types'
import { nextOrder } from '../utils/order'

export type TaskFilter = 'active' | 'done'

function calcNextDueDate(task: HouseholdTask): string | undefined {
  if (!task.dueDate || !task.recurrenceType) return undefined
  const [y, m, d] = task.dueDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (task.recurrenceType === 'daily') date.setDate(date.getDate() + 1)
  else if (task.recurrenceType === 'weekly') date.setDate(date.getDate() + 7)
  else if (task.recurrenceType === 'monthly') date.setMonth(date.getMonth() + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 繰り返し完了タスクが未完了タブに戻るべきか判定
function shouldRestore(task: HouseholdTask, today: string): boolean {
  if (!task.isRecurring || !task.isCompleted) return false
  if (task.dueDate) {
    // 次回期日が今日以前になったら未完了へ復帰
    return task.dueDate <= today
  }
  // 期日なしの繰り返しタスクは翌日に復帰
  return !task.completedAt || task.completedAt < today
}

export function useHouseholdTasks() {
  const { householdId } = useHousehold()
  const [tasks, setTasks] = useState<HouseholdTask[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TaskFilter>('active')

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!householdId) return
    async function init() {
      try {
        const data = await fetchHouseholdTasks(householdId!)
        const sorted = data.sort((a, b) => a.order - b.order)

        // アプリ起動時: 期日が来た繰り返し完了タスクを未完了に戻す
        const toRestore = sorted.filter(t => shouldRestore(t, today))
        if (toRestore.length > 0) {
          await Promise.all(
            toRestore.map(t =>
              updateHouseholdTask(householdId!, t.id, { isCompleted: false, completedAt: undefined })
            )
          )
          const restored = sorted.map(t =>
            shouldRestore(t, today)
              ? { ...t, isCompleted: false, completedAt: undefined }
              : t
          )
          setTasks(restored)
        } else {
          setTasks(sorted)
        }
      } finally {
        setLoading(false)
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId])

  async function addTask(task: Omit<HouseholdTask, 'id' | 'isCompleted' | 'completedAt' | 'order'>) {
    if (!householdId) return
    const newTask: Omit<HouseholdTask, 'id'> = { ...task, isCompleted: false, order: nextOrder(tasks) }
    const id = await addTaskFn(householdId, newTask)
    setTasks(prev => [...prev, { ...newTask, id }])
  }

  async function completeTask(id: string) {
    if (!householdId) return
    const task = tasks.find(t => t.id === id)
    if (!task) return

    if (task.isRecurring) {
      // 繰り返しタスク: 次の期日を設定して完了タブへ
      const nextDueDate = calcNextDueDate(task)
      const updates: Partial<Omit<HouseholdTask, 'id'>> = {
        isCompleted: true,
        completedAt: today,
      }
      if (nextDueDate) updates.dueDate = nextDueDate
      await updateHouseholdTask(householdId, id, updates)
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    } else {
      const updates = { isCompleted: true, completedAt: today }
      await updateHouseholdTask(householdId, id, updates)
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    }
  }

  async function uncompleteTask(id: string) {
    if (!householdId) return
    await updateHouseholdTask(householdId, id, { isCompleted: false, completedAt: undefined })
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isCompleted: false, completedAt: undefined } : t))
  }

  async function deleteTask(id: string) {
    if (!householdId) return
    await deleteTaskFn(householdId, id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const activeTasks = tasks
    .filter(t => !t.isCompleted)
    .sort((a, b) => {
      const aDate = a.dueDate ?? '9999-99-99'
      const bDate = b.dueDate ?? '9999-99-99'
      return aDate.localeCompare(bDate)
    })

  const doneTasks = tasks.filter(t => t.isCompleted)

  const displayedTasks = filter === 'active' ? activeTasks : doneTasks

  return { tasks: displayedTasks, loading, filter, setFilter, today, addTask, completeTask, uncompleteTask, deleteTask }
}

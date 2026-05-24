import type {
  BalanceSheet,
  Category,
  CfPlan,
  FixedCost,
  HouseholdTask,
  IncomeStatement,
  MonthDocument,
  PaymentMethod,
  SavingsAccount,
  SavingsGoal,
  SecuritiesAccount,
  ShoppingItem,
  Transaction,
} from '../types'
import type { GuestStoreData } from '../data/guestData'

export const GUEST_HOUSEHOLD_ID = '__guest__'

let store: GuestStoreData | null = null

export function initGuestStore(data: GuestStoreData): void {
  store = structuredClone(data)
}

function s(): GuestStoreData {
  if (!store) throw new Error('guestStore not initialized')
  return store
}

// ─── MonthlyData ──────────────────────────────────────────────────────────────

export function guestGetMonthData(yearMonth: string): MonthDocument | null {
  return s().monthlyData[yearMonth] ?? null
}

export function guestSaveTransaction(yearMonth: string, tx: Transaction): void {
  const g = s()
  const parts = yearMonth.split('-')
  const year = Number(parts[0])
  const month = Number(parts[1])
  const existing = g.monthlyData[yearMonth] ?? { year, month, transactions: [] }
  g.monthlyData[yearMonth] = { ...existing, transactions: [...existing.transactions, tx] }
}

export function guestUpdateTransaction(yearMonth: string, tx: Transaction): void {
  const g = s()
  const existing = g.monthlyData[yearMonth]
  if (!existing) return
  g.monthlyData[yearMonth] = {
    ...existing,
    transactions: existing.transactions.map(t => (t.id === tx.id ? tx : t)),
  }
}

export function guestDeleteTransaction(yearMonth: string, id: string): void {
  const g = s()
  const existing = g.monthlyData[yearMonth]
  if (!existing) return
  g.monthlyData[yearMonth] = {
    ...existing,
    transactions: existing.transactions.filter(t => t.id !== id),
  }
}

export function guestMoveTransaction(from: string, to: string, tx: Transaction): void {
  guestDeleteTransaction(from, tx.id)
  guestSaveTransaction(to, tx)
}

// ─── PersonalMonthlyData ──────────────────────────────────────────────────────

export function guestGetPersonalMonthData(yearMonth: string): MonthDocument | null {
  return s().personalMonthlyData[yearMonth] ?? null
}

// ─── Categories ───────────────────────────────────────────────────────────────

export function guestGetCategories(): Category[] {
  return s().categories
}

export function guestAddCategory(category: Omit<Category, 'id'>): string {
  const id = `guest-cat-${Date.now()}`
  s().categories.push({ id, ...category })
  return id
}

export function guestUpdateCategory(id: string, data: Partial<Omit<Category, 'id'>>): void {
  const g = s()
  g.categories = g.categories.map(c => (c.id === id ? { ...c, ...data } : c))
}

export function guestDeleteCategory(id: string): void {
  const g = s()
  g.categories = g.categories.filter(c => c.id !== id)
}

// ─── PaymentMethods ───────────────────────────────────────────────────────────

export function guestGetPaymentMethods(): PaymentMethod[] {
  return s().paymentMethods
}

export function guestAddPaymentMethod(pm: Omit<PaymentMethod, 'id'>): string {
  const id = `guest-pm-${Date.now()}`
  s().paymentMethods.push({ id, ...pm })
  return id
}

export function guestDeletePaymentMethod(id: string): void {
  const g = s()
  g.paymentMethods = g.paymentMethods.filter(p => p.id !== id)
}

// ─── FixedCosts ───────────────────────────────────────────────────────────────

export function guestGetFixedCosts(): FixedCost[] {
  return s().fixedCosts
}

export function guestAddFixedCost(cost: Omit<FixedCost, 'id'>): string {
  const id = `guest-fc-${Date.now()}`
  s().fixedCosts.push({ id, ...cost })
  return id
}

export function guestUpdateFixedCost(id: string, data: Partial<Omit<FixedCost, 'id'>>): void {
  const g = s()
  g.fixedCosts = g.fixedCosts.map(c => (c.id === id ? { ...c, ...data } : c))
}

export function guestDeleteFixedCost(id: string): void {
  const g = s()
  g.fixedCosts = g.fixedCosts.filter(c => c.id !== id)
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export function guestGetBudget(yearMonth: string): Record<string, number> {
  return s().budgets[yearMonth] ?? {}
}

export function guestUpdateBudget(yearMonth: string, categoryId: string, amount: number): void {
  const g = s()
  g.budgets[yearMonth] = { ...(g.budgets[yearMonth] ?? {}), [categoryId]: amount }
}

// ─── CfPlan ───────────────────────────────────────────────────────────────────

export function guestGetCfPlan(): CfPlan {
  return s().cfPlan
}

export function guestSaveCfPlan(plan: CfPlan): void {
  s().cfPlan = plan
}

export function guestAppendCfLifeEvent(year: number, text: string): void {
  const plan = s().cfPlan
  const key = String(year)
  const existing = plan.lifeEvents?.[key]
  plan.lifeEvents = {
    ...(plan.lifeEvents ?? {}),
    [key]: existing ? `${existing} / ${text}` : text,
  }
}

// ─── BalanceSheet ─────────────────────────────────────────────────────────────

export function guestGetBalanceSheet(): BalanceSheet {
  return s().balanceSheet
}

export function guestSaveBalanceSheet(data: BalanceSheet): void {
  s().balanceSheet = data
}

// ─── IncomeStatement ──────────────────────────────────────────────────────────

export function guestGetIncomeStatement(): IncomeStatement {
  return s().incomeStatement
}

export function guestSaveIncomeStatement(data: IncomeStatement): void {
  s().incomeStatement = data
}

// ─── ShoppingItems ────────────────────────────────────────────────────────────

export function guestGetShoppingItems(): ShoppingItem[] {
  return s().shoppingItems
}

export function guestAddShoppingItem(item: Omit<ShoppingItem, 'id'>): string {
  const id = `guest-si-${Date.now()}`
  s().shoppingItems.push({ id, ...item })
  return id
}

export function guestUpdateShoppingItem(id: string, data: Partial<Omit<ShoppingItem, 'id'>>): void {
  const g = s()
  g.shoppingItems = g.shoppingItems.map(i => (i.id === id ? { ...i, ...data } : i))
}

export function guestDeleteShoppingItem(id: string): void {
  const g = s()
  g.shoppingItems = g.shoppingItems.filter(i => i.id !== id)
}

export function guestDeleteCheckedShoppingItems(ids: string[]): void {
  const g = s()
  g.shoppingItems = g.shoppingItems.filter(i => !ids.includes(i.id))
}

// ─── HouseholdTasks ───────────────────────────────────────────────────────────

export function guestGetHouseholdTasks(): HouseholdTask[] {
  return s().householdTasks
}

export function guestAddHouseholdTask(task: Omit<HouseholdTask, 'id'>): string {
  const id = `guest-ht-${Date.now()}`
  s().householdTasks.push({ id, ...task })
  return id
}

export function guestUpdateHouseholdTask(id: string, data: Partial<Omit<HouseholdTask, 'id'>>): void {
  const g = s()
  g.householdTasks = g.householdTasks.map(t => (t.id === id ? { ...t, ...data } : t))
}

export function guestDeleteHouseholdTask(id: string): void {
  const g = s()
  g.householdTasks = g.householdTasks.filter(t => t.id !== id)
}

// ─── Generic Collections ──────────────────────────────────────────────────────

type CollectionKey = keyof GuestStoreData['collections']

export function guestGetCollection<T>(subPath: string): T[] {
  const key = subPath as CollectionKey
  return (s().collections[key] ?? []) as T[]
}

export function guestAddCollectionItem<T extends { id: string }>(
  subPath: string,
  data: Omit<T, 'id'>,
): string {
  const id = `guest-${subPath}-${Date.now()}`
  const key = subPath as CollectionKey
  const col = s().collections
  ;(col[key] as unknown[]).push({ id, ...data })
  return id
}

export function guestUpdateCollectionItem(
  subPath: string,
  id: string,
  data: Record<string, unknown>,
): void {
  const col = s().collections
  const key = subPath as CollectionKey
  const updated = (col[key] as Array<{ id: string }>).map(item =>
    item.id === id ? { ...item, ...data } : item,
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(col as any)[key] = updated
}

export function guestRemoveCollectionItem(subPath: string, id: string): void {
  const col = s().collections
  const key = subPath as CollectionKey
  const filtered = (col[key] as Array<{ id: string }>).filter(item => item.id !== id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(col as any)[key] = filtered
}

// ─── SavingsAccounts / SecuritiesAccounts（特殊メソッド用） ──────────────────

export function guestGetSavingsAccounts(): SavingsAccount[] {
  return s().collections.savingsAccounts
}

export function guestGetSecuritiesAccounts(): SecuritiesAccount[] {
  return s().collections.securitiesAccounts
}

export function guestUpdateSavingsAccount(id: string, data: Partial<Omit<SavingsAccount, 'id'>>): void {
  guestUpdateCollectionItem('savingsAccounts', id, data as Record<string, unknown>)
}

export function guestUpdateSecuritiesAccount(
  id: string,
  data: Partial<Omit<SecuritiesAccount, 'id'>>,
): void {
  guestUpdateCollectionItem('securitiesAccounts', id, data as Record<string, unknown>)
}

export function guestGetSavingsGoals(): SavingsGoal[] {
  return s().collections.savingsGoals
}

export function guestUpdateSavingsGoal(id: string, data: Partial<Omit<SavingsGoal, 'id'>>): void {
  guestUpdateCollectionItem('savingsGoals', id, data as Record<string, unknown>)
}

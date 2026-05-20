export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  categoryId: string
  paymentMethodId?: string
  date: string
  memo: string
}

// Firestore: months/{yyyy-MM}
export interface MonthDocument {
  year: number
  month: number
  transactions: Transaction[]
}

// Firestore: categories/{docId}
export interface Category {
  id: string
  name: string
  type: TransactionType
  expenseType?: 'fixed' | 'variable'
  color: string
  order: number
}

// Firestore: paymentMethods/{docId}
export interface PaymentMethod {
  id: string
  name: string
  order: number
}

// ─── Fixed Costs ──────────────────────────────────────────────────────────────

export type FixedCostFrequency = 'monthly' | 'yearly' | 'every2years' | 'every3years'

export interface FixedCost {
  id: string
  name: string
  frequency?: FixedCostFrequency  // undefined は 'monthly' として扱う（既存データ互換）
  dayOfMonth: number               // 引き落とし日（1-31）
  month?: number                   // 発生月（1-12）: yearly/every2years/every3years で使用
  baseYear?: number                // 基準年: every2years/every3years のサイクル計算に使用
  amount: number
  isVariable?: boolean
  paymentMethod: string
  memo?: string
  order: number
}

// ─── Shopping & Household Tasks ──────────────────────────────────────────────

export interface ShoppingItem {
  id: string
  name: string
  checked: boolean
  order: number
}

export interface HouseholdTask {
  id: string
  name: string
  assignee?: string
  dueDate?: string
  isRecurring: boolean
  recurrenceType?: 'daily' | 'weekly' | 'monthly'
  isCompleted: boolean
  completedAt?: string | undefined
  order: number
}

// ─── Savings Goals ───────────────────────────────────────────────────────────

export interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  targetYear?: number
  currentAmount: number
  color: string
  memo?: string
  order: number
  contributions: Record<string, number>  // "yyyy-MM" → amount
}

// ─── Savings Accounts ────────────────────────────────────────────────────────

export interface SavingsAccount {
  id: string
  name: string
  owner?: string        // 名義人（例: 夫、妻）
  color: string
  memo?: string
  order: number
  currentAmount: number
  lastUpdated: string   // "yyyy-MM-dd"
}

// ─── Securities Accounts ─────────────────────────────────────────────────────

export type SecuritiesAccountType = 'specific' | 'nisa' | 'ideco' | 'foreign' | 'other'

export interface SecuritiesAccount {
  id: string
  name: string
  owner?: string        // 名義人（例: 夫、妻）
  broker?: string
  accountType?: SecuritiesAccountType
  color: string
  memo?: string
  order: number
  currentValue: number
  monthlyValues: Record<string, number>  // "yyyy-MM" → 評価額
}

// ─── Contracts ───────────────────────────────────────────────────────────────

export type ContractType = 'subscription' | 'insurance' | 'loan' | 'other'
export type PaymentFrequency = 'monthly' | 'yearly'

export interface Contract {
  id: string
  name: string
  contractType: ContractType
  amount: number
  frequency: PaymentFrequency
  renewalDate?: string    // yyyy-MM-dd
  paymentMethod?: string
  startDate?: string      // yyyy-MM-dd
  isAutoRenew: boolean
  memo?: string
  order: number
}

// ─── Income Statement ────────────────────────────────────────────────────────

export type DeductionCategory = 'income_tax' | 'resident_tax' | 'social_insurance' | 'other_deduction'

export interface IncomeStatementDeductionItem {
  id: string
  name: string
  category: DeductionCategory
  amount: number
}

// Firestore: incomeStatements/{year}
export interface IncomeStatement {
  year: number
  incomeOverrides: Record<string, number>    // categoryId -> override amount
  deductions: IncomeStatementDeductionItem[]
  expenseOverrides: Record<string, number>   // categoryId -> override amount
}

// ─── Balance Sheet ────────────────────────────────────────────────────────────

export type AssetSection = 'current' | 'financial' | 'fixed'
export type LiabilitySection = 'short' | 'long'

export interface AssetItem {
  id: string
  section: AssetSection
  name: string
  amount: number
  order: number
  note?: string | undefined
}

export interface LiabilityItem {
  id: string
  section: LiabilitySection
  name: string
  amount: number
  order: number
  note?: string | undefined
}

// Firestore: balanceSheets/{year}
export interface BalanceSheet {
  year: number
  assets: AssetItem[]
  liabilities: LiabilityItem[]
}

// ─── CF Plan ──────────────────────────────────────────────────────────────────

export interface CfMember {
  id: string
  name: string
  birthYear: number
  role?: string | undefined
}

export interface CfItem {
  id: string
  name: string
  rate: number        // 変動率 (%)
  order: number
  values: Record<string, number>  // year string -> amount (万円)
}

// Firestore: cfPlan/main
export interface CfPlan {
  startYear: number
  initialSavings: number  // 万円
  members: CfMember[]
  incomeItems: CfItem[]
  expenseItems: CfItem[]
  lifeEvents?: Record<string, string>
}

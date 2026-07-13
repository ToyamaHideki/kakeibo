export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  categoryId: string
  paymentMethodId?: string
  date: string
  memo: string
  // 登録日時（Unix ms）。「入力順」表示の真の時系列ソートに使用する。
  // 既存レコードは未設定の場合があり、その場合は配列順をフォールバックに使う。
  createdAt?: number
  // 月別収支の「今月予定の固定費」セクションから入力された場合に、元の固定費 id を保持する。
  // この紐付けにより、入力済みの固定費を予定一覧から「入力済み」として区別する。
  fixedCostId?: string
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
  skippedMonths?: string[]         // 月別収支での「今月はスキップ」("yyyy-MM" の配列)
}

// ─── Shopping & Household Tasks ──────────────────────────────────────────────

export interface ShoppingItem {
  id: string
  name: string
  checked: boolean
  order: number
  category?: string  // 売り場カテゴリ（未設定=未分類）
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

export type SecuritiesHoldingCategory =
  | 'mutual_fund'        // 投資信託
  | 'domestic_stock'     // 国内株式
  | 'foreign_stock'      // 国外株式
  | 'bond'               // 債券
  | 'reit'               // REIT
  | 'crypto'             // 仮想通貨
  | 'other'              // その他

export interface SecuritiesHolding {
  id: string
  name: string
  category: SecuritiesHoldingCategory
  memo?: string
  order: number
  // 「商品ごとに記録」モードで入力された月次評価額。
  // 最新月の値が商品の現在評価額として扱われる（UIで派生表示）。
  monthlyValues?: Record<string, number>
}

// 公開範囲:
// - 'shared': 世帯メンバー全員に表示（households/{hid}/securitiesAccounts に保存）
// - 'private': 作成者本人のみ表示（users/{uid}/privateSecuritiesAccounts に保存）
// 永続化はしないがフック層で取得元に応じて付与する derived フィールド。
export type SecuritiesVisibility = 'shared' | 'private'

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
  // ── 拡張フィールド（既存ドキュメントは未設定の可能性あり）
  unrealizedPnL?: number                  // 口座全体の評価損益（任意）
  holdings?: SecuritiesHolding[]          // 保有商品（任意、付随情報）
  visibility?: SecuritiesVisibility       // フック層で derive。保存はしない
}

// ─── Contracts ───────────────────────────────────────────────────────────────

export type ContractType = 'subscription' | 'insurance' | 'loan' | 'other'
export type PaymentFrequency = 'monthly' | 'yearly'
export type ContractScope = 'shared' | 'personal'

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
  scope?: ContractScope   // 未設定は 'shared' とみなす（既存データ互換）
  owner?: string          // scope==='personal' のとき作成者 uid
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

// ─── Transaction List Display Mode ───────────────────────────────────────────

export type TransactionListDisplayMode = 'date' | 'category' | 'input'

// ─── Budget ───────────────────────────────────────────────────────────────────

export type BudgetMap = Record<string, number>  // categoryId → amount

// ─── Health ──────────────────────────────────────────────────────────────────

// 公開範囲:
// - 'shared': 世帯メンバー全員に表示（households/{hid}/healthMetrics に保存）
// - 'private': 作成者本人のみ表示（users/{uid}/privateHealthMetrics に保存）
// 日次レコードも metric の visibility に従い、対応するストレージへ保存する。
export type HealthVisibility = 'shared' | 'private'

// 体重計などで測定する項目の定義。
// 機種により取得項目が異なるためユーザー定義制とする（体重 / 体脂肪率 / 筋肉量 / 骨量 等）。
export interface HealthMetric {
  id: string
  name: string                       // 例: "体重"
  unit: string                       // 例: "kg" / "%" / "歳"
  decimalPlaces: number              // 0〜2
  color: string                      // チャート色 #rrggbb
  order: number
  visibility: HealthVisibility
  // 所有者の uid（誰の測定項目か）。世帯メンバーの中から選択。
  // 未指定はレガシーデータ（旧仕様）。UI では「全員」フィルターにのみ表示される。
  ownerUid?: string | undefined
  memo?: string | undefined
}

// 日次の記録。1日に複数 metric の値をまとめて保持する。
// shared / private はパスが完全に分かれるため、同 date に両方の値があれば
// 物理的には 2 ドキュメントになる（UI 上は date キーでマージ表示）。
export interface HealthDailyRecord {
  id: string                                   // 通常は date と同じ
  date: string                                 // "yyyy-MM-dd"
  valuesByMetricId: Record<string, number>     // metric.id → 数値
  memo?: string | undefined
  visibility: HealthVisibility
}

// ─── Announcements ────────────────────────────────────────────────────────────

// Firestore: announcements/{docId}（全ユーザー共通リリースノート、読み取り専用）
export interface Announcement {
  id: string
  version: string         // 例: "1.0000"
  title: string           // 例: "Ver 1.0000 リリース"
  content: string         // 本文（改行を whitespace-pre-line で保持）
  releasedAt: number      // タイムスタンプ（ミリ秒）
  order: number           // 同日複数件の表示順
}

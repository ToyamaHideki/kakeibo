import type {
  BalanceSheet,
  Category,
  CfPlan,
  Contract,
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

// ─── カテゴリ（世帯・個人共通） ────────────────────────────────────────────────

export const GUEST_CATEGORIES: Category[] = [
  { id: 'cat-food',      name: '食費',       type: 'expense', expenseType: 'variable', color: '#f97316', order: 1 },
  { id: 'cat-eating',    name: '外食',       type: 'expense', expenseType: 'variable', color: '#fb923c', order: 2 },
  { id: 'cat-transport', name: '交通費',     type: 'expense', expenseType: 'variable', color: '#3b82f6', order: 3 },
  { id: 'cat-utility',   name: '光熱費',     type: 'expense', expenseType: 'fixed',    color: '#eab308', order: 4 },
  { id: 'cat-comm',      name: '通信費',     type: 'expense', expenseType: 'variable', color: '#8b5cf6', order: 5 },
  { id: 'cat-fcomm',     name: '固定通信費', type: 'expense', expenseType: 'fixed',    color: '#6366f1', order: 6 },
  { id: 'cat-daily',     name: '日用品',     type: 'expense', expenseType: 'variable', color: '#06b6d4', order: 7 },
  { id: 'cat-medical',   name: '医療費',     type: 'expense', expenseType: 'variable', color: '#ef4444', order: 8 },
  { id: 'cat-entertain', name: '娯楽',       type: 'expense', expenseType: 'variable', color: '#ec4899', order: 9 },
  { id: 'cat-clothes',   name: '衣服',       type: 'expense', expenseType: 'variable', color: '#a855f7', order: 10 },
  { id: 'cat-other-exp', name: 'その他',     type: 'expense', expenseType: 'variable', color: '#9ca3af', order: 11 },
  { id: 'cat-salary',    name: '給与',       type: 'income',  color: '#10b981', order: 1 },
  { id: 'cat-bonus',     name: '賞与',       type: 'income',  color: '#059669', order: 2 },
  { id: 'cat-side',      name: '副収入',     type: 'income',  color: '#34d399', order: 3 },
  { id: 'cat-other-inc', name: 'その他',     type: 'income',  color: '#9ca3af', order: 4 },
]

export const GUEST_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'pm-cash',   name: '現金',             order: 1 },
  { id: 'pm-credit', name: 'クレジットカード', order: 2 },
  { id: 'pm-emoney', name: '電子マネー',       order: 3 },
  { id: 'pm-qr',     name: 'QRコード決済',     order: 4 },
  { id: 'pm-bank',   name: '銀行振込',         order: 5 },
]

// ─── 個人カテゴリ・支払い方法 ────────────────────────────────────────────────

export const GUEST_PERSONAL_CATEGORIES: Category[] = [
  { id: 'pcat-lunch',    name: '昼食',     type: 'expense', expenseType: 'variable', color: '#f59e0b', order: 1 },
  { id: 'pcat-hobby',    name: '趣味',     type: 'expense', expenseType: 'variable', color: '#8b5cf6', order: 2 },
  { id: 'pcat-beauty',   name: '美容',     type: 'expense', expenseType: 'variable', color: '#ec4899', order: 3 },
  { id: 'pcat-drink',    name: '飲み代',   type: 'expense', expenseType: 'variable', color: '#f97316', order: 4 },
  { id: 'pcat-other',    name: 'その他',   type: 'expense', expenseType: 'variable', color: '#9ca3af', order: 5 },
  { id: 'pcat-salary',   name: '給与',     type: 'income',  color: '#10b981', order: 1 },
]

export const GUEST_PERSONAL_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'ppm-cash',   name: '現金',   order: 1 },
  { id: 'ppm-credit', name: 'カード', order: 2 },
  { id: 'ppm-qr',     name: 'QR決済', order: 3 },
]

// ─── 固定費 ──────────────────────────────────────────────────────────────────

export const GUEST_FIXED_COSTS: FixedCost[] = [
  { id: 'fc-1', name: '家賃',         frequency: 'monthly',  dayOfMonth: 27, amount: 85000, isVariable: false, paymentMethod: '銀行振込',         memo: '',       order: 1 },
  { id: 'fc-2', name: '電気代',       frequency: 'monthly',  dayOfMonth: 10, amount: 8500,  isVariable: true,  paymentMethod: '口座振替',         memo: '',       order: 2 },
  { id: 'fc-3', name: 'ガス代',       frequency: 'monthly',  dayOfMonth: 12, amount: 4200,  isVariable: true,  paymentMethod: '口座振替',         memo: '',       order: 3 },
  { id: 'fc-4', name: 'スポーツジム', frequency: 'monthly',  dayOfMonth: 1,  amount: 8800,  isVariable: false, paymentMethod: 'クレジットカード', memo: '',       order: 4 },
  { id: 'fc-5', name: '自動車保険',   frequency: 'yearly',   dayOfMonth: 20, month: 4,      amount: 55000, isVariable: false, paymentMethod: '銀行振込', memo: '', order: 5 },
]

// ─── 月別予算 ─────────────────────────────────────────────────────────────────

export const GUEST_BUDGET: Record<string, number> = {
  'cat-food':      35000,
  'cat-eating':    15000,
  'cat-transport':  8000,
  'cat-utility':   10000,
  'cat-comm':       5000,
  'cat-fcomm':      3000,
  'cat-daily':      8000,
  'cat-medical':    5000,
  'cat-entertain':  10000,
  'cat-clothes':    10000,
  'cat-other-exp':   5000,
}

// ─── 貯蓄目標 ─────────────────────────────────────────────────────────────────

export const GUEST_SAVINGS_GOALS: SavingsGoal[] = [
  {
    id: 'sg-1',
    name: '旅行積立（海外）',
    targetAmount: 300000,
    targetYear: new Date().getFullYear() + 1,
    currentAmount: 125000,
    color: '#3b82f6',
    memo: 'ヨーロッパ旅行用',
    order: 1,
    contributions: {},
  },
  {
    id: 'sg-2',
    name: '緊急予備費',
    targetAmount: 1000000,
    currentAmount: 430000,
    color: '#10b981',
    memo: '生活費6ヶ月分を目標',
    order: 2,
    contributions: {},
  },
]

// ─── 貯蓄口座 ─────────────────────────────────────────────────────────────────

export const GUEST_SAVINGS_ACCOUNTS: SavingsAccount[] = [
  {
    id: 'sa-1',
    name: '普通預金',
    owner: '本人',
    color: '#3b82f6',
    memo: 'メインバンク',
    order: 1,
    currentAmount: 1850000,
    lastUpdated: (() => { const d = new Date(); return d.toISOString().split('T')[0] })(),
  },
  {
    id: 'sa-2',
    name: '定期預金',
    owner: '本人',
    color: '#8b5cf6',
    memo: '1年定期',
    order: 2,
    currentAmount: 500000,
    lastUpdated: (() => { const d = new Date(); return d.toISOString().split('T')[0] })(),
  },
]

// ─── 証券口座 ─────────────────────────────────────────────────────────────────

function buildSecuritiesMonthlyValues(): Record<string, number> {
  const values: Record<string, number> = {}
  const today = new Date()
  for (let i = 2; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const base = 850000
    values[ym] = base + (2 - i) * 25000 + Math.floor(Math.random() * 10000 - 5000)
  }
  return values
}

export const GUEST_SECURITIES_ACCOUNTS: SecuritiesAccount[] = [
  {
    id: 'sec-1',
    name: 'NISA口座（投資信託）',
    owner: '本人',
    broker: 'SBI証券',
    accountType: 'nisa',
    color: '#f97316',
    memo: 'eMAXIS Slim 全世界株式',
    order: 1,
    currentValue: 920000,
    monthlyValues: buildSecuritiesMonthlyValues(),
  },
]

// ─── 契約 ────────────────────────────────────────────────────────────────────

export const GUEST_CONTRACTS: Contract[] = [
  {
    id: 'ct-1',
    name: 'Netflix',
    contractType: 'subscription',
    amount: 1490,
    frequency: 'monthly',
    paymentMethod: 'クレジットカード',
    isAutoRenew: true,
    memo: 'スタンダード',
    order: 1,
  },
  {
    id: 'ct-2',
    name: 'Spotify',
    contractType: 'subscription',
    amount: 980,
    frequency: 'monthly',
    paymentMethod: 'クレジットカード',
    isAutoRenew: true,
    memo: 'プレミアム',
    order: 2,
  },
  {
    id: 'ct-3',
    name: '生命保険',
    contractType: 'insurance',
    amount: 15800,
    frequency: 'monthly',
    paymentMethod: '口座振替',
    isAutoRenew: false,
    renewalDate: `${new Date().getFullYear() + 3}-03-01`,
    memo: '終身保険',
    order: 3,
  },
  {
    id: 'ct-4',
    name: '自動車ローン',
    contractType: 'loan',
    amount: 28000,
    frequency: 'monthly',
    paymentMethod: '口座振替',
    isAutoRenew: false,
    startDate: `${new Date().getFullYear() - 2}-04-01`,
    memo: '残り36回',
    order: 4,
  },
]

// ─── 買い物リスト ─────────────────────────────────────────────────────────────

export const GUEST_SHOPPING_ITEMS: ShoppingItem[] = [
  { id: 'si-1', name: '牛乳',               checked: false, order: 1 },
  { id: 'si-2', name: 'トイレットペーパー', checked: false, order: 2 },
  { id: 'si-3', name: '卵',                 checked: false, order: 3 },
  { id: 'si-4', name: '洗剤（食器用）',     checked: true,  order: 4 },
  { id: 'si-5', name: 'シャンプー',         checked: true,  order: 5 },
]

// ─── 家事タスク ───────────────────────────────────────────────────────────────

function daysFromToday(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export const GUEST_HOUSEHOLD_TASKS: HouseholdTask[] = [
  {
    id: 'ht-1',
    name: '掃除機がけ',
    isRecurring: true,
    recurrenceType: 'weekly',
    dueDate: daysFromToday(2),
    isCompleted: false,
    order: 1,
  },
  {
    id: 'ht-2',
    name: 'ゴミ出し（燃えるごみ）',
    isRecurring: true,
    recurrenceType: 'weekly',
    dueDate: daysFromToday(1),
    isCompleted: false,
    order: 2,
  },
  {
    id: 'ht-3',
    name: '洗濯・乾燥',
    isRecurring: false,
    isCompleted: false,
    order: 3,
  },
  {
    id: 'ht-4',
    name: '浴室清掃',
    isRecurring: true,
    recurrenceType: 'monthly',
    isCompleted: true,
    completedAt: new Date().toISOString(),
    order: 4,
  },
]

// ─── キャッシュフロープラン ───────────────────────────────────────────────────

export function buildGuestCfPlan(): CfPlan {
  const y = new Date().getFullYear()
  return {
    startYear: y,
    initialSavings: 350,
    members: [
      { id: 'cm-1', name: '本人',   birthYear: 1990, role: '本人' },
      { id: 'cm-2', name: '配偶者', birthYear: 1992, role: '配偶者' },
    ],
    incomeItems: [
      {
        id: 'ci-1',
        name: '給与収入（本人）',
        rate: 2,
        order: 1,
        values: { [String(y)]: 420, [String(y + 1)]: 435, [String(y + 3)]: 460 },
      },
      {
        id: 'ci-2',
        name: '給与収入（配偶者）',
        rate: 1,
        order: 2,
        values: { [String(y)]: 280, [String(y + 1)]: 290 },
      },
    ],
    expenseItems: [
      {
        id: 'ce-1',
        name: '基本生活費',
        rate: 1,
        order: 1,
        values: { [String(y)]: 240 },
      },
      {
        id: 'ce-2',
        name: '住居費',
        rate: 0,
        order: 2,
        values: { [String(y)]: 102 },
      },
      {
        id: 'ce-3',
        name: '保険料',
        rate: 0,
        order: 3,
        values: { [String(y)]: 19 },
      },
      {
        id: 'ce-4',
        name: '教育費',
        rate: 0,
        order: 4,
        values: { [String(y + 5)]: 60 },
      },
      {
        id: 'ce-5',
        name: 'その他・一時支出',
        rate: 0,
        order: 5,
        values: { [String(y + 2)]: 300 },
      },
    ],
    lifeEvents: {
      [String(y + 2)]: 'マイホーム購入検討',
      [String(y + 5)]: '子供 小学校入学',
      [String(y + 10)]: '子供 高校入学',
    },
  }
}

// ─── バランスシート ───────────────────────────────────────────────────────────

export function buildGuestBalanceSheet(): BalanceSheet {
  return {
    year: new Date().getFullYear(),
    assets: [
      { id: 'a-1', section: 'current',   name: '普通預金',   amount: 1850000, order: 1 },
      { id: 'a-2', section: 'current',   name: '定期預金',   amount: 500000,  order: 2 },
      { id: 'a-3', section: 'financial', name: 'NISA（投信）', amount: 920000, order: 1 },
      { id: 'a-4', section: 'financial', name: 'iDeCo',       amount: 380000, order: 2 },
      { id: 'a-5', section: 'fixed',     name: '自動車',      amount: 800000, order: 1 },
    ],
    liabilities: [
      { id: 'l-1', section: 'short', name: 'クレジットカード残高', amount: 92000,   order: 1 },
      { id: 'l-2', section: 'long',  name: '自動車ローン残高',     amount: 1008000, order: 1 },
    ],
  }
}

// ─── 収支確認表 ───────────────────────────────────────────────────────────────

export function buildGuestIncomeStatement(): IncomeStatement {
  return {
    year: new Date().getFullYear(),
    incomeOverrides: {},
    deductions: [
      { id: 'ded-1', name: '所得税',     category: 'income_tax',       amount: 180000 },
      { id: 'ded-2', name: '住民税',     category: 'resident_tax',     amount: 224000 },
      { id: 'ded-3', name: '社会保険料', category: 'social_insurance', amount: 564000 },
    ],
    expenseOverrides: {},
  }
}

// ─── 月別トランザクション ─────────────────────────────────────────────────────

function ym(offset: number): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function tx(
  n: number,
  monthOffset: number,
  day: number,
  type: 'income' | 'expense',
  amount: number,
  categoryId: string,
  paymentMethodId: string,
  memo = '',
): Transaction {
  const yearMonth = ym(monthOffset)
  return {
    id: `guest-tx-${monthOffset < 0 ? 'prev' + Math.abs(monthOffset) : 'cur'}-${n}`,
    type,
    amount,
    categoryId,
    paymentMethodId,
    date: `${yearMonth}-${String(day).padStart(2, '0')}`,
    memo,
  }
}

function buildMonthlyData(monthOffset: number): MonthDocument {
  const yearMonth = ym(monthOffset)
  const [y, m] = yearMonth.split('-').map(Number)

  const base: Transaction[] = [
    tx(1,  monthOffset, 25, 'income',  300000, 'cat-salary',    'pm-bank',   `${m}月分給与`),
    tx(2,  monthOffset,  3, 'expense',  8500,  'cat-food',      'pm-credit', 'スーパー'),
    tx(3,  monthOffset,  5, 'expense',  3200,  'cat-food',      'pm-qr',     'コンビニ'),
    tx(4,  monthOffset,  7, 'expense',  4800,  'cat-eating',    'pm-credit', 'ランチ・夕食'),
    tx(5,  monthOffset,  9, 'expense',  6500,  'cat-food',      'pm-credit', 'スーパー'),
    tx(6,  monthOffset, 10, 'expense',  8500,  'cat-utility',   'pm-bank',   '電気代'),
    tx(7,  monthOffset, 12, 'expense',  4200,  'cat-utility',   'pm-bank',   'ガス代'),
    tx(8,  monthOffset, 12, 'expense',  4800,  'cat-food',      'pm-qr',     '週末の買い出し'),
    tx(9,  monthOffset, 14, 'expense',  2800,  'cat-eating',    'pm-cash',   '外食'),
    tx(10, monthOffset, 15, 'expense',  2480,  'cat-fcomm',     'pm-credit', 'スマホ代'),
    tx(11, monthOffset, 16, 'expense',  3900,  'cat-transport', 'pm-emoney', '交通費'),
    tx(12, monthOffset, 18, 'expense',  5200,  'cat-food',      'pm-credit', 'スーパー週末'),
    tx(13, monthOffset, 20, 'expense',  3800,  'cat-daily',     'pm-credit', '日用品まとめ買い'),
    tx(14, monthOffset, 21, 'expense',  3600,  'cat-eating',    'pm-cash',   '友人との食事'),
    tx(15, monthOffset, 23, 'expense',  1800,  'cat-transport', 'pm-emoney', '交通費'),
    tx(16, monthOffset, 25, 'expense',  5800,  'cat-food',      'pm-credit', 'スーパー'),
    tx(17, monthOffset, 27, 'expense', 85000,  'cat-other-exp', 'pm-bank',   '家賃'),
    tx(18, monthOffset, 28, 'expense',  2200,  'cat-comm',      'pm-credit', '動画配信サービス'),
  ]

  if (monthOffset === -1) {
    base.push(tx(19, monthOffset, 15, 'income', 60000, 'cat-bonus', 'pm-bank', '特別賞与'))
    base.push(tx(20, monthOffset, 8,  'expense', 18000, 'cat-clothes', 'pm-credit', '春物衣料'))
    base.push(tx(21, monthOffset, 20, 'expense',  9800, 'cat-entertain', 'pm-credit', 'テーマパーク'))
  }
  if (monthOffset === -2) {
    base.push(tx(19, monthOffset, 12, 'expense', 4500, 'cat-medical',   'pm-cash',   '病院・薬代'))
    base.push(tx(20, monthOffset, 18, 'expense', 6200, 'cat-entertain', 'pm-credit', '映画・書籍'))
  }

  return { year: y, month: m, transactions: base }
}

// ─── 個人支出 ─────────────────────────────────────────────────────────────────

function personalTx(
  n: number,
  monthOffset: number,
  day: number,
  type: 'income' | 'expense',
  amount: number,
  categoryId: string,
  paymentMethodId: string,
  memo = '',
): Transaction {
  return {
    id: `guest-personal-tx-${monthOffset < 0 ? 'prev' : 'cur'}-${n}`,
    type,
    amount,
    categoryId,
    paymentMethodId,
    date: `${ym(monthOffset)}-${String(day).padStart(2, '0')}`,
    memo,
  }
}

function buildPersonalMonthlyData(monthOffset: number): MonthDocument {
  const yearMonth = ym(monthOffset)
  const [y, m] = yearMonth.split('-').map(Number)
  const transactions: Transaction[] = [
    personalTx(1, monthOffset, 25, 'income',  250000, 'pcat-salary', 'ppm-credit', '給与（手取り）'),
    personalTx(2, monthOffset,  4, 'expense',   850,  'pcat-lunch',  'ppm-qr',    '弁当'),
    personalTx(3, monthOffset,  6, 'expense',   920,  'pcat-lunch',  'ppm-qr',    '社員食堂'),
    personalTx(4, monthOffset,  9, 'expense',  3200,  'pcat-hobby',  'ppm-credit', '書籍'),
    personalTx(5, monthOffset, 12, 'expense',   780,  'pcat-lunch',  'ppm-cash',  'ランチ'),
    personalTx(6, monthOffset, 15, 'expense',  4800,  'pcat-beauty', 'ppm-credit', '美容室'),
    personalTx(7, monthOffset, 19, 'expense',  5500,  'pcat-drink',  'ppm-cash',  '飲み会'),
    personalTx(8, monthOffset, 22, 'expense',   650,  'pcat-lunch',  'ppm-qr',    'コンビニ'),
  ]
  return { year: y, month: m, transactions }
}

// ─── GuestStoreData 型 ────────────────────────────────────────────────────────

export interface GuestStoreData {
  monthlyData: Record<string, MonthDocument>
  personalMonthlyData: Record<string, MonthDocument>
  categories: Category[]
  paymentMethods: PaymentMethod[]
  fixedCosts: FixedCost[]
  budgets: Record<string, Record<string, number>>
  cfPlan: CfPlan
  balanceSheet: BalanceSheet
  incomeStatement: IncomeStatement
  shoppingItems: ShoppingItem[]
  householdTasks: HouseholdTask[]
  collections: {
    savingsGoals: SavingsGoal[]
    savingsAccounts: SavingsAccount[]
    securitiesAccounts: SecuritiesAccount[]
    contracts: Contract[]
  }
}

// ─── buildGuestData ───────────────────────────────────────────────────────────

export function buildGuestData(): GuestStoreData {
  const cur = ym(0)
  const prev1 = ym(-1)
  const prev2 = ym(-2)

  return {
    monthlyData: {
      [cur]:   buildMonthlyData(0),
      [prev1]: buildMonthlyData(-1),
      [prev2]: buildMonthlyData(-2),
    },
    personalMonthlyData: {
      [cur]:   buildPersonalMonthlyData(0),
      [prev1]: buildPersonalMonthlyData(-1),
    },
    categories:     GUEST_CATEGORIES,
    paymentMethods: GUEST_PAYMENT_METHODS,
    fixedCosts:     GUEST_FIXED_COSTS,
    budgets: {
      [cur]:   GUEST_BUDGET,
      [prev1]: GUEST_BUDGET,
      [prev2]: GUEST_BUDGET,
    },
    cfPlan:          buildGuestCfPlan(),
    balanceSheet:    buildGuestBalanceSheet(),
    incomeStatement: buildGuestIncomeStatement(),
    shoppingItems:   GUEST_SHOPPING_ITEMS,
    householdTasks:  GUEST_HOUSEHOLD_TASKS,
    collections: {
      savingsGoals:       GUEST_SAVINGS_GOALS,
      savingsAccounts:    GUEST_SAVINGS_ACCOUNTS,
      securitiesAccounts: GUEST_SECURITIES_ACCOUNTS,
      contracts:          GUEST_CONTRACTS,
    },
  }
}

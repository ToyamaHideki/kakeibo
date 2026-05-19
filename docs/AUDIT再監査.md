# kakeibo 再監査レポート

**監査日**: 2026-05-18
**前回監査**: [`AUDIT.md`](./AUDIT.md)（2026-05-16）
**スコープ**: 前回監査後のリファクタリング結果と新規問題の検出
**監査者**: Claude Code（Sonnet 4.6）

---

## エグゼクティブサマリー

前回監査の Phase 1〜4 はおおむね完了しているが、リファクタリングで生じた**機能退行**と、AUDIT.md で「完了」とマークされたものの実態と乖離している項目を検出した。

| 領域 | 重大度 | 件数 |
|---|---|---|
| 新規ブロッキングバグ（機能退行） | **高** | 1件 |
| ESLint エラー（CI 阻害） | 中 | 2件 |
| 文字化け（コミット汚染） | 中 | 4ファイル |
| ゲストモードのデッド画面 | 中 | 1件 |
| 認証エラーの誤分岐 | 中 | 1件 |
| 既存所属の上書き | 中 | 1件 |
| AUDIT 完了マークと実態の乖離 | 中 | 2件 |
| 中途半端なリファクタ | 低 | 2件 |
| 設定の堅牢性不足 | 低 | 3件 |
| ユーティリティ重複 | 低 | 1件 |

---

## 改善ロードマップ（チェックリスト）

### Phase A：即時対応（今日中）

- [x] **A-1【高】招待コード入力フィールドを 10 文字に修正** → §1
  - `HouseholdSetupPage.tsx:113` の `maxLength={6}` → `maxLength={10}`
  - `HouseholdSetupPage.tsx:117` の `inviteCode.length < 6` → `< 10`
  - プレースホルダ "例：ABC123" を更新
  - 対応済み（2026-05-19 commit 287ec2d）
- [x] **A-2【中】ESLint エラー2件の解消** → §2
  - `useCfPlan.ts:76` の `_` 破棄パターン対応
  - `IncomeStatementPage.tsx:377` の全角スペース対応
  - 対応済み（2026-05-19 commit 287ec2d）

### Phase B：短期対応（1週間以内）

- [x] **B-1【中】文字化けコメントの清掃** → §3
  - `MonthlyPage.tsx` / `PersonalPage.tsx` / `ShoppingListPage.tsx` / `BudgetPage.tsx` の4ファイル（+ `MonthlyChart.tsx`）
  - 対応済み（2026-05-19 commit 8c21f74）
- [x] **B-2【中】ゲストモード PersonalPage の方針決定** → §4
  - 案内画面表示を選択：「世帯の月別収支とは別にお小遣い等の個人支出を管理できる」旨のメッセージ + ログイン誘導
  - 対応済み（2026-05-19 commit 113e908）
- [x] **B-3【中】useHousehold のエラー分岐に `'error'` 状態追加** → §5
  - `HouseholdState` に `'error'` を追加
  - エラー画面（再試行ボタン付き）を `Layout.tsx` に追加
  - 対応済み（2026-05-19 commit 9f10dee）
- [x] **B-4【中】joinHousehold の既存所属チェック** → §6
  - `fetchUserProfile` で既存 householdId を確認
  - 別世帯所属時は確認ダイアログを出す（`forceSwitch` フラグで明示的承認後のみ上書き）
  - 対応済み（2026-05-19 commit fe5eee0）

### Phase C：中期対応（2週間以内）

- [x] **C-1【中】フォーカストラップ実装** → §7.1
  - ネイティブ実装（外部ライブラリなし）で `BottomSheetModal.tsx` に組み込み
  - Tab/Shift+Tab のサイクル制御・モーダル開閉時のフォーカス移動・復元
  - 対応済み（2026-05-19 commit a2497b1）
- [x] **C-2【中】タップターゲット 44×44px 確保** → §7.2
  - `BottomSheetModal` 閉じるボタン：`w-8 h-8` → `min-w-[44px] min-h-[44px]`
  - `BottomNav` カテゴリボタン：`min-h-[44px] justify-center` を追加
  - 対応済み（2026-05-19 commit 0460ab6）
- [x] **C-3【中】useMonthlyData の React Query 化** → §8
  - `useMonthlyData` / `usePersonalMonthlyData` を `useQuery` に置換（staleTime: 30秒）
  - `reload()` は `queryClient.invalidateQueries` で実装
  - 副次効果：`exhaustive-deps` ESLint 警告2件が解消
  - 対応済み（2026-05-19 commit a344153）

### Phase D：長期対応（時間がある時）

- [ ] **D-1【低】tsconfig の strict オプション追加** → §9.1
  - `noUncheckedIndexedAccess` / `noImplicitReturns` / `exactOptionalPropertyTypes`
- [ ] **D-2【低】ESLint 強化** → §9.2
  - `eslint-plugin-jsx-a11y` / `eslint-plugin-import` / `no-explicit-any: 'error'`
- [ ] **D-3【低】AppCheck 初期化の失敗ハンドリング** → §9.3
  - `initializeAppCheck` を try/catch で囲む
- [ ] **D-4【低】ユーティリティ関数の重複解消** → §10
  - `currentYearMonth` / `formatYen` を `utils/` に集約
- [ ] **D-5【低】認証フロー周辺のテスト追加**
  - `HouseholdSetupPage` の招待コード入力テスト（今回の退行を検出できなかった原因）
  - `useHousehold` の状態遷移テスト
- [ ] **D-6【低】残る大規模ページの分割**
  - `SavingsGoalsPage.tsx` (526行) / `FixedCostsPage.tsx` (521行) / `BalanceSheetPage.tsx` (495行)

---

## 詳細所見

### 1. 【高】招待コードが入力できない（機能退行）

**証拠**:
- [`householdFirestore.ts:37`](../src/firebase/householdFirestore.ts) — `for (let i = 0; i < 10; i++)` で **10文字** の招待コードを生成
- [`HouseholdSetupPage.tsx:113`](../src/pages/HouseholdSetupPage.tsx) — `maxLength={6}`
- [`HouseholdSetupPage.tsx:117`](../src/pages/HouseholdSetupPage.tsx) — `inviteCode.length < 6`
- [`HouseholdSetupPage.tsx:108`](../src/pages/HouseholdSetupPage.tsx) — プレースホルダ "例：ABC123"（6文字）

**影響**: 新規発行された 10 文字の招待コードを誰も入力できない。Phase 3「招待コードを 10 文字に拡張」のリファクタで導入された明確な退行。

**根本原因**: 招待コードに関するテストが存在せず、生成側と入力側の対称性が機械的に検証できなかった。

---

### 2. 【中】ESLint エラー 2件

`npm run lint` 実行結果（2026-05-18）:
```
useCfPlan.ts:76         error  '_' is assigned a value but never used
IncomeStatementPage.tsx:377  error  Irregular whitespace not allowed
警告4件
✖ 6 problems (2 errors, 4 warnings)
```

**詳細**:
- `useCfPlan.ts:76` — `const { [String(year)]: _, ...rest } = item.values` の `_` 破棄パターンが `@typescript-eslint/no-unused-vars` に違反
- `IncomeStatementPage.tsx:377` — 全角スペース `　` を使った組版が `no-irregular-whitespace` に違反

**影響**: ビルド（tsc + vite build）は通るが `npm run lint` が失敗。CI を追加した瞬間に詰まる。

**修正方針**:
- ESLint 設定で `argsIgnorePattern: '^_'` を追加
- `no-irregular-whitespace: ['error', { skipJSXText: true }]` で JSX テキスト内の全角スペースを許容

---

### 3. 【中】文字化けコメントが4ファイルに残存

**証拠**: `Grep "タチE|チE��|ぁE"` で該当
- `MonthlyPage.tsx:63` — `// タチE�Eで年月ピチE��ーを開ぁE`（本来「タップで年月ピッカーを開く」）
- `PersonalPage.tsx`、`ShoppingListPage.tsx`、`BudgetPage.tsx` も同様

**原因推定**: ファイル保存時の Shift-JIS / UTF-8 変換ミス。コメントのみで実害はないが、ポートフォリオとして公開する以上は品質指標として清掃推奨。

---

### 4. 【中】ゲストモード：PersonalPage が空画面

**証拠**: [`PersonalPage.tsx:27`](../src/pages/PersonalPage.tsx)
```tsx
const { user } = useHousehold()
if (!user) return null
```

ゲストモードでは Firebase 認証していないため `user` は null → PersonalPage は空 div を返す。サイドバーから「個人収支」へ遷移すると真っ白に。

**さらに**: [`personalFirestore.ts`](../src/firebase/personalFirestore.ts) に `GUEST_HOUSEHOLD_ID` チェックが存在しない。`buildGuestData()` で `personalMonthlyData` を用意してあるのにアクセスする経路がない（デッドコード）。

**修正方針**: どちらかを選ぶ
- A. ゲストモードで個人ページを使えるよう実装（推奨：ポートフォリオなので体験できる方が良い）
- B. 非対応にする（サイドバー非表示 + guestData の personal データ削除）

---

### 5. 【中】認証エラーが「needs_setup」に誤分岐

**証拠**: [`useHousehold.ts:48-53`](../src/hooks/useHousehold.ts)
```typescript
} catch (err) {
  console.warn('[useHousehold] loadHousehold failed:', err)
  setHouseholdId(null)
  setPayDay(null)
  setState('needs_setup')
}
```

**問題**: ネットワークエラー・権限エラー・データ破損のいずれも `'needs_setup'` 扱い → 既存ユーザーが「新しい世帯を作成」画面に飛ばされる。「作成」を押すと旧世帯から切り離された新世帯が生まれ、データ復旧困難。

**推奨**:
- `HouseholdState` に `'error'` を追加
- エラー画面では「再試行」「ログアウト」のみ提供（世帯作成は出さない）

---

### 6. 【中】joinHousehold が既存所属を無告知で上書き

**証拠**: [`householdFirestore.ts:80`](../src/firebase/householdFirestore.ts)
```typescript
if (!data.memberIds.includes(uid)) {
  await updateDoc(...)
}
await saveUserProfile(uid, { householdId, displayName })  // ← 常に上書き
```

別世帯に所属している状態で別の招待コードに参加すると、`users/{uid}.householdId` が無確認で上書きされ、旧世帯にアクセスできなくなる（旧世帯側 `memberIds` には UID が残るため孤立データ化）。

**推奨**: `joinHousehold` 内で `fetchUserProfile` を呼び、既存 householdId と異なる場合は呼び出し元に "switch confirmation needed" を返してダイアログ確認させる。

---

### 7. 【中】a11y：AUDIT 完了マークと実態の乖離

#### 7.1 フォーカストラップが未実装

**証拠**: [`BottomSheetModal.tsx`](../src/components/BottomSheetModal.tsx) を確認したが、`focus-trap-react` 等のライブラリ依存はなく、Tab キー制御も実装されていない。

AUDIT.md Phase 4 では「TransactionModal / PersonalTransactionModal の重複解消・フォーカストラップ導入」が `[x]` でマークされているが、**実際には重複解消のみが行われ、フォーカストラップは未実装**。

#### 7.2 タップターゲットサイズ未対応

**証拠**: BottomNav の各種アイコンボタンが `w-7 h-7`（28×28px）のまま。iOS の推奨 44×44px を満たさない。

**推奨**:
- `focus-trap-react` 導入、`BottomSheetModal` に組み込み
- `min-w-[44px] min-h-[44px]` を共通ボタンクラスに付与
- AUDIT.md の完了マークを実態に合わせて訂正

---

### 8. 【中】useMonthlyData が React Query 化されていない

`useCategories` / `usePaymentMethods` は React Query 化されたが、[`useMonthlyData.ts`](../src/hooks/useMonthlyData.ts) と [`usePersonalMonthlyData.ts`](../src/hooks/usePersonalMonthlyData.ts) は `useState + useEffect` のまま。

AUDIT 原本の指摘「MonthlyPage → 削除 → MonthlyPage で fetchMonthData が2回走る」は実はこの2フックにこそ該当しており、React Query 導入は中途半端な状態。

**推奨**: `useQuery({ queryKey: ['monthData', householdId, yearMonth], staleTime: 30_000 })` で置換。給与日モードの場合は2ヶ月分を `useQueries` でフェッチ。

---

### 9. 【低】設定の堅牢性

#### 9.1 tsconfig に strict オプション追加

```jsonc
// tsconfig.app.json に追加
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": true,    // 配列・オブジェクトのインデックスアクセスが T | undefined に
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true   // undefined と未指定を区別
  }
}
```

`noUncheckedIndexedAccess` を入れると `transactions[0]` が `Transaction | undefined` 扱いになり、`item.values[String(year)]` のような無検証アクセスを TypeScript が検出する。今のコードでは数十箇所が破綻するため、段階的導入が必要。

#### 9.2 ESLint 強化

現状: `js.configs.recommended` + `tseslint.configs.recommended` + `react-hooks` のみ。

**追加すべき**:
- `eslint-plugin-jsx-a11y` — a11y チェック（コントラスト改善の自動化に有効）
- `eslint-plugin-import` — import 順序
- `@typescript-eslint/no-explicit-any: 'error'` — `any` 禁止

#### 9.3 AppCheck の失敗ハンドリング

**証拠**: [`firebase.ts:19-22`](../src/firebase/firebase.ts)
```typescript
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true,
})
```

try/catch なし。reCAPTCHA がロードできない環境（厳しい広告ブロッカー、企業プロキシ等）で初期化が失敗するとアプリ全体がクラッシュ。

**推奨**:
```typescript
try {
  initializeAppCheck(app, { ... })
} catch (err) {
  console.warn('[AppCheck] init failed:', err)
}
```

---

### 10. 【低】ユーティリティ関数の重複

- `currentYearMonth` → `utils/date.ts` と `SavingsGoalsPage.tsx:22` に同一実装
- `formatYen` → `SavingsGoalsPage.tsx:17` / `features/securitiesUtils.ts` / その他に類似実装

**推奨**: `utils/format.ts` に通貨フォーマット関数を集約。

---

## ✅ 改善された項目（評価ポイント）

前回監査からの改善は大きい。以下はすべて完了確認済み。

- ✅ コード分割：`App.tsx` で全ページ `React.lazy` 化
- ✅ ErrorBoundary：トップレベル配置
- ✅ React Query 導入：カテゴリ/支払方法のキャッシュ共有
- ✅ memberProfiles サブコレクション化：PII 漏洩遮断
- ✅ App Check 有効化：API 不正利用ブロック
- ✅ CRUD ジェネリック化：`createHouseholdCrud` で重複排除
- ✅ TransactionModal 統合：PersonalTransactionModal 廃止
- ✅ CashflowPage / SecuritiesAccountsPage 分割
- ✅ コントラスト改善（プレーンテキスト）
- ✅ npm audit 0件
- ✅ TypeScript strict mode 有効

---

## 監査メモ

### AUDIT.md の更新推奨箇所

以下の項目は AUDIT.md で `[x]` となっているが実態と乖離しているため、訂正推奨：

- Phase 4「モーダル共通化」→ 重複解消は完了したが**フォーカストラップは未実装**。完了マークを `[~]`（部分完了）にするか、別項目として残す
- Phase 3「招待コードを10文字に拡張」→ サーバ側の変更のみで**入力 UI が追従していない**ことを明記

### 再監査でカバーした領域

- Firestore セキュリティルール（変更なし、健全）
- 認証フロー（`useHousehold` / `signInWithGoogle` / `signInAsGuest`）
- ゲストモードの動線（PersonalPage の死角検出）
- ESLint / TypeScript / ビルド設定
- 文字エンコーディング（モジバケ検出）
- 各種ユーティリティ重複

### 再監査でカバーしていない領域

- 詳細な UI テスト（実機での操作確認）
- パフォーマンスプロファイリング（実測なし）
- セキュリティペネトレーションテスト
- ビジネスロジックの仕様正確性

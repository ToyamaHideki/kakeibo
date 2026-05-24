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

- [x] **D-1【低】tsconfig の strict オプション追加** → §9.1
  - `noImplicitReturns` / `exactOptionalPropertyTypes` 適用済み（2026-05-20 commit 616499c）
  - `noUncheckedIndexedAccess`: 一度 commit 1aa5fbf で追加 → 本番ビルド96エラーで commit afdbc76 で revert → 27ファイル96件の型ガード追加で再導入完了（2026-05-24）
  - 主な対応パターン:
    - `utils/date.ts`: `parseYearMonth` ヘルパー新設（`"yyyy-MM"` 分解の重複解消）
    - `Object.keys(map).sort().pop()` 等の存在保証ロケーション: `!` で表現＋コメント
    - `snapshot.empty` チェック後の `snapshot.docs[0]`: `!`
    - `toISOString().split('T')[0]` → `toISOString().slice(0, 10)` に置換（より型安全）
    - 削除後の最後要素参照: `?? 0` フォールバック
    - `ResizeObserver` callback の `entries[0]` / `borderBoxSize[0]`: null guard 追加（ランタイム安全性も向上）
    - テストファイル: 前提済み要素アクセスに `!`
  - 検証コマンド注意: 必ず `npx tsc -b` か `npx tsc --noEmit -p tsconfig.app.json` で確認すること（`tsc --noEmit` 単体ではルート `tsconfig.json` が `files:[]` のためチェックが走らない）
  - 結果: tsc -b エラー0件 / lint 0件 / テスト 129 passing / 本番ビルド成功
- [x] **D-2【低】ESLint 強化** → §9.2
  - `eslint-plugin-jsx-a11y` / `eslint-plugin-import` / `no-explicit-any: 'error'` 導入済み（2026-05-20）
  - `eslint.config.js` に3プラグイン追加、既存の any 8箇所を型安全に置換
  - lint エラー0件（CI 追加可能な状態）。jsx-a11y / import-order 系の警告は既存コードに多数あるため意図的に `warn` レベルとし、段階的対応とした → D-7
- [x] **D-3【低】AppCheck 初期化の失敗ハンドリング** → §9.3
  - `firebase.ts` の `initializeAppCheck` を try/catch で囲み対応済み（2026-05-20）
- [x] **D-4【低】ユーティリティ関数の重複解消** → §10
  - `utils/format.ts` に `formatYen` を集約済み（2026-05-20）
  - `currentYearMonth` は既存の `utils/date.ts` に統合済み
  - 各ページのインライン実装を削除して import に統一
- [x] **D-5【低】認証フロー周辺のテスト追加**（2026-05-20）
  - `HouseholdSetupPage.test.tsx`：招待コード maxLength=10・9文字以下 disabled・参加フロー全分岐（14件）
  - `useHousehold.test.tsx`：状態遷移テスト（loading→unauthenticated/needs_setup/ready/error・guest-mode、9件）
- [x] **D-6【低】残る大規模ページの分割**（2026-05-20）
  - 独立監査（Plan エージェント）の結果を反映し、行数目標ではなく「責務の単位」を基準に分割
  - `FixedCostsPage.tsx`（521→372行）: `utils/fixedCost.ts`・`features/FixedCostCalendar.tsx`・`features/FixedCostDayModal.tsx` を抽出
  - `SavingsGoalsPage.tsx`（526→228行）: `features/SavingsGoalModal.tsx`（form state をモーダル内に閉じる設計）・`utils/savingsGoal.ts` を抽出。`GoalCard` は過度な分割を避けページに残置
  - `BalanceSheetPage.tsx`（495→416行）: `features/BalanceSheetItemRow.tsx`（資産/負債で重複する項目行）を抽出。セクション丸ごとの共通化は型ユニオンによる props 複雑化を避けて見送り
- [x] **D-7【低】lint 警告の段階的解消**
  - D-2 で `warn` 設定とした警告が当初152件（`npm run lint` 実測 2026-05-20）。エラーは0件
  - `import/order` 34件を解消済み（2026-05-20）
  - 残り118件を解消済み（2026-05-24）: `jsx-a11y/label-has-associated-control` 54件（htmlFor/id 対応）/ `jsx-a11y/no-static-element-interactions` + `click-events-have-key-events` 62件（モーダル背景に role="presentation"・操作要素に role="button"+onKeyDown）/ `react-hooks/exhaustive-deps` 2件（依存追加・useEffect 内移動）
  - 警告0件・エラー0件（CI ゲート化可能な状態）

### Phase E：監査後に追加対応した事項

- [x] **E-1【高】ConfirmDialog が各種モーダルの背後に隠れるバグ修正**（2026-05-20 commit 4b8a729）
  - `ConfirmDialog.tsx` の `z-50` → `z-[200]` に変更
  - 原因: `CategoryAddModal`（z-[60]）・`PaymentMethodAddModal`（z-[70]）が `ConfirmDialog`（z-50）より高い z-index を持っていた
  - 全モーダル内の削除確認ダイアログが最前面に表示されるよう修正
- [x] **E-2【中】月別収支・個人収支の収支カード金額が大きいと2行になるバグ修正**（2026-05-20 commit ca737af）
  - `PersonalPage.tsx` の `PersonalExpenseView` に `amtSize` 関数を追加
  - 文字数に応じてフォントサイズを動的変更（9文字以内: text-lg / 12文字以内: text-base / それ以上: text-sm）
  - `MonthlyPage.tsx` は既に対応済みだったため変更不要
- [x] **E-3【中】各リスト型画面にドラッグ＆ドロップ並び替えを追加**（2026-05-20）
  - 対象7画面: 買い物リスト・固定費・保険/ローン・サブスク・貯蓄目標・貯蓄口座・証券口座
  - `@dnd-kit/core` / `@dnd-kit/sortable`（既存依存）を利用
  - `useFirestoreCollection` に `reorderItems` を追加し、各派生フックを通じて公開
  - `useShoppingList` に独自の `reorderItems` を追加（未チェックアイテムのみ対象）
  - 家事タスク画面は期日順ソートを維持するため対象外
  - 楽観的更新（即時 UI 反映）+ Firestore バッチ更新（`order: idx * 1000`）のパターンで実装

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

#### 9.1 tsconfig に strict オプション追加（部分対応済み）

**対応済み** (2026-05-20 commit 616499c):
```jsonc
// tsconfig.app.json に追加済み
{
  "compilerOptions": {
    "noImplicitReturns": true,          // エラーなしで適用
    "exactOptionalPropertyTypes": true  // 型定義修正を伴い適用
  }
}
```

`exactOptionalPropertyTypes` の修正内容:
- `types/index.ts`: `HouseholdTask.completedAt`・`AssetItem.note`・`LiabilityItem.note`・`CfMember.role` に `| undefined` を明示追加
- `householdFirestore.ts`: `MemberProfile.nickname` に `| undefined` を追加
- `TransactionModal`・`CategoryAddModal`・`PaymentMethodAddModal` の Props でオプション関数型を `((arg) => T) | undefined` 形式に統一

**未対応**: `noUncheckedIndexedAccess`
- `arr[0]` や `record[key]` が全て `T | undefined` になり、約30ファイル・80件超のエラーが発生
- テストコードの `buttons[0]`・`results[0]` のような定型パターンも全て影響
- 適用する場合は各箇所で `!` アサーションまたは null ガードが必要
- 別タスクとして段階的に対応予定

#### 9.2 ESLint 強化（対応済み）

**対応済み** (2026-05-20):
- `eslint-plugin-jsx-a11y` 導入: インタラクティブ要素・aria 属性のチェックを自動化
- `eslint-plugin-import` 導入: import 順序の統一
- `@typescript-eslint/no-explicit-any: 'error'` 追加: any 8箇所を型安全なコードに置換

```js
// eslint.config.js の主な変更
import jsxA11y from 'eslint-plugin-jsx-a11y'
import importPlugin from 'eslint-plugin-import'
// ...
'@typescript-eslint/no-explicit-any': 'error',
```

現状: lint エラー0件。jsx-a11y / import-order 系のルールは既存コードに違反が多数あるため意図的に `warn` レベルとし、段階的に解消する方針（警告152件・2026-05-20 実測）。詳細と内訳は D-7 を参照。

#### 9.3 AppCheck の失敗ハンドリング（対応済み）

**対応済み** (2026-05-20 commit に含む):

```typescript
// firebase.ts — try/catch で囲んで対応
try {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  })
} catch (err) {
  console.warn('[AppCheck] 初期化に失敗しました:', err)
}
```

広告ブロッカー・企業プロキシ環境でのアプリクラッシュを防止。

---

### 10. 【低】ユーティリティ関数の重複（対応済み）

**対応済み** (2026-05-20):

- `utils/format.ts` を新規作成し `formatYen` を集約
- `utils/date.ts` の `currentYearMonth` に統合（`SavingsGoalsPage.tsx` 等のインライン実装を削除）
- 各ページは `import { formatYen } from '../utils/format'` に統一

```typescript
// utils/format.ts
export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString()}`
}
```

---

## ✅ 改善された項目（評価ポイント）

前回監査からの改善は大きい。以下はすべて完了確認済み。

### 再監査以前（AUDIT.md Phase 1〜4 相当）
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

### 再監査後（Phase A〜E）
- ✅ 招待コード入力フィールドを10文字対応に修正（A-1）
- ✅ ESLint エラー2件解消・lint グリーン維持（A-2）
- ✅ 文字化けコメント清掃（B-1）
- ✅ ゲストモード PersonalPage に案内メッセージ表示（B-2）
- ✅ `useHousehold` に `'error'` 状態追加・再試行UI実装（B-3）
- ✅ `joinHousehold` の既存世帯所属チェック・確認ダイアログ追加（B-4）
- ✅ BottomSheetModal にフォーカストラップ実装（C-1）
- ✅ タップターゲット 44×44px 確保（C-2）
- ✅ `useMonthlyData` / `usePersonalMonthlyData` を React Query 化（C-3）
- ✅ ESLint 強化（jsx-a11y / import / no-explicit-any）（D-2）
- ✅ AppCheck 初期化を try/catch で保護（D-3）
- ✅ `formatYen` / `currentYearMonth` を utils/ に集約（D-4）
- ✅ tsconfig `noImplicitReturns` / `exactOptionalPropertyTypes` / `noUncheckedIndexedAccess` 追加（D-1 完了。27ファイル96件の型ガード追加で再導入）
- ✅ ConfirmDialog z-index バグ修正（z-50 → z-[200]）（E-1）
- ✅ 収支カード金額の2行化バグ修正（文字数連動フォントサイズ）（E-2）
- ✅ 7画面にドラッグ＆ドロップ並び替え追加（E-3）
- ✅ 認証フロー周辺テスト追加（HouseholdSetupPage 14件・useHousehold 9件）（D-5）
- ✅ 大規模ページ3件を分割（FixedCostsPage / SavingsGoalsPage / BalanceSheetPage）（D-6）
- ✅ lint 警告118件を全解消（警告0件・エラー0件）（D-7）
- ✅ tsconfig `noUncheckedIndexedAccess` 追加（D-1 完了）

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

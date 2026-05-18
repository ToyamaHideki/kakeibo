# kakeibo コード監査レポート

**監査日**: 2026-05-16
**対象コミット**: 未バージョン管理（git未初期化）
**スコープ**: `src/` 配下全体・`firestore.rules`・Firebase 構成
**監査者**: Claude Code（Sonnet 4.6）+ 並列 Explore エージェント 3名

---

## エグゼクティブサマリー

総合所感：**機能拡張優先のフェーズに位置するプロトタイプ品質**。Firestore セキュリティルールが世帯ベースで適切に守られているため致命的な権限漏洩はないが、以下の領域に注意が必要：

| 領域 | 重大度 | 主要課題 |
|---|---|---|
| セキュリティ | 中 | `households` ドキュメント本体の read 権限が広い（招待コード露出） |
| 運用 | 中 | git 未初期化・エラーバウンダリ無し・本番ログ無し |
| リファクタリング | 高 | CRUD 4ファイル × フック4ファイルの完全重複、巨大ページ |
| パフォーマンス | 中 | Context 値の memoize 抜け・コード分割無し・キャッシュ無し |
| アクセシビリティ | 低〜中 | gray-300/400 のコントラスト不足・フォーカストラップ無し |

最優先（1週以内）：エラーバウンダリ追加 / households read ルール厳格化 / git 初期化。
次点（2-4週）：CRUD ジェネリック化・巨大ページ分割・コード分割。

---

## 1. 監査方法

3つの Explore エージェントを並列実行し、以下を分担調査：
- セキュリティ：Firestore ルール、環境変数、認証フロー、書き込み時オーナーシップ
- リファクタリング：コード重複、長大ファイル、型安全性、データ整合性
- パフォーマンス／A11y：バンドル、再レンダ、フェッチ効率、コントラスト、フォーカス管理

エージェント報告のうち重要主張（API キー流出疑い、Firestore ルール脆弱性等）は主監査者が一次ソースで再検証。

---

## 2. セキュリティ所見

### 2.1 [中] `households` ドキュメント本体の read 権限が認証済みなら全世帯対象

**証拠**: [`firestore.rules:19-20`](../firestore.rules)
```
match /households/{householdId} {
  allow read: if request.auth != null;
```

**問題**: ログイン済みの任意ユーザーが、自分が属さない世帯のドキュメント（`memberIds`、`inviteCode`、`memberProfiles`含む）を取得可能。例えば「招待コードを総当たり」しなくても、`getDocs(collection('households'))` で一覧スキャンができる。

**前提**: 招待コード照合のため広めに開放されている。`joinHousehold` 内で `where('inviteCode', '==', code)` クエリが必要。

**影響**:
- 他世帯の `memberProfiles.{uid}.email` （世帯メンバーのメールアドレス）が読み取れる ← PII 漏洩
- `inviteCode` 一覧化可能（ただし 6 文字 32 種 = 約 10 億通り、当面は実害低い）
- 将来 `extraAssignees`（子供の名前など）も読まれる

**推奨**:
- 短期：`memberProfiles` を `households/{hid}/private/profiles` のサブコレクションに移し、`memberIds` 限定ルールに切り替え
- 中期：招待コード照合を Cloud Function に切り出し、`households` ドキュメント本体は `memberIds` 限定 read に変更

---

### 2.2 [低] Firebase Web API キーの取り扱い

**証拠**:
- [`src/firebase/firebase.ts:7`](../src/firebase/firebase.ts) — `import.meta.env.VITE_FIREBASE_API_KEY` 経由で参照
- `.env.local` は [`.gitignore:11`](../.gitignore) で除外済み
- 本ディレクトリは git 未初期化（`git status` → "not a git repository"）→ 流出経路自体が存在しない

**注記**: Firebase Web SDK の API キーは「公開前提」の識別子であり、シークレットではない（[公式FAQ](https://firebase.google.com/docs/projects/api-keys) 参照）。実際の認可は Firestore セキュリティルール・App Check で担保される設計。

**並列エージェントの「[高] API キー流出」という主張は不正確**。実害の可能性は極めて低い。

**推奨（将来のため）**:
- git 初期化時、`.env.local` がコミットされないことを `git status` で必ず確認
- App Check（reCAPTCHA v3）の有効化で「自分のサイト以外からの API 呼び出し」をブロック

---

### 2.3 [中] 招待コードによる新規参加のロジック

**証拠**: [`src/firebase/householdFirestore.ts:63-79`](../src/firebase/householdFirestore.ts)
```typescript
export async function joinHousehold(uid, inviteCode, displayName) {
  const q = query(collection(db, 'households'), where('inviteCode', '==', inviteCode.toUpperCase()))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const householdId = snapshot.docs[0].id
  const data = snapshot.docs[0].data() as Household
  if (!data.memberIds.includes(uid)) {
    await updateDoc(doc(db, 'households', householdId), {
      memberIds: [...data.memberIds, uid],
    })
  }
}
```

**並列エージェントは「race condition / クライアント検証回避」と指摘**したが、[`firestore.rules:32-37`](../firestore.rules) で実は防御されている：
```
|| (
  request.auth.uid in request.resource.data.memberIds
  && request.resource.data.inviteCode == resource.data.inviteCode
  && request.resource.data.memberIds.hasAll(resource.data.memberIds)
  && request.resource.data.memberIds.size() == resource.data.memberIds.size() + 1
)
```
→ 一度に追加できるのは自分1人のみ、招待コード改変・既存メンバー削除は拒否。

**残存リスク（中）**:
1. **招待コード総当たり**: クライアントは何度でもクエリ可能。コードは 6 文字 / 32 文字種 = 約 10 億通り。100 RPS で総当たりすると約 116 日。Firestore の rate limit は緩く、現実的に侵入可能。
2. **重複参加クエリのウィンドウ**: クライアント側で `data.memberIds.includes(uid)` チェック→`updateDoc` の間にrace。ルール側で size +1 制約があるため致命的失敗にはならないが、片方が失敗する。

**推奨**:
- 短期：招待コード照合・参加処理を Cloud Function 化し、レート制限を仕掛ける
- 短期：招待コードを 8〜10 文字に拡張（既存に対する破壊的変更ではない）
- 短期：`refreshInviteCode` を頻繁に促す UX 改善（一度共有したら数日で無効化）

---

### 2.4 [中] エラーの握り潰し / 観測性ゼロ

**証拠1**: [`src/hooks/useHousehold.ts:44-48`](../src/hooks/useHousehold.ts)
```typescript
} catch {
  setHouseholdId(null)
  setPayDay(null)
  setState('needs_setup')
}
```
ネットワーク失敗・権限拒否・データ破損のいずれも区別できず「needs_setup」扱い → 既存メンバーが認証エラーだけで世帯設定画面に飛ばされ、世帯を再作成しかける可能性。

**証拠2**: 全 `firebase/*.ts` ファイルでエラーキャッチなし。失敗時はそのまま throw され、呼び出し元の try/finally でも catch されず未処理 Promise rejection に。

**証拠3**: `ErrorBoundary` 不在（`grep ErrorBoundary src/` ヒット0）。Firestore 書き込み失敗時に画面が真っ白になるリスク。

**推奨**:
- `src/components/ErrorBoundary.tsx` を作成し `App.tsx` の最上位に配置
- `useHousehold` の catch で `console.warn(err)` 程度のロギング
- 本番では Sentry または Firebase Crashlytics を導入
- ユーザー向けには軽量な toast ライブラリ（`sonner` 等）でフィードバック

---

### 2.5 [低] `ignoreUndefinedProperties: true` の副作用

**証拠**: [`src/firebase/firebase.ts:17-18`](../src/firebase/firebase.ts)
```typescript
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true })
```

**経緯**: 直前の会話で savings account 追加バグ修正のため有効化（`undefined` フィールドで `addDoc` がスローしていた）。

**副作用**: 意図せず `undefined` を渡すと「フィールドが削除」されず単に書き込まれない。例えば `updateDoc(ref, { owner: undefined })` で `owner` フィールドを削除したい場合に削除されない（`deleteField()` を使う必要あり）。

**現状**: `SavingsManagementPage` / `SecuritiesAccountsPage` は `deleteField()` を明示的に使うよう既に修正済み。他の更新パス（`updateAsset`, `updateLiability`, `updateMemberProfile` の nickname など）は「クリアしても消えない」状態。

**推奨**: 重大度低。気づいた時点で `deleteField()` 適用、または ESLint カスタムルールで `undefined` を明示的に検出。

---

## 3. リファクタリング所見

### 3.1 [高] CRUD レイヤーの完全重複（4ファイル × 4関数 = 88行）

**証拠**: `wc -l src/firebase/*Firestore.ts`
| ファイル | 行数 | パターン |
|---|---|---|
| `savingsAccountFirestore.ts` | 22 | fetch/add/update/delete |
| `savingsFirestore.ts` | 22 | 同上 |
| `securitiesFirestore.ts` | 22 | 同上 |
| `contractFirestore.ts` | 22 | 同上 |

各ファイルが完全同一構造：
```typescript
export async function fetchX(householdId) {
  const snap = await getDocs(collection(db, 'households', householdId, 'X'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as T)
}
// ...add, update, delete も同形
```

**推奨**: ジェネリック CRUD ファクトリー
```typescript
// src/firebase/crud.ts
export function createHouseholdCrud<T extends { id: string }>(subPath: string) {
  return {
    fetch: (hid: string) => getDocs(collection(db, 'households', hid, subPath))
      .then(s => s.docs.map(d => ({ id: d.id, ...d.data() }) as T)),
    add: (hid: string, data: Omit<T, 'id'>) => addDoc(collection(db, 'households', hid, subPath), data).then(r => r.id),
    update: (hid: string, id: string, data: Partial<T>) => updateDoc(doc(db, 'households', hid, subPath, id), data),
    remove: (hid: string, id: string) => deleteDoc(doc(db, 'households', hid, subPath, id)),
  }
}
// 使用例
export const savingsAccountOps = createHouseholdCrud<SavingsAccount>('savingsAccounts')
```
→ 88行が 20行に圧縮。新しいコレクション追加時の手間も激減。

---

### 3.2 [高] カスタムフックの重複（4ファイル × 40〜70行）

**証拠**: [`useSavingsAccounts.ts`](../src/hooks/useSavingsAccounts.ts)、[`useSavingsGoals.ts`](../src/hooks/useSavingsGoals.ts)、[`useSecuritiesAccounts.ts`](../src/hooks/useSecuritiesAccounts.ts)、[`useContracts.ts`](../src/hooks/useContracts.ts) は全て同一パターン：

```typescript
useEffect(() => {
  if (!householdId) return
  fetchX(householdId)
    .then(data => setX(data.sort((a, b) => a.order - b.order)))
    .finally(() => setLoading(false))
}, [householdId])
```

**推奨**: 上記 CRUD ファクトリーと組み合わせて `useFirestoreCollection` フックを作成し、各専用フックは `useFirestoreCollection(savingsAccountOps)` だけにする。`recordMonthlyValue` 等のドメイン特有メソッドはコンポーズで追加。

---

### 3.3 [中] 巨大ページコンポーネント

**証拠**: `wc -l src/pages/*.tsx`（実測値）
| ファイル | 行数 |
|---|---|
| [`CashflowPage.tsx`](../src/pages/CashflowPage.tsx) | **917** |
| [`SecuritiesAccountsPage.tsx`](../src/pages/SecuritiesAccountsPage.tsx) | **671** |
| [`SavingsGoalsPage.tsx`](../src/pages/SavingsGoalsPage.tsx) | **526** |
| [`FixedCostsPage.tsx`](../src/pages/FixedCostsPage.tsx) | **517** |
| [`BalanceSheetPage.tsx`](../src/pages/BalanceSheetPage.tsx) | **495** |

**問題**: 単一コンポーネントで `useState` 多数、JSX 入れ子深い、モーダル定義インラインで責務分離が弱い。

**推奨**: ページごとに以下に分割
- `XxxPage.tsx` — ルーティング・データ供給のみ（〜100行）
- `features/XxxList.tsx` — リスト表示
- `features/XxxModal.tsx` — 追加・編集モーダル
- `features/XxxChart.tsx` — チャート系

`CashflowPage` は特に優先（編集セル・ドラッグ・モーダルが一画面に同居）。

---

### 3.4 [中] モーダル実装の構造重複

**証拠**: [`TransactionModal.tsx`](../src/features/TransactionModal.tsx) (335行) と [`PersonalTransactionModal.tsx`](../src/features/PersonalTransactionModal.tsx) (331行) はほぼ完全な重複。

両ファイルで重複しているもの：
- ESC キーで閉じる `useEffect` パターン
- `isOpen` 切替時の state リセット `useEffect`
- ボトムシートレイアウト
- フォーム state 構造（type, amount, categoryId, paymentMethodId, date, memo）

**推奨**:
- 共通レイアウト `<BottomSheetModal title="..." onClose={...}>` を作成
- `useEscapeKey(callback)` フックを共通化（`grep "Escape" src/` で 7 ファイル該当）
- フォームロジックを Generic 化、Personal 版は categories/paymentMethods のソースだけ差し替え

---

### 3.5 [低] `window.confirm` の 14 箇所散在

**証拠**: 削除確認だけで 14 箇所。メッセージ形式不統一（`「Xを削除しますか？」`／`「Xを削除しますか？\n履歴もすべて削除されます」`等）。

**推奨**: `useConfirm({ title, body, confirmLabel })` フックでカスタムダイアログ化。あわせて削除時の cascade ロジック有無を明示できる。

---

### 3.6 [中] データ整合性のリスク

**問題1**: SavingsGoal の `currentAmount` と `contributions` 合計値が二重管理。`logContribution` 時に同期更新しているが、誰かが Firestore コンソールから直編集すると不整合。

**問題2**: SavingsAccount を削除しても、BalanceSheet で取込まれた金融資産行は残る。逆向き同期も無いため気付かない。

**問題3**: `order` フィールドの採番が不統一（`Date.now()` を使うフックと `Math.max(...) + 1` を使うフック）。

**推奨**:
- 計算可能な集計（`currentAmount`）は派生値として扱い、保存しない or 再計算メソッドを設ける
- 削除時の関連データ取扱を CLAUDE.md で方針明文化（cascade vs orphan tolerate）
- `order` 採番は `nextOrder(items)` ヘルパで統一

---

## 4. パフォーマンス所見

### 4.1 [中] Context 値の memoize 抜け

**証拠**: [`src/hooks/useHousehold.ts:71`](../src/hooks/useHousehold.ts)
```typescript
return createElement(
  HouseholdContext.Provider,
  { value: { user, householdId, state, payDay, reloadHousehold } },
  children,
)
```

毎レンダリングで新規オブジェクト → `useHousehold()` 利用箇所全てが再レンダリング対象に。

**推奨**: `useMemo` で value を memoize
```typescript
const value = useMemo(() => ({ user, householdId, state, payDay, reloadHousehold }),
  [user, householdId, state, payDay])
```

### 4.2 [中] コード分割無し

**証拠**: [`src/App.tsx`](../src/App.tsx) で 18 ページを全て直接 import。バンドル `index-XXX.js` が 605 KB（gzip 157KB）と肥大。ビルドログでも `(!) Some chunks are larger than 500 kB` 警告。

**推奨**: ページ単位の `React.lazy`
```typescript
const CashflowPage = lazy(() => import('./pages/CashflowPage'))
// Routes 内で <Suspense fallback={<Loader />}> で囲む
```

### 4.3 [中] フェッチ重複・キャッシュ無し

**証拠**: `useCategories` / `usePaymentMethods` が複数ページで独立に呼ばれ、ページ遷移ごとに再フェッチ。MonthlyPage → 削除 → MonthlyPage の流れで `fetchMonthData` が2回走る。

**推奨**:
- Layout レベルで取得して React Context or `useOutletContext` で配下に供給
- 中期：`@tanstack/react-query` の導入を検討（キャッシュ・Stale-while-revalidate）

### 4.4 [低] chart.js の register 重複

**証拠**: [`MonthlyChart.tsx`](../src/features/MonthlyChart.tsx) や `SecuritiesAccountsPage.tsx` の各所で `ChartJS.register(...)` をモジュールスコープで実行。複数ファイルで同じ要素を register。

**推奨**: `src/lib/chart.ts` で1回だけ register、各コンポーネントは import するだけ。

---

## 5. アクセシビリティ所見

### 5.1 [中] テキストコントラスト不足

**証拠**: `text-gray-300` / `text-gray-400` が頻出。例：
- 各カードのメタ情報（更新日、メモ等）
- 期日バッジの未来日表示
- BottomNav の非アクティブカテゴリ

`gray-400` (#94A3B8) は白背景でコントラスト比 2.84:1 → WCAG AA 不適合（4.5:1 必要）。

**推奨**: `gray-500` (4.62:1) 以上へ統一。小さいテキストは特に重要。

### 5.2 [低] フォーカストラップ無し

**証拠**: 全モーダルで Tab キーがモーダル外要素に抜ける。screen reader 利用者やキーボードのみ利用者には致命的。

**推奨**: `focus-trap-react` 等の軽量ライブラリを共通モーダルに組み込む。

### 5.3 [低] タップターゲットサイズ

**証拠**: BottomNav の削除アイコンボタン (`w-7 h-7` = 28×28px)、各カードの編集/削除アイコン (`w-7 h-7`) が iOS の推奨 44×44px に満たない。

**推奨**: 視覚サイズはそのままに `min-w-[44px] min-h-[44px]` または padding 拡張で hit area 確保。

---

## 6. 改善ロードマップ

> 最終確認日: 2026-05-18

### Phase 1（今週中・実装コスト小）
- [x] **ErrorBoundary 追加**：`src/components/ErrorBoundary.tsx` 作成・`App.tsx` 直下に配置済み
- [x] **HouseholdContext 値の useMemo 化**：`useHousehold.ts` L70 で実装済み
- [ ] **git 初期化**：未実施（`.env.local` 除外確認後に `git init` → 初回コミット）

### Phase 2（2週以内・中規模リファクタ）
- [x] **CRUD ジェネリック化**：`src/firebase/crud.ts` の `createHouseholdCrud` 導入済み（4ファイルが各10行に圧縮）
- [x] **useFirestoreCollection フック**：`src/hooks/useFirestoreCollection.ts` 作成・4フック統合済み
- [x] **コード分割**：`App.tsx` で全ページを `React.lazy` 化済み

### Phase 2 追加実施（audit 後に対応）
- [x] **useEscapeKey フック**：`src/hooks/useEscapeKey.ts` 作成・各モーダルで共通化
- [x] **useConfirm + ConfirmDialog**：`window.confirm` を全廃（0件）→ カスタムダイアログに統一
- [x] **BottomSheetModal 共通コンポーネント**：`src/components/BottomSheetModal.tsx` 作成
- [x] **Chart.js 一元 register**：`src/lib/chart.ts` で集約済み
- [x] **エラーロギング**：`useHousehold` の catch に `console.warn` 追加済み
- [x] **nextOrder ヘルパー**：`src/utils/order.ts` で `order` 採番を統一

### Phase 3（1ヶ月以内・セキュリティ強化）
- [x] **`memberProfiles` をサブコレクション化**：他世帯のメール露出を遮断
- [x] **招待コード長を 10 文字に拡張**（32種×10文字≒1兆通り、Cloud Function 化は見送り）
- [x] **App Check 有効化**：自サイト外からの API 呼び出しブロック

### Phase 4（時間がある時）
- [x] **巨大ページ分割**：CashflowPage（921行→650行）/ SecuritiesAccountsPage（660行→285行）分割完了
- [x] **コントラスト改善**：プレーンテキスト 7件（Layout・TransactionList・FixedCostsPage）を gray-500 へ修正。アイコンボタンの hover用薄さ・値ゼロ表示は意図的デザインのため維持
- [x] **モーダル共通化**：PersonalTransactionModal を廃止、TransactionModal に optional props（title/saveFn/updateFn/moveFn/category系fn）を追加して統合
- [x] **React Query 導入**：useCategories / usePaymentMethods を useQuery に移行。staleTime=Infinity でページ間キャッシュ共有、addCategoryLocally 等は setQueryData で楽観的更新

---

## 7. 監査メモ

- **不正確だった指摘の訂正**：
  - 「API キー流出（高リスク）」→ git 未初期化のため実害なし、かつ Firebase Web API キーは公開前提
  - 「招待コード race condition」→ Firestore ルール側で防御済み（残るのは総当たり耐性のみ）

- **本監査でカバーしていない領域**：
  - 依存ライブラリの既知脆弱性（`npm audit` 未実行）
  - Firestore インデックス効率（`firestore.indexes.json` 内容未精査）
  - ビジネスロジックの仕様正確性（家計簿の集計式等）

- **証拠の再現方法**：
  - 行数：`wc -l src/pages/*.tsx`
  - ルール：`firestore.rules` 全文
  - `|| undefined` 使用箇所：`grep -rn '|| undefined' src/`

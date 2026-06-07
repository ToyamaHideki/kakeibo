# PC版ダッシュボード 基本設計書

- 対象バージョン：**Ver 1.0600**
- 詳細設計書：`docs/PC版ダッシュボード_詳細設計書.md`
- 区分：PC（デスクトップ）専用の新規画面

---

## 1. 目的

デスクトップ利用時に、複数の管理（家計／資産／生活／ライフプランニング）の要点を 1 画面で俯瞰できる「ダッシュボード」を新設する。現状は各管理画面を個別に行き来する必要があり、全体像の把握に手数がかかる。

本バージョン（Ver 1.0600）では **「家計管理」ダッシュボードのみを先行実装（MVP）** し、以下を確立する。

| # | 確立するもの | 目的 |
|---|---|---|
| 1 | 上部タブによる管理切替の枠組み | 次バージョン以降で資産／生活／ライフプランを追加しやすくする土台 |
| 2 | ウィジェット（カード）レイアウト基盤 | 各管理のサマリーをカード単位で並べる共通様式 |
| 3 | PC 初期表示の選択設定 | トップアクセス時にダッシュボード／月別収支のどちらを出すかをユーザーが選べる |

---

## 2. スコープ

### 2.1 対象

| 項目 | 内容 |
|---|---|
| 新規画面 | `/dashboard`（PC 専用） |
| 切替方式 | 画面上部のセレクタ/タブで「表示する管理」を切替（MVP は家計のみ活性） |
| 家計ダッシュボードの内容 | ①今月の収支サマリー ②予算消化状況 ③収支推移グラフ ④当月の固定費サマリー |
| ナビ導線 | サイドバー最上部に「ダッシュボード」項目を追加 |
| 初期表示設定 | 設定画面に「PC 初期表示画面」（ダッシュボード／月別収支）を追加。トップ `/` のリダイレクト先に反映 |

### 2.2 非対象（本バージョンでは実装しない）

- 資産管理・生活管理・ライフプランニングの各ダッシュボード（タブ枠は用意するが中身は次バージョン）
- モバイルでのダッシュボード表示（完全非表示）
- ウィジェットの並べ替え・追加非表示などのカスタマイズ
- ダッシュボード専用の新規 Firestore コレクション（既存データの再利用のみ）

---

## 3. 全体方針

| 観点 | 方針 |
|---|---|
| データ取得 | 既存フック（`useMonthlyData` / `useBudget` / `useCategories` / `useAnnualData` / `fetchFixedCosts`）を**再利用**。ダッシュボード専用の Firestore アクセスは新設しない |
| レスポンシブ | 既存 `Layout.tsx` の `hidden md:flex` / `md:hidden` パターンを踏襲。ダッシュボードは `md` 以上でのみ表示 |
| モバイル対策 | モバイルからの直 URL アクセス時は月別収支へリダイレクト（画面幅で判定） |
| ルーティング | `App.tsx` に `/dashboard` を追加。トップ `/` のリダイレクトを「設定 × 画面幅」で分岐 |
| 給与日起算 | 収支サマリー・予算は給与日起算（`currentPayPeriodMonth` / `useMonthlyData(payDay)`）に従う。収支推移グラフはカレンダー月（年間収支と同じ扱い） |
| 状態保存 | PC 初期表示設定は `localStorage` に保存（デバイス依存の表示設定のため。Firestore スキーマ／Rules 変更なし） |

---

## 4. 画面構成

### 4.1 ダッシュボード全体レイアウト（デスクトップ）

```
┌─ ダッシュボード ────────────────────────────────────┐
│  [家計 ●] [資産 (準備中)] [生活 (準備中)] [ライフプラン (準備中)] │
├──────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐                │
│  │ 今月の収支     │  │ 予算消化状況   │                │
│  │ 収入 / 支出 / 差│  │ カテゴリ別バー │                │
│  └───────────────┘  └───────────────┘                │
│  ┌──────────────────────────┐  ┌────────────────┐    │
│  │ 収支推移（直近グラフ）     │  │ 当月の固定費    │    │
│  │                          │  │ 合計 / 件数     │    │
│  └──────────────────────────┘  └────────────────┘    │
└──────────────────────────────────────────────────────┘
```

- タブは横並び。MVP では「家計」のみ活性、他は `disabled`＋「準備中」表記。
- カードは 2 カラムグリッド（`lg:grid-cols-2`）。狭い場合は 1 カラム。
- 各カードからの導線：カードのタイトルクリックで対応する管理画面へ遷移（例：今月の収支 → 月別収支）。

### 4.2 タブ（管理切替）

```
[家計 ●]  [資産]  [生活]  [ライフプラン]
   ↑活性     ↑disabled（準備中）
```

- 選択状態は URL クエリ `?view=household` に保持（リロード・共有で復元）。
- MVP では `view` は `household` 固定。未知の値・未指定は `household` にフォールバック。

### 4.3 ウィジェット（カード）一覧（家計 MVP）

| カード | 内容 | データ源 | 遷移先 |
|---|---|---|---|
| 今月の収支サマリー | 当月分の収入合計・支出合計・収支差 | `useMonthlyData(currentPeriodMonth, payDay)` | `/months/:ym` |
| 予算消化状況 | 予算設定済みカテゴリの「予算／実績／消化率」バー（上位数件） | `useBudget` + `useMonthlyData` + `useCategories` | `/budget/:ym` |
| 収支推移グラフ | 当年の月別収支（収入・支出・差）の推移（棒/折れ線） | `useAnnualData(currentYear)` | `/annual` |
| 当月の固定費 | 当月に適用される固定費の合計額・件数 | `fetchFixedCosts` + `isApplicableThisMonth` | `/fixed-costs` |

---

## 5. データフロー

### 5.1 画面初期化

```
DashboardPage マウント
   │
   ├─ 画面幅判定（matchMedia '(min-width: 768px)'）
   │     └─ モバイル → <Navigate to=/months/:current replace>
   │
   ├─ view = searchParams.get('view') ?? 'household'（未知値は household）
   │
   └─ view === 'household' → <HouseholdDashboard />
         │
         ├─ periodMonth = currentPayPeriodMonth(payDay)
         ├─ useMonthlyData(periodMonth, payDay) → transactions
         ├─ useBudget(periodMonth)            → budgets
         ├─ useCategories()                   → categories
         ├─ useAnnualData(currentYear)        → monthData（推移グラフ）
         └─ fetchFixedCosts(householdId)      → 当月適用分を集計
```

### 5.2 トップ `/` の初期表示分岐

```
RootRedirect（/ のindex要素）
   │
   ├─ isDesktop = matchMedia('(min-width:768px)').matches
   ├─ pref = localStorage['dashboardAsHome'] === 'true'
   │
   ├─ isDesktop && pref  → <Navigate to=/dashboard?view=household replace>
   └─ それ以外            → <Navigate to=/months/:currentPayPeriodMonth replace>（従来通り）
```

### 5.3 予算消化状況カードの集計

```
expenseCats = categories.filter(type==='expense')
forEach cat where budgets[cat.id] > 0:
   actual = Σ transactions(type==='expense' && categoryId===cat.id).amount
   rate   = actual / budgets[cat.id]
→ rate 降順ソートし上位 N 件（例：5 件）をバー表示
→ 予算設定が 1 件も無い場合は「予算が未設定です」＋予算管理への導線
```

### 5.4 当月の固定費カードの集計

```
costs = fetchFixedCosts(householdId)
applicable = costs.filter(c => isApplicableThisMonth(c, currentMonth))
total = Σ applicable.amount
count = applicable.length
→「当月 ¥{total}（{count}件）」表示
```

---

## 6. データ構造

### 6.1 Firestore

変更なし。既存コレクション（`months` / `budgets` / `categories` / `fixedCosts`）の読み取りのみ。

### 6.2 型（新規・最小）

```typescript
// src/types/index.ts（または DashboardPage 内）に追加
export type DashboardView = 'household' | 'assets' | 'living' | 'lifeplan'
```

MVP で実装するのは `'household'` のみ。残りはタブ定義のための予約。

### 6.3 localStorage キー

| キー | 値 | 用途 |
|---|---|---|
| `dashboardAsHome` | `'true'` / `'false'` | PC トップアクセス時にダッシュボードを初期表示するか |

### 6.4 Firestore Rules

変更不要（読み取りのみ・既存 rule 範囲内）。

---

## 7. 表示条件・分岐

| 状況 | 振る舞い |
|---|---|
| モバイル（`< md`）でダッシュボードへ直アクセス | 月別収支へリダイレクト |
| サイドバーの「ダッシュボード」 | デスクトップのみ表示（Sidebar 自体が `hidden md:flex` 配下） |
| `?view` が未知値・未指定 | `household` にフォールバック |
| 予算が 1 件も未設定 | 予算カードに「予算が未設定です」＋予算管理への導線 |
| 当月の取引が 0 件 | 収支サマリーは ¥0 表示、推移グラフは「データがありません」 |
| 当月適用の固定費が 0 件 | 固定費カードは「当月の固定費はありません」 |
| ゲストモード | 既存フック／guestStore 経由でそのまま動作（新規アクセスなし） |
| ローディング中 | カード単位でスケルトン or「読み込み中…」 |

---

## 8. 非機能要件

### 8.1 パフォーマンス
- すべて既存フックの再利用。`useAnnualData` は 12 ヶ月分フェッチするため、ダッシュボード表示時のみ取得（lazy ロード済みのページ単位で発火）。
- 集計（予算消化・固定費合計）は `useMemo` で依存変化時のみ再計算。

### 8.2 レスポンシブ
- `md`（768px）未満では表示しない。`lg`（1024px）以上で 2 カラム、`md`〜`lg` は 1〜2 カラムを Tailwind の `grid-cols` で調整。

### 8.3 デザイン一貫性
- カードは既存様式 `bg-white rounded-xl border border-gray-100 shadow-sm p-4`（MonthlyChart 等と統一）。
- タブ／セレクタは既存 `SegmentedToggle` の様式・sage 系カラーを踏襲。
- セクション見出しは `text-xs font-semibold text-gray-500 uppercase tracking-wide`。

### 8.4 アクセシビリティ
- タブは `role="tablist"` / `aria-selected`、disabled タブは `aria-disabled`。
- カードタイトルのリンクは `aria-label` で遷移先を明示。

---

## 9. 既知リスク・考慮事項

| リスク | 対応 |
|---|---|
| 画面幅判定とリダイレクトの競合（リサイズ時のチラつき） | 初期表示分岐はマウント時の `matchMedia` 一回判定。リサイズ追従はしない（MVP 割り切り） |
| `useAnnualData` の追加フェッチでコスト増 | ダッシュボード表示時のみ。staleTime/キャッシュは既存挙動に委ねる |
| localStorage 未対応・プライベートモード | 取得失敗時は従来挙動（月別収支）にフォールバック |
| タブ枠だけ作って中身が無い管理を触られる | disabled＋「準備中」表記で操作不可に |
| 給与日起算とカレンダー月の混在（サマリーは起算、推移は暦月） | CLAUDE.md の既存方針（年間収支は暦月）に合わせる。カード内に注記不要だが詳細設計で明示 |
| モバイルからの直 URL | DashboardPage 冒頭でガードしリダイレクト |

---

## 10. バージョン管理連動

実装完了時：

- `src/constants/version.ts`：`APP_VERSION = '1.0600'`
- `package.json`：`"version": "1.0600"`
- お知らせ用テキスト（Firebase Console に手動投入）：
  ```
  version: "1.0600"
  title:   "Ver 1.0600 リリース"
  content: "・PC版にダッシュボードを新設（家計管理の要点を1画面で表示）
            ・今月の収支／予算消化／収支推移／当月の固定費をまとめて確認可能
            ・設定からPCの初期表示画面（ダッシュボード／月別収支）を選べるように"
  releasedAt: <投入時のタイムスタンプ>
  order: 0
  ```

※ 同一ベースラインで追加実装が続く場合は、お知らせを 1 件に集約し Ver 末尾を切り上げ追記する運用に従う。

---

## 11. 受入基準

1. ✅ デスクトップでサイドバーに「ダッシュボード」が表示され、`/dashboard` に遷移できる
2. ✅ ダッシュボード上部に管理切替タブが表示され、「家計」が活性、他は「準備中」で操作不可
3. ✅ 今月の収支サマリー（収入・支出・差）が当月分（給与日起算）で正しく表示される
4. ✅ 予算消化状況が予算設定済みカテゴリについて表示され、未設定時は導線が出る
5. ✅ 収支推移グラフが当年の月別収支で表示される
6. ✅ 当月の固定費合計・件数が表示される
7. ✅ 各カードから対応する管理画面へ遷移できる
8. ✅ モバイルでは「ダッシュボード」がナビに出ず、直 URL アクセス時は月別収支へリダイレクトされる
9. ✅ 設定で「PC 初期表示画面」を選択でき、トップ `/` の初期表示に反映される
10. ✅ ゲストモードでも動作する
11. ✅ 品質ゲート：`npm run lint`（警告 0）／`npx tsc -b`（型 0）／`npm test`（全 pass）

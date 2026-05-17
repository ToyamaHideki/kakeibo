# 家計簿アプリ

## 概要

スマートフォン・デスクトップ両対応の家計簿アプリ。  
日々の収支を簡単に記録できることを重視し、視認性の高いリッチな UI を提供する。  
Google アカウントでのログインを必須とし、招待コードによる複数アカウントの世帯共有に対応する。

------------------------------------------------------------

## 主な機能

### 家計管理
- 月別収支の登録・編集・一覧表示（給与日起算モード対応）
- 年間収支の表形式表示
- 固定費一覧の管理
- 個人支出の記録（世帯データとは分離）
- 予算管理（カテゴリ別予算と実績比較）
- 貯蓄目標の設定・進捗管理

### 生活管理
- 買い物リスト
- 家事タスク管理
- サブスクリプション管理
- 保険・ローン管理

### ライフプランニング
- キャッシュフロー表（給与・支出の長期シミュレーション）
- 収支確認表
- バランスシート

### 世帯・アカウント管理
- Google アカウントによる認証
- 招待コードによる世帯共有（複数アカウント）
- 給与日設定（月別収支の起算日を変更）

------------------------------------------------------------

## 技術スタック

- フレームワーク: React 18
- 言語: TypeScript
- スタイリング: Tailwind CSS
- BaaS / Database: Firebase Firestore
- 認証: Firebase Authentication（Google サインイン）
- Hosting: Firebase Hosting
- グラフライブラリ: Chart.js
- ドラッグ＆ドロップ: @dnd-kit
- パッケージマネージャ: npm

------------------------------------------------------------

## Firestore データ構造

```
firestore:
├── users/{uid}                       ← ユーザープロフィール（本人のみアクセス可）
│   ├── householdId: string
│   ├── displayName: string
│   ├── categories/                   ← 個人カテゴリ
│   ├── paymentMethods/               ← 個人支払い方法
│   └── months/{yearMonth}            ← 個人支出トランザクション
│
└── households/{householdId}          ← 世帯データ（メンバー全員がアクセス可）
    ├── memberIds: string[]
    ├── inviteCode: string
    ├── createdAt: number
    ├── payDay?: number               ← 給与日（2〜28, 未設定=カレンダー月）
    ├── categories/
    ├── paymentMethods/
    ├── months/{yearMonth}            ← 世帯支出トランザクション
    ├── fixedCosts/
    ├── cfPlan/main                   ← キャッシュフロープラン
    ├── budgets/{yearMonth}
    ├── contracts/
    ├── savingsGoals/
    ├── shoppingItems/
    ├── householdTasks/
    ├── balanceSheets/{year}
    └── incomeStatements/{year}
```

yearMonth の形式: `"yyyy-MM"`（例: `"2025-01"`）

------------------------------------------------------------

## 認証フロー

1. 未ログイン → ログイン画面（Google サインイン）
2. ログイン済み・世帯未設定 → 世帯セットアップ画面（新規作成 or 招待コードで参加）
3. 世帯設定済み → アプリ本体

状態管理: `useHousehold` フック（`HouseholdProvider` でアプリ全体に提供）  
状態: `'loading' | 'unauthenticated' | 'needs_setup' | 'ready'`

------------------------------------------------------------

## 給与日起算モード

世帯設定で給与日（2〜28日）を設定すると、月別収支・個人支出・予算管理が給与日ベースに切り替わる。

- 例: 給与日=25日 → 「1月分」= 1/25〜2/24
- データ保存は引き続きカレンダー月単位（変更なし）
- 表示時に2ヶ月分のデータを取得してフィルタリングする
- 年間収支はカレンダー月のまま（変更なし）

------------------------------------------------------------

## 開発コマンド

```bash
npm install        # セットアップ
npm run dev        # 開発サーバー起動
npm run build      # ビルド
npm run lint       # Lint
firebase deploy    # Firebase デプロイ（Hosting + Firestore Rules）
firebase deploy --only hosting    # Hosting のみデプロイ
firebase deploy --only firestore  # Firestore Rules のみデプロイ
```

Firebase プロジェクト: `kakeibo-app-478c5`

------------------------------------------------------------

## 設計方針

- 認証・世帯状態は `useHousehold` フックで一元管理し、`Layout.tsx` でガードする
- 世帯データは `households/{householdId}/` 配下、個人データは `users/{uid}/` 配下に分離
- Firestore のパス構築は `firebase/` 以下の関数に集約し、コンポーネントから直接参照しない
- 月別収支はモーダルにて新規入力・編集を受け付ける
- カテゴリ・支払い方法はユーザーが追加・削除可能
- 月別収支画面はデスクトップではグラフと一覧を同時表示、モバイルではタブ切り替え
- キャッシュフロー画面は画面サイズ固定でテーブル内スクロール（ページスクロールなし）
- 過度な責務分離・ファイル分割を避け、関連する UI・ロジック・データ処理は適切な単位でまとめる
- 可読性・保守性を優先する

------------------------------------------------------------

## プロジェクト構成

```
src/
├── components/    再利用可能な UI コンポーネント（Layout, Sidebar, BottomNav 等）
├── pages/         画面単位のコンポーネント
├── features/      機能単位のコンポーネント（TransactionModal, TransactionList 等）
├── hooks/         React カスタムフック
├── firebase/      Firebase 操作関数（Firestore CRUD, Auth）
├── utils/         汎用関数（date.ts 等）
├── types/         TypeScript 型定義
└── styles/        グローバルスタイル
```

------------------------------------------------------------

## 実装ルール

- TypeScript の型定義を適切に行う（any 禁止）
- React Functional Component + Hooks を使用する
- Tailwind CSS でスタイリングする
- 不要なコメントアウトコードを残さない
- console.log を本番コードに残さない
- 命名は分かりやすさを優先する
- Firebase との通信処理は `firebase/` 配下の関数に集約する

------------------------------------------------------------

## 注意事項

- 既存 UI デザインとの整合性を維持する
- 大規模なリファクタリングは事前確認を行う
- セキュリティリスク（XSS, 不正アクセス等）のある実装を避ける
- スマートフォン利用時の操作性を考慮する
- Firestore セキュリティルール（`firestore.rules`）を変更した場合は必ずデプロイする

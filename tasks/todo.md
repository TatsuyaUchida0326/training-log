# Strength Log — feat/add-calendar-view

## Step 1: 計画策定

### 概要
トップ画面にカレンダーを設置し、月切り替えと今日の日付ハイライト、ボトムナビゲーションを実装する。

### 技術設計

#### ファイル構成
```
src/
  types/
    index.ts                   - 型定義
  components/
    Layout/
      Layout.tsx               - ページラッパー（ボトムナビ含む）
      Layout.module.css
    BottomNav/
      BottomNav.tsx            - ボトムナビゲーション
      BottomNav.module.css
    Calendar/
      Calendar.tsx             - 月カレンダーコンポーネント
      Calendar.module.css
  pages/
    HomePage.tsx               - ホーム（カレンダー表示）
    HistoryPage.tsx            - 履歴（プレースホルダー）
    BodyPage.tsx               - 体組成（プレースホルダー）
  App.tsx                      - ルーター設定
  main.tsx                     - エントリーポイント
  index.css                    - グローバルスタイル・CSS変数
```

#### インターフェース定義
```typescript
// types/index.ts
export type TabName = 'home' | 'history' | 'body'

export interface CalendarProps {
  currentDate: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  markedDates?: string[] // 'YYYY-MM-DD' 形式
}

export interface BottomNavProps {
  activeTab: TabName
}
```

#### 依存ライブラリ
- `date-fns`: 日付計算（新規インストール必要）
- `react-router-dom`: ルーティング（インストール済み）
- `vitest` + `@testing-library/react`: テスト（インストール済み）

#### デザイン仕様
| 項目 | 値 |
|---|---|
| アプリ名 | Strength Log |
| メインカラー | #22c55e |
| サブカラー（ホバー） | #16a34a |
| 背景色 | #f9fafb |
| テキスト | #111827 |
| 日曜テキスト | #ef4444（赤） |
| 土曜テキスト | #3b82f6（青） |
| 前後月の日付 | #9ca3af（グレー） |

#### カレンダー仕様
- 今日の日付 → #22c55e 塗りつぶし丸・白テキスト
- トレーニング記録あり → 日付下に小さい緑ドット
- 前月・翌月の日付 → グレー表示
- ヘッダー → 緑背景・白テキスト「Strength Log」

#### ボトムナビ仕様
| タブ | パス |
|---|---|
| ホーム | / |
| 履歴 | /history |
| 体組成 | /body |

### Codexセカンドオピニオン結果
カレンダーUIの自前実装はポートフォリオ観点で妥当。
date-fnsを用いた月カレンダーは明確な実装方針のためスキップ可と判断。

---

## Step 2: 影響範囲分析

### 変更対象ファイル
- `index.html` — タイトル変更・lang="ja"
- `src/App.tsx` — ルーター設定（全面書き換え）
- `src/index.css` — グローバルスタイル（全面書き換え）
- `src/App.css` — 削除（不要）
- 新規: src/types/index.ts
- 新規: src/components/Layout/*
- 新規: src/components/BottomNav/*
- 新規: src/components/Calendar/*
- 新規: src/pages/HomePage.tsx
- 新規: src/pages/HistoryPage.tsx
- 新規: src/pages/BodyPage.tsx

### リスク評価
- 既存機能への影響: なし（App.tsxはデフォルトテンプレートのみ）
- API互換性: なし（新規実装）
- DB変更: なし
- 型安全性: strict: true 設定済み、問題なし

---

## 実装チェックリスト

### 事前準備
- [ ] date-fns インストール
- [ ] vitest 設定（vite.config.ts）
- [ ] index.html 更新

### テスト（Step 3）
- [ ] Calendar コンポーネントのテスト
- [ ] BottomNav コンポーネントのテスト

### 実装（Step 4）
- [ ] src/index.css — CSS変数・グローバルスタイル
- [ ] src/types/index.ts — 型定義
- [ ] src/components/Calendar/Calendar.tsx + .module.css
- [ ] src/components/BottomNav/BottomNav.tsx + .module.css
- [ ] src/components/Layout/Layout.tsx + .module.css
- [ ] src/pages/HomePage.tsx
- [ ] src/pages/HistoryPage.tsx
- [ ] src/pages/BodyPage.tsx
- [ ] src/App.tsx — ルーター設定

### 品質ゲート（Step 5）
- [ ] npm test 全件PASS

### レビュー（Step 6）
- [ ] コードレビュー
- [ ] デザインレビュー

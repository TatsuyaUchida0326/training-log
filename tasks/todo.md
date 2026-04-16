# Strength Log — feat/add-date-detail-page

## Step 1: 計画策定

### 概要
カレンダーの日付タップで詳細ページへ遷移する。
あわせてカレンダーの選択ハイライトを視認しやすく修正する。

### 技術設計

#### ファイル構成
```
src/
  pages/
    DateDetailPage.tsx           - 新規: 日付詳細ページ
    DateDetailPage.module.css    - 新規
  App.tsx                        - /date/:dateStr ルート追加
  pages/HomePage.tsx             - useNavigate で日付タップ時に遷移
  components/Calendar/
    Calendar.module.css          - .selected スタイル修正
```

#### インターフェース定義
```typescript
// /date/:dateStr  (dateStr: 'YYYY-MM-DD')
// DateDetailPage: useParams で dateStr を取得し、date-fns で日本語表示
```

#### UI仕様
- DateDetailPage:
  - Layout 共通ヘッダー（Strength Log）
  - 日付タイトル: 「2026年4月16日（木）」
  - 空状態カード: 「この日のトレーニングはありません」
  - BottomNav あり（Layout 内）
- 選択ハイライト:
  - 現状: background #dcfce7（薄く見づらい）
  - 修正後: box-shadow で緑リング（今日の塗りつぶしと区別できる）

### Codexセカンドオピニオン
シンプルなナビゲーション追加。スキップ可と判断。

---

## Step 2: 影響範囲分析

### 変更対象
- `src/App.tsx` — route追加のみ（既存ルートに影響なし）
- `src/pages/HomePage.tsx` — useNavigate 追加（onDateSelect の挙動変更）
- `src/components/Calendar/Calendar.module.css` — .selected スタイルのみ変更
- 新規: DateDetailPage.tsx / DateDetailPage.module.css

### リスク評価
- 既存テスト影響: Calendar/BottomNav テストは変更なし
- 型安全性: 問題なし

---

## 実装チェックリスト

### テスト（Step 3）
- [ ] DateDetailPage: 有効な dateStr で日本語日付が表示される
- [ ] DateDetailPage: 無効な dateStr でフォールバック表示
- [ ] DateDetailPage: 空状態メッセージが表示される
- [ ] HomePage: 日付クリックで /date/YYYY-MM-DD に遷移する

### 実装（Step 4）
- [ ] src/App.tsx — /date/:dateStr ルート追加
- [ ] src/pages/HomePage.tsx — useNavigate 導入
- [ ] src/pages/DateDetailPage.tsx
- [ ] src/pages/DateDetailPage.module.css
- [ ] src/components/Calendar/Calendar.module.css — .selected 修正

### 品質ゲート（Step 5）
- [ ] npm test 全件PASS

### レビュー（Step 6）
- [ ] コードレビュー
- [ ] デザインレビュー

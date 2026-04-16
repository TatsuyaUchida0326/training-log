# Strength Log — feat/add-settings-page

## Step 1: 計画策定

### 概要
設定ページを実装する。デフォルトセット数（1〜10）と重量単位（kg/lbs）を設定でき、localStorage で永続化する。

### 技術設計

#### ファイル構成
```
src/
  types/
    index.ts                         - Settings型を追加
  hooks/
    useSettings.ts                   - 新規: localStorage読み書きフック
  pages/
    SettingsPage.tsx                 - 本実装（プレースホルダー置き換え）
    SettingsPage.module.css          - 新規
  hooks/
    useSettings.test.ts              - フックのテスト
```

#### インターフェース定義
```typescript
// types/index.ts に追加
export interface Settings {
  defaultSets: number      // 1〜10、デフォルト: 3
  weightUnit: 'kg' | 'lbs' // デフォルト: 'kg'
}

// hooks/useSettings.ts
const STORAGE_KEY = 'strength-log-settings'
export function useSettings(): {
  settings: Settings
  updateDefaultSets: (n: number) => void
  updateWeightUnit: (unit: 'kg' | 'lbs') => void
}
```

#### UI仕様
- セクション「記録設定」
  - 「デフォルトセット数」ラベル + `<select>` (1〜10)
  - 「重量単位」ラベル + トグルボタン (kg / lbs)
- onChange で即時保存（保存ボタンなし）
- デザイン: 既存 CSS変数 (--color-primary, --color-bg 等) を使用

### Codexセカンドオピニオン
設計分岐なし・単純実装のためスキップ可と判断。

---

## Step 2: 影響範囲分析

### 変更対象ファイル
- `src/types/index.ts` — Settings型を追加（既存型に影響なし）
- `src/hooks/useSettings.ts` — 新規
- `src/pages/SettingsPage.tsx` — プレースホルダー → 本実装
- `src/pages/SettingsPage.module.css` — 新規

### 非変更ファイル
- App.tsx（ルーティング済み）
- Layout.tsx（共通レイアウト）
- BottomNav.tsx（settings タブ実装済み）

### リスク評価
- 既存テスト影響: なし
- API互換性: なし
- DB変更: なし（localStorage のみ）

---

## 実装チェックリスト

### テスト（Step 3）
- [ ] useSettings: 初期値が返る
- [ ] useSettings: defaultSets更新 → localstorage に保存
- [ ] useSettings: weightUnit更新 → localStorage に保存
- [ ] useSettings: localStorage既存値を読み込む
- [ ] SettingsPage: デフォルトセット数のselectが表示される
- [ ] SettingsPage: 重量単位トグルが表示される
- [ ] SettingsPage: select変更でuseSettings.updateDefaultSetsが呼ばれる
- [ ] SettingsPage: kg/lbsボタンクリックでupdateWeightUnitが呼ばれる

### 実装（Step 4）
- [ ] src/types/index.ts — Settings型追加
- [ ] src/hooks/useSettings.ts — フック実装
- [ ] src/pages/SettingsPage.tsx — UI実装
- [ ] src/pages/SettingsPage.module.css — スタイル

### 品質ゲート（Step 5）
- [ ] npm test 全件PASS

### レビュー（Step 6）
- [ ] コードレビュー
- [ ] デザインレビュー

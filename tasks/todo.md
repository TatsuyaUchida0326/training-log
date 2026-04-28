# feature/14-exercise-media

## Step 1: Plan

### 概要
Issue #14 の新機能2件をデフォルト種目のみに適用する。

1. **Wikipedia サムネイル画像表示** — 詳細モーダルに種目の画像を追加
2. **YouTube フォーム動画リンクボタン** — デフォルト種目のみ `!isCustom` で制御

### インターフェース定義

```typescript
// useWgerExercise.ts — thumbnailUrl を追加
export interface WgerExerciseData {
  muscles: string[]
  musclesSecondary: string[]
  descriptionJa: string
  thumbnailUrl: string  // Wikipedia サムネイル URL（なければ空文字）
}

// ExerciseDetailModal.tsx — props 変更なし（exercise.isCustom を参照するだけ）
```

### Codex セカンドオピニオン → スキップ
既存機能への追加のみ。設計判断不要な明確な実装。

---

## Step 2: Assess

### 変更対象ファイル

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `src/hooks/useWgerExercise.ts` | 修正 | `WgerExerciseData` に `thumbnailUrl` 追加、`fetchExternalData` で画像URLも取得 |
| `src/components/ExerciseDetailModal/ExerciseDetailModal.tsx` | 修正 | 画像表示 + YouTube リンクボタン追加 |
| `src/components/ExerciseDetailModal/ExerciseDetailModal.module.css` | 修正 | 画像・ボタンのスタイル追加 |

### リスク評価
- `WgerExerciseData` に `thumbnailUrl` を追加 → カスタム種目の `effectiveData` 生成箇所で `thumbnailUrl: ''` の追加が必要（TypeScriptが検出してくれる）
- Wikipedia 画像なし → 空文字のとき画像セクションを非表示にするだけで安全
- YouTube ボタンの誤表示 → `!exercise.isCustom` で厳密制御

---

## Step 2.5: UI/UX 設計

### 画像エリア
- 位置: 対象筋肉セクションの上
- スタイル: `width: 100%`, `max-height: 200px`, `object-fit: cover`, 角丸8px
- 画像なし: セクション全体を非表示

### YouTube ボタン
- 位置: 閉じるボタンの上
- スタイル: 全幅、セカンダリーカラー（既存のボタンと統一感）
- テキスト: 「フォーム動画を見る ↗」
- `target="_blank" rel="noopener noreferrer"` の `<a>` タグ

---

## 実装チェックリスト

### テスト（Step 3）
- [ ] useWgerExercise: Wikipedia が thumbnail を返した場合 thumbnailUrl が入る
- [ ] useWgerExercise: Wikipedia が thumbnail なしで返した場合 thumbnailUrl が空文字
- [ ] ExerciseDetailModal: デフォルト種目で thumbnailUrl あり → img 表示
- [ ] ExerciseDetailModal: デフォルト種目で thumbnailUrl なし → img 非表示
- [ ] ExerciseDetailModal: デフォルト種目 → YouTube リンク表示
- [ ] ExerciseDetailModal: カスタム種目 → YouTube リンク非表示

### 実装（Step 4）
- [ ] useWgerExercise.ts: WgerExerciseData に thumbnailUrl 追加
- [ ] useWgerExercise.ts: fetchExternalData で thumbnail.source を取得
- [ ] ExerciseDetailModal.tsx: thumbnailUrl があれば img を表示
- [ ] ExerciseDetailModal.tsx: !isCustom のとき YouTube リンクボタン表示
- [ ] ExerciseDetailModal.module.css: 画像・ボタンのスタイル追加

### 品質ゲート（Step 5）
- [ ] npm test 全件 PASS
- [ ] npm run build 成功

---

# PR#16 レビュー対応④ — BottomNav → Sidebar 変更

## Step 1: Plan

### 概要
西野さんのレビュー指摘に基づき、BottomNav（ボトムナビ）を左サイドバーに変更する。

### インターフェース定義
- `Sidebar` コンポーネント: `{ activeTab: TabName }` (BottomNavProps と同一)
- `Layout`: props 変更なし、レイアウト flex-row 化

### Codex セカンドオピニオン → スキップ
デザイン確定済み（スクショ提供）。設計判断の余地なし。

## Step 2: Assess

### 変更対象ファイル
| ファイル | 変更種別 |
|---------|---------|
| `src/components/Sidebar/Sidebar.tsx` | 新規作成 |
| `src/components/Sidebar/Sidebar.module.css` | 新規作成 |
| `src/components/Sidebar/Sidebar.test.tsx` | 新規作成 |
| `src/components/Layout/Layout.tsx` | 修正 |
| `src/components/Layout/Layout.module.css` | 修正 |
| `src/components/BottomNav/` | 削除 |
| `src/types/index.ts` | BottomNavProps → SidebarProps リネーム |

### リスク
- BottomNav参照: Layout.tsx・types.ts・BottomNav配下のみ（Routing.test.tsxはコメントのみ）
- padding-bottom: 5rem 除去が必要

## Step 2.5: Design（確定）
- 左サイドバー（ダークネイビー）: 幅160px
  - "Strength Log" タイトル
  - ナビ: ホーム・履歴・体組成・設定 + アイコン
- ヘッダー: 上部固定のまま（ページ名表示）
- メインコンテンツ: サイドバー右側

## 実装チェックリスト
- [ ] Sidebar.tsx 作成
- [ ] Sidebar.module.css 作成
- [ ] Sidebar.test.tsx 作成（BottomNav.test.tsx から移行）
- [ ] Layout.tsx 更新（BottomNav → Sidebar、flex-row）
- [ ] Layout.module.css 更新（横並びレイアウト）
- [ ] types/index.ts 更新（BottomNavProps → SidebarProps）
- [ ] BottomNav ディレクトリ削除
- [ ] 品質ゲート PASS

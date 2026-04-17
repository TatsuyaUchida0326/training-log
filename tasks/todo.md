# Strength Log — feat/add-training-entry

## Step 1: 計画策定

### 概要
種目選択画面・種目追加画面を実装する。
DateDetailPage の FAB から種目選択へ遷移し、種目の一覧表示・追加・削除ができる。

### ルート構造
```
/date/:dateStr/exercises/select   → ExerciseSelectPage
/date/:dateStr/exercises/add      → ExerciseAddPage
```

### データモデル
```typescript
type CategoryId = '胸'|'背中'|'脚'|'肩'|'腕'|'お尻'|'腹筋'|'有酸素運動'|'その他'

interface Exercise {
  id: string
  name: string
  categoryId: CategoryId
  isCustom: boolean
}
```

### ファイル構成
```
src/data/defaultExercises.ts        - デフォルト種目マスター
src/types/index.ts                  - CategoryId / Exercise 型追加
src/hooks/useExercises.ts           - 種目CRUD（localStorage）
src/hooks/useExercises.test.ts
src/pages/ExerciseSelectPage.tsx    - 種目選択画面
src/pages/ExerciseSelectPage.module.css
src/pages/ExerciseSelectPage.test.tsx
src/pages/ExerciseAddPage.tsx       - 種目追加画面
src/pages/ExerciseAddPage.module.css
src/pages/ExerciseAddPage.test.tsx
src/App.tsx                         - ルート追加
src/pages/DateDetailPage.tsx        - FAB navigate 先を更新
```

### UI仕様（スクショ準拠）
- ExerciseSelectPage:
  - ページ内ヘッダーバー: ＜戻る | 種目を選択 | Edit/End
  - 「部位・種目を追加」ボタン（右寄せ）
  - アコーディオン: カテゴリーヘッダー（緑）+ 種目行
  - 初期3件表示、4件以上は「すべて表示」リンク
  - Editモード: 各種目左に「−」削除ボタン
- ExerciseAddPage:
  - ページ内ヘッダーバー: ＜戻る | 種目を追加 | 登録
  - 部位: カテゴリーをselectで選択
  - 種目名: テキスト入力
  - 登録 → useExercises.addExercise → 選択画面に戻る

### Codexセカンドオピニオン
localStorageによる単純CRUD。スキップ可と判断。

---

## Step 2: 影響範囲分析

### 変更対象
- `src/App.tsx` — ルート2件追加
- `src/pages/DateDetailPage.tsx` — FAB navigate先変更（1行）
- `src/types/index.ts` — 型追加

### リスク評価
- 既存テスト40件: 影響なし
- API互換性: なし
- DB変更: なし（localStorage）

---

## 実装チェックリスト

### テスト（Step 3）
- [ ] useExercises: 初回ロードでデフォルト種目が返る
- [ ] useExercises: addExercise でカスタム種目を追加できる
- [ ] useExercises: deleteExercise で種目を削除できる
- [ ] useExercises: localStorage に永続化される
- [ ] ExerciseSelectPage: カテゴリーヘッダーが表示される
- [ ] ExerciseSelectPage: 種目が表示される
- [ ] ExerciseSelectPage: 4件以上で「すべて表示」が表示される
- [ ] ExerciseSelectPage: Editボタンで削除ボタンが表示される
- [ ] ExerciseAddPage: 部位selectと種目名inputが表示される
- [ ] ExerciseAddPage: 登録ボタンでaddExerciseが呼ばれる

### 実装（Step 4）
- [ ] src/data/defaultExercises.ts
- [ ] src/types/index.ts
- [ ] src/hooks/useExercises.ts
- [ ] src/pages/ExerciseSelectPage.tsx + css
- [ ] src/pages/ExerciseAddPage.tsx + css
- [ ] src/App.tsx
- [ ] src/pages/DateDetailPage.tsx

### 品質ゲート（Step 5）
- [ ] npm test 全件PASS

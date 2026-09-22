# 改善 第1弾（2026-09-22〜）— 不具合5件・スマホ対応・公開コードの掃除

計画の正本: `~/.claude/plans/reactive-gliding-abelson.md`（内田さん承認済み 2026-09-22）
レビューの元資料: 2026-09-22 アプリ全体レビュー（担当A/B/C/D＋デザイナー、計8回）

## プロジェクト条件の適用（/develop）

| 条件 | 適用 |
|---|---|
| テストランナー | あり（Vitest）→ Step 3・5 を実施 |
| ブランチ | `develop` はローカル・リモートとも存在せず、過去16 PR はすべて feature → main。既存運用に合わせ `main` から直接切る |
| worktree 隔離 | プロジェクトルール「コミットは指示があるまで行わない」のため、worktree（コミットが前提）ではなく **main 作業ツリー上の feature ブランチ**で作業する。main には触れない |
| セカンドオピニオン | PR#2 の設計は Codex に取得済み（2026-09-22、採否は計画書に記録）。PR#1/#3 は原因が明確な修正のため対象外 |
| Step 9 | Vercel 自動デプロイ。エビデンス保存先なし → 本番URLをヘッドレスブラウザで確認して報告 |

## 進め方の変更（2026-09-22、内田さん指示「遅すぎる」）

- PR#1 の2回目修正後は再レビューを行わず、PM がテスト・ビルド・grep で裏取りし、実機確認は内田さんに渡す
- PR#2・PR#3 のレビューは **4体×1回**（B×2・D×3 の重ね回しはしない）。実測で2回目以降に出るのは仕上げ系（テストヘルパー重複・命名）のみだったため
- 計画からの変更（レビュー対応）: 種目削除後の記録を、日付詳細だけでなくホーム/履歴の印・継続ゲージ・グラフからも除く（`recordsOfExistingExercises`）。内田さん決定

## PR#1 `fix/record-integrity`

- [x] Step 1-2 計画・影響分析（計画書に記載済み）
- [x] Step 3 テスト先行（tester）— 85件追加
- [x] Step 4 実装（implementer）
- [x] Step 5 `npm test` / `npm run build` — 368件PASS
- [x] Step 6 レビュー A/B×2/C/D×3 — P2 5件（吹き出しの空セット・負荷量換算の二重・削除件数・下書きの key・命名/コメント）
- [x] Step 7 修正1回目 → 376件PASS → 再レビュー A/B/C/D
- [ ] Step 7 修正2回目（B/C/D の仕上げ指摘12件＋A の1件）— **2026-09-22 夜に中断**
  - 本体ツリーは修正1回目の状態（28ファイル 376件 PASS・ビルド成功）で一貫している
  - 2回目の編集途中のコピーが `.claude/worktrees/agent-afd2fe0a01f94141b/src` に残っている（テスト実行直前で停止）。**再開時はまずこれと本体を `diff -rq` し、テストが通るなら反映、通らなければ捨てて修正一覧をやり直す**
  - 修正一覧（13件）: ①HomePage のトロフィーも `visibleRecords` を通す ②`TrainingEntryRoute` を `pages/TrainingEntryPage/index.tsx` へ ③DateDetailPage の二重判定を1段に ④HistoryPage の `(r)` 2行と `toDisplayWeight` 共有 ⑤`isFilledSet` / `recordsOfExistingExercises` の doc ⑥`DEFAULT_SETTINGS` export → `seed.ts` で参照 ⑦`useFixedDate`→`setupFixedClock` ⑧空セット理由コメントを定義側に集約 ⑨`seedExercises` / `seedRecords` ⑩同一ファイル内のキー直書き・旧ヘルパー置換 ⑪`emptyDay`→`emptyDayRecords` 等 ⑫`padStart` ⑬**historyStats.ts:53,56 の kg 段階の丸めを外す**（lbs で 45.36kg×1 が詳細100/グラフ99 になる。A 実機）
  - 2回目の後は再レビューしない。PM が `npx vitest run` / `npm run build` / grep で裏取り
- [ ] 内田さんの動作確認（`npm run dev` で: 種目を3つ開いて戻ってもゲージ0 / lbs で欄に出入りしても値が動かない / 削除に confirm / 履歴の吹き出しと日付詳細のセット数が一致）→ コミット指示待ち
- [ ] コミット時の片付け: `.claude/worktrees/agent-*` 3つと `worktree-agent-*` ブランチ3本（4月の2本も含めると5本）を `git worktree remove` / `git branch -D`
- 注意: 未追跡の `Strength Log 仕様書*.xlsx` / `docs/` はこの PR の作業物ではない。コミット時に `git add -A` しない（4章の判断待ち）

## PR#2 `feat/mobile-layout`

- [ ] Step 2.5 デザイナーのモックアップ → 内田さん確認
- [ ] Step 3〜7
- [ ] 内田さんの動作確認 → コミット指示待ち

## PR#3 `chore/portfolio-cleanup`

- [ ] Step 3〜7
- [ ] 内田さんの動作確認 → コミット指示待ち

## 持ち越し（今回やらない）

計画書「今回やらないこと」を参照。

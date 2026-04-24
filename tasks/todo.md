# feat/body-trend-chart

## Step 1: Plan

### 概要
① BodySettings に目標体脂肪率を追加
② ホームに体組成トレンドグラフ（体重・体脂肪率）を追加

### インターフェース定義
```typescript
// BodySettings 型に追加
targetBodyFat: number  // % (0 = 未設定)

// 新規 BodyTrendChart props
interface BodyTrendChartProps {
  records: BodyRecord[]      // 全体組成記録
  targetWeight: number       // 目標体重 kg (0=未設定)
  targetBodyFat: number      // 目標体脂肪率 % (0=未設定)
}
```

### グラフ仕様
- recharts 使用（既存ライブラリ）
- 体重グラフ（上）: weight ライン + targetWeight ReferenceLine（点線）
- 体脂肪率グラフ（下）: bodyFat ライン + targetBodyFat ReferenceLine（点線）
- 直近30件（記録あり日のみ）、各高さ130px
- データなし時は非表示
- 配置: HomePage の gaugeRow 下・summary 上

### Codexセカンドオピニオン → スキップ（明確な実装）

---

## Step 2: Assess

### 変更対象
- NEW: src/components/BodyTrendChart/BodyTrendChart.tsx
- NEW: src/components/BodyTrendChart/BodyTrendChart.module.css
- NEW: src/components/BodyTrendChart/BodyTrendChart.test.tsx
- MOD: src/types/index.ts — targetBodyFat 追加
- MOD: src/hooks/useBodySettings.ts — DEFAULT_SETTINGS 更新
- MOD: src/hooks/useBodySettings.test.ts — テスト更新
- MOD: src/pages/BodyPage.tsx — 目標体脂肪率入力欄追加
- MOD: src/pages/HomePage.tsx — BodyTrendChart 追加

### リスク評価
- localStorage 後方互換: load() の spread で targetBodyFat:0 がデフォルト補完 → OK
- 既存テスト: useBodySettings.test.ts の「初期値」テストを更新が必要

---

## 実装チェックリスト

### テスト（Step 3）
- [ ] BodyTrendChart: 体重データがある場合にグラフが表示される
- [ ] BodyTrendChart: 体脂肪率データがある場合にグラフが表示される
- [ ] BodyTrendChart: targetWeight>0 の場合に基準線ラベル「目標」が表示される
- [ ] BodyTrendChart: targetBodyFat>0 の場合に基準線ラベル「目標」が表示される
- [ ] BodyTrendChart: 全データが空の場合は何も表示しない
- [ ] useBodySettings: 初期値に targetBodyFat=0 が含まれる
- [ ] useBodySettings: targetBodyFat を更新できる

### 実装（Step 4）
- [ ] types/index.ts: targetBodyFat 追加
- [ ] useBodySettings: DEFAULT_SETTINGS 更新
- [ ] BodyPage: 目標体脂肪率入力欄追加
- [ ] BodyTrendChart コンポーネント
- [ ] HomePage: BodyTrendChart 組み込み

### 品質ゲート（Step 5）
- [ ] npm test 全件 PASS
- [ ] npm run build 成功

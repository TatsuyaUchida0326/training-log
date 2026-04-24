// デフォルト種目の筋肉情報を静的に管理するマップ
// wger REST APIが廃止されたため静的データで代替。正確性を担保しつつAPIリクエストを削減できる。
// description を持つ種目は Wikipedia API を呼ばずにこの文字列を直接表示する

interface MuscleData {
  muscles: string[]          // 対象筋肉（主動筋）
  musclesSecondary: string[] // 補助筋（協働筋）
  description?: string       // 静的説明文（省略時は Wikipedia API で取得）
}

export const EXERCISE_MUSCLE_MAP: Record<string, MuscleData> = {
  // ── 胸 ──────────────────────────────────────────────────────────────
  'ベンチプレス':                      { muscles: ['大胸筋'],              musclesSecondary: ['上腕三頭筋', '三角筋前部'] },
  'インクラインベンチプレス':          { muscles: ['大胸筋（上部）'],       musclesSecondary: ['上腕三頭筋', '三角筋前部'] },
  'デクラインベンチプレス':            { muscles: ['大胸筋（下部）'],       musclesSecondary: ['上腕三頭筋', '三角筋前部'] },
  'ダンベルフライ':                    { muscles: ['大胸筋'],              musclesSecondary: ['三角筋前部'] },
  'ケーブルクロスオーバー':            { muscles: ['大胸筋'],              musclesSecondary: ['三角筋前部'] },
  'プッシュアップ':                    { muscles: ['大胸筋'],              musclesSecondary: ['上腕三頭筋', '三角筋前部'] },
  'ディップス':                        { muscles: ['大胸筋', '上腕三頭筋'], musclesSecondary: ['三角筋前部'] },
  'チェストプレス':                    { muscles: ['大胸筋'],              musclesSecondary: ['上腕三頭筋', '三角筋前部'] },
  'ペックフライ':                      { muscles: ['大胸筋'],              musclesSecondary: ['三角筋前部'] },
  // ── 背中 ─────────────────────────────────────────────────────────────
  'デッドリフト':                      { muscles: ['脊柱起立筋', '大臀筋', 'ハムストリングス'], musclesSecondary: ['僧帽筋', '広背筋'] },
  '懸垂':                              { muscles: ['広背筋'],              musclesSecondary: ['上腕二頭筋', '僧帽筋'] },
  'チンアップ':                        { muscles: ['広背筋'],              musclesSecondary: ['上腕二頭筋'] },
  'ラットプルダウン':                  { muscles: ['広背筋'],              musclesSecondary: ['上腕二頭筋', '菱形筋'] },
  'シーテッドロウ':                    { muscles: ['広背筋', '菱形筋'],     musclesSecondary: ['上腕二頭筋', '僧帽筋'] },
  'バーベルロウ':                      { muscles: ['広背筋', '僧帽筋'],     musclesSecondary: ['上腕二頭筋', '脊柱起立筋'] },
  'ダンベルロウ':                      { muscles: ['広背筋', '菱形筋'],     musclesSecondary: ['上腕二頭筋'] },
  'フェイスプル':                      { muscles: ['三角筋後部', '菱形筋'], musclesSecondary: ['僧帽筋'] },
  'プーリーロー':                      { muscles: ['広背筋', '菱形筋'],     musclesSecondary: ['上腕二頭筋', '僧帽筋'] },
  'ベントオーバーロウ':                { muscles: ['広背筋', '僧帽筋', '菱形筋'], musclesSecondary: ['上腕二頭筋', '脊柱起立筋'] },
  // ── 脚 ──────────────────────────────────────────────────────────────
  'スクワット':                        { muscles: ['大腿四頭筋', '大臀筋'], musclesSecondary: ['ハムストリングス', '脊柱起立筋'] },
  'レッグプレス':                      { muscles: ['大腿四頭筋', '大臀筋'], musclesSecondary: ['ハムストリングス'] },
  'ランジ':                            { muscles: ['大腿四頭筋', '大臀筋'], musclesSecondary: ['ハムストリングス'] },
  'ルーマニアンデッドリフト':          { muscles: ['ハムストリングス', '大臀筋'], musclesSecondary: ['脊柱起立筋'] },
  'レッグカール':                      { muscles: ['ハムストリングス'],     musclesSecondary: [] },
  'レッグエクステンション':            { muscles: ['大腿四頭筋'],           musclesSecondary: [] },
  'カーフレイズ':                      { muscles: ['腓腹筋'],              musclesSecondary: ['ヒラメ筋'] },
  'ブルガリアンスクワット':            { muscles: ['大腿四頭筋', '大臀筋'], musclesSecondary: ['ハムストリングス'] },
  // ── 肩 ──────────────────────────────────────────────────────────────
  'ショルダープレス':                  { muscles: ['三角筋'],              musclesSecondary: ['上腕三頭筋', '僧帽筋'] },
  'アーノルドプレス':                  { muscles: ['三角筋'],              musclesSecondary: ['上腕三頭筋'] },
  'サイドレイズ':                      { muscles: ['三角筋（側部）'],       musclesSecondary: ['僧帽筋'] },
  'フロントレイズ':                    { muscles: ['三角筋（前部）'],       musclesSecondary: [] },
  'リアデルトフライ':                  { muscles: ['三角筋（後部）'],       musclesSecondary: ['菱形筋'] },
  // ── 腕 ──────────────────────────────────────────────────────────────
  'バーベルカール':                    { muscles: ['上腕二頭筋'],           musclesSecondary: ['上腕筋', '腕橈骨筋'] },
  'ダンベルカール':                    { muscles: ['上腕二頭筋'],           musclesSecondary: ['上腕筋'] },
  'ハンマーカール':                    { muscles: ['上腕筋', '腕橈骨筋'],   musclesSecondary: ['上腕二頭筋'] },
  'トライセプスプッシュダウン':        { muscles: ['上腕三頭筋'],           musclesSecondary: [] },
  'スカルクラッシャー':                { muscles: ['上腕三頭筋'],           musclesSecondary: [] },
  'オーバーヘッドトライセプスエクステンション': { muscles: ['上腕三頭筋'], musclesSecondary: [] },
  'プリーチャーカール':                { muscles: ['上腕二頭筋'],           musclesSecondary: ['上腕筋'] },
  'トライセップスエクステンション':    { muscles: ['上腕三頭筋'],           musclesSecondary: [] },
  'トライセップスプレスダウン':        { muscles: ['上腕三頭筋'],           musclesSecondary: [] },
  // ── お尻 ─────────────────────────────────────────────────────────────
  'ヒップスラスト':                    { muscles: ['大臀筋'],              musclesSecondary: ['ハムストリングス'] },
  'グルートキックバック':              { muscles: ['大臀筋'],              musclesSecondary: [] },
  'グルートブリッジ':                  { muscles: ['大臀筋'],              musclesSecondary: ['ハムストリングス'] },
  // ── 腹筋 ─────────────────────────────────────────────────────────────
  'クランチ':                          { muscles: ['腹直筋'],              musclesSecondary: [] },
  'プランク':                          { muscles: ['腹横筋'],              musclesSecondary: ['腹直筋', '脊柱起立筋'] },
  'サイドプランク':                    { muscles: ['腹斜筋'],              musclesSecondary: ['腹横筋'] },
  'レッグレイズ':                      { muscles: ['腹直筋（下部）'],       musclesSecondary: ['腸腰筋'] },
  'ロシアンツイスト':                  { muscles: ['腹斜筋'],              musclesSecondary: ['腹直筋'] },
  // ── 有酸素運動（Wikipedia記事が少ないため説明文を静的に内蔵）────────────
  'ランニング': {
    muscles: [],
    musclesSecondary: [],
    description: 'ランニングは全身持久力を高める代表的な有酸素運動。心肺機能の強化とカロリー消費に優れ、継続することで体脂肪の燃焼効果が高まる。ペースや距離を変えることで運動強度を自由にコントロールできる。',
  },
  'ウォーキング': {
    muscles: [],
    musclesSecondary: [],
    description: 'ウォーキングは低強度の有酸素運動で、関節への負担が少なく幅広い年齢層・体力レベルに適している。継続的に行うことで心肺機能の向上・基礎代謝の改善・体脂肪の緩やかな減少が期待できる。',
  },
  'サイクリング': {
    muscles: ['大腿四頭筋', 'ハムストリングス', '腓腹筋'],
    musclesSecondary: ['大臀筋'],
    description: 'サイクリングは下半身の筋肉を中心に使う有酸素運動。膝関節への負担が少なく、脚の筋持久力と心肺機能を同時に鍛えられる。強度の調整が容易で、ゆったりとした移動からハードなトレーニングまで幅広く対応できる。',
  },
}

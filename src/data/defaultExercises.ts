import type { Exercise, CategoryId } from '../types'

export const CATEGORIES: CategoryId[] = [
  '胸', '背中', '脚', '肩', '腕', 'お尻', '腹筋', '有酸素運動',
]

const raw: { name: string; categoryId: CategoryId }[] = [
  // 胸
  { name: 'ベンチプレス', categoryId: '胸' },
  { name: 'インクラインベンチプレス', categoryId: '胸' },
  { name: 'ペックフライ', categoryId: '胸' },
  { name: 'チェストプレス', categoryId: '胸' },
  { name: 'ダンベルフライ', categoryId: '胸' },
  { name: 'ディップス', categoryId: '胸' },
  // 背中
  { name: 'デッドリフト', categoryId: '背中' },
  { name: 'ラットプルダウン', categoryId: '背中' },
  { name: 'プーリーロー', categoryId: '背中' },
  { name: 'ベントオーバーロウ', categoryId: '背中' },
  { name: 'シーテッドロウ', categoryId: '背中' },
  { name: 'チンアップ', categoryId: '背中' },
  // 脚
  { name: 'スクワット', categoryId: '脚' },
  { name: 'レッグプレス', categoryId: '脚' },
  { name: 'レッグカール', categoryId: '脚' },
  { name: 'レッグエクステンション', categoryId: '脚' },
  { name: 'カーフレイズ', categoryId: '脚' },
  { name: 'ランジ', categoryId: '脚' },
  // 肩
  { name: 'ショルダープレス', categoryId: '肩' },
  { name: 'サイドレイズ', categoryId: '肩' },
  { name: 'フロントレイズ', categoryId: '肩' },
  { name: 'リアデルトフライ', categoryId: '肩' },
  { name: 'アーノルドプレス', categoryId: '肩' },
  // 腕
  { name: 'バーベルカール', categoryId: '腕' },
  { name: 'ハンマーカール', categoryId: '腕' },
  { name: 'トライセップスエクステンション', categoryId: '腕' },
  { name: 'プリーチャーカール', categoryId: '腕' },
  { name: 'トライセップスプレスダウン', categoryId: '腕' },
  // お尻
  { name: 'ヒップスラスト', categoryId: 'お尻' },
  { name: 'グルートブリッジ', categoryId: 'お尻' },
  { name: 'ルーマニアンデッドリフト', categoryId: 'お尻' },
  { name: 'ブルガリアンスクワット', categoryId: 'お尻' },
  // 腹筋
  { name: 'クランチ', categoryId: '腹筋' },
  { name: 'プランク', categoryId: '腹筋' },
  { name: 'レッグレイズ', categoryId: '腹筋' },
  { name: 'ロシアンツイスト', categoryId: '腹筋' },
  // 有酸素運動
  { name: 'ランニング', categoryId: '有酸素運動' },
  { name: 'ウォーキング', categoryId: '有酸素運動' },
  { name: 'サイクリング', categoryId: '有酸素運動' },
  { name: 'ロープジャンプ', categoryId: '有酸素運動' },
]

export const DEFAULT_EXERCISES: Exercise[] = raw.map((e, i) => ({
  id: `default-${i}`,
  name: e.name,
  categoryId: e.categoryId,
  isCustom: false,
}))

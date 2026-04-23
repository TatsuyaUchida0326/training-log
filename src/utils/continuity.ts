import type { TrainingRecord } from '../types'

/**
 * 指定した達成条件（種目数・セット数）を満たした日付の一覧を昇順で返す。
 *
 * ContinuityGauge のカラー判定（達成日のハイライト）と
 * calcContinuityStreak のインプットとして使用する。
 *
 * @param records - 全トレーニング記録
 * @param requiredExercises - 達成とみなす最低種目数（SettingsPage で変更可能）
 * @param requiredSets - 達成とみなす最低セット数（SettingsPage で変更可能）
 * @returns 条件を満たした日付の配列（'YYYY-MM-DD' 形式・昇順）
 */
export function getQualifyingDates(
  records: TrainingRecord[],
  requiredExercises: number,
  requiredSets: number,
): string[] {
  const byDate = new Map<string, TrainingRecord[]>()
  for (const r of records) {
    if (!byDate.has(r.date)) byDate.set(r.date, [])
    byDate.get(r.date)!.push(r)
  }

  return Array.from(byDate.entries())
    .filter(([, dayRecords]) => {
      const qualified = dayRecords.filter((r) => r.sets.length >= requiredSets)
      return qualified.length >= requiredExercises
    })
    .map(([date]) => date)
    .sort()
}

/**
 * トレーニング記録から継続力ストリーク（連続達成日数）を計算する。
 *
 * 継続力ゲージ（ContinuityGauge）の数値として使用するコア関数。
 * ユーザーのモチベーション維持を目的に、連続して目標を達成した日数を可視化する。
 *
 * ### 達成条件
 * 1日に `requiredSets` セット以上こなした種目が `requiredExercises` 種目以上あること。
 * どちらも SettingsPage から変更可能で、ユーザーの目標強度に合わせて調整できる。
 *
 * ### カウントルール
 * - 同日に何種目追加しても +1 まで（1日の上限 = 1）
 * - 達成日同士の間隔が `resetDays` 日以上空くとストリークを 0 にリセット
 * - デフォルトの resetDays は 10（週1〜2回ペースでも維持できる設計）
 *
 * @param records - 全トレーニング記録
 * @param requiredExercises - 達成とみなす最低種目数
 * @param requiredSets - 達成とみなす最低セット数
 * @param resetDays - この日数以上空いたらリセット（デフォルト 10）
 * @returns 現在の継続力ストリーク日数
 */
export function calcContinuityStreak(
  records: TrainingRecord[],
  requiredExercises: number,
  requiredSets: number,
  resetDays = 10,
): number {
  const qualifyingDates = getQualifyingDates(records, requiredExercises, requiredSets)

  if (qualifyingDates.length === 0) return 0

  // 最後の達成日から今日までが resetDays 以上空いていればリセット済み
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const lastDate = new Date(qualifyingDates[qualifyingDates.length - 1])
  lastDate.setHours(0, 0, 0, 0)
  const daysSinceLast = Math.round(
    (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (daysSinceLast >= resetDays) return 0

  // 最新の達成日から遡ってストリークをカウント
  let streak = 1
  for (let i = qualifyingDates.length - 1; i > 0; i--) {
    const curr = new Date(qualifyingDates[i])
    const prev = new Date(qualifyingDates[i - 1])
    curr.setHours(0, 0, 0, 0)
    prev.setHours(0, 0, 0, 0)
    const gap = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24),
    )
    if (gap < resetDays) {
      streak++
    } else {
      break
    }
  }

  return streak
}

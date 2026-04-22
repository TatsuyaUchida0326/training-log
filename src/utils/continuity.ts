import type { TrainingRecord } from '../types'

/** 条件を満たした達成日の一覧を返す（カレンダーの色分けに使用）。 */
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
 * 達成条件: 1日に requiredSets セット以上こなした種目が requiredExercises 種目以上。
 * リセット条件: 達成日が resetDays 日以上途切れるとストリークを 0 にリセット。
 * 1日の上限は +1（同日に何セット追加しても当日分は1カウント）。
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

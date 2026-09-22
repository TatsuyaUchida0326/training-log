import type { TrainingRecord, TrainingSet, Exercise, WeightUnit } from '../types'

const LBS_PER_KG = 2.20462

/**
 * 中身のあるセットか判定する。
 * 回数が無いセットは実施していないとみなす（RM・負荷量とも 0 になる）。
 * 重さ 0 の自重種目を除外しないため、重さは見ない。
 * 旧バージョンが保存した空行も、この判定で無害化する。
 */
export function isFilledSet(set: TrainingSet): boolean {
  return set.reps > 0
}

/** 記録の中から中身のあるセットだけを元の並び順で返す */
export function filledSets(record: TrainingRecord): TrainingSet[] {
  return record.sets.filter(isFilledSet)
}

/** 中身のあるセットを1つでも持つ記録か判定する */
export function hasFilledSets(record: TrainingRecord): boolean {
  return record.sets.some(isFilledSet)
}

/**
 * 種目一覧に残っている種目の記録だけを返す。
 * 削除済み種目の記録を集計・カレンダーの印から外すための関数。
 */
export function recordsOfExistingExercises(
  records: TrainingRecord[],
  exercises: Exercise[],
): TrainingRecord[] {
  const existingIds = new Set(exercises.map((exercise) => exercise.id))
  return records.filter((record) => existingIds.has(record.exerciseId))
}

// Epley 公式: 1RM = weight × (1 + reps / 30)
export function calcRM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10
}

/**
 * 全記録から種目別の歴代最高1RMと更新日を返す（RM降順）。
 * date は 'YYYY-MM-DD' 形式で返す。
 */
export function getBest1RMs(
  records: TrainingRecord[],
  exercises: Exercise[],
): { exerciseName: string; rm: number; date: string }[] {
  const best = new Map<string, { rm: number; date: string }>()

  for (const record of records) {
    for (const set of record.sets) {
      const rm = calcRM(set.weight, set.reps)
      if (rm <= 0) continue
      const current = best.get(record.exerciseId)
      if (!current || rm > current.rm) {
        best.set(record.exerciseId, { rm, date: record.date })
      }
    }
  }

  return Array.from(best.entries())
    .map(([exerciseId, { rm, date }]) => {
      const ex = exercises.find((e) => e.id === exerciseId)
      return ex ? { exerciseName: ex.name, rm, date } : null
    })
    .filter((t): t is { exerciseName: string; rm: number; date: string } => t !== null)
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** 全角数字・小数点・マイナスを半角に変換する */
export function toHalfWidth(str: string): string {
  return str
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/．/g, '.')
    .replace(/－/g, '-')
}

export function kgToLbs(kg: number): number {
  return Math.round(kg * LBS_PER_KG * 10) / 10
}

export function lbsToKg(lbs: number): number {
  return Math.round((lbs / LBS_PER_KG) * 100) / 100
}

export function displayWeight(weightKg: number, unit: WeightUnit): number {
  return unit === 'lbs' ? kgToLbs(weightKg) : weightKg
}

/**
 * 負荷量（kg 保存）を表示単位の整数にする。
 * 小数に丸めてから整数に丸め直すと値がずれるため、換算と丸めを一度に行う。
 */
export function displayVolume(volumeKg: number, unit: WeightUnit): number {
  return Math.round(unit === 'lbs' ? volumeKg * LBS_PER_KG : volumeKg)
}

export function inputToKg(value: number, unit: WeightUnit): number {
  return unit === 'lbs' ? lbsToKg(value) : value
}

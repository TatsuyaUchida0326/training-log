import type { TrainingRecord, Exercise } from '../types'

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
  return Math.round(kg * 2.20462 * 10) / 10
}

export function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.20462) * 100) / 100
}

export function displayWeight(weightKg: number, unit: 'kg' | 'lbs'): number {
  return unit === 'lbs' ? kgToLbs(weightKg) : weightKg
}

export function inputToKg(value: number, unit: 'kg' | 'lbs'): number {
  return unit === 'lbs' ? lbsToKg(value) : value
}

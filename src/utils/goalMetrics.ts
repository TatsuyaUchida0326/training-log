import type { BodySettings, GoalMetric } from '../types'

/** 項目と、目標を持つ設定項目の対応。表示順（体重 → 体脂肪率 → 筋肉量）もこの並び */
export const GOAL_TARGET_FIELDS = {
  weight: 'targetWeight',
  bodyFat: 'targetBodyFat',
  muscleMass: 'targetMuscleMassKg',
} as const satisfies Record<GoalMetric, keyof BodySettings>

/** 目標を持てる項目。表示順 */
export const GOAL_METRICS = Object.keys(GOAL_TARGET_FIELDS) as GoalMetric[]

export const METRIC_LABELS: Record<GoalMetric, string> = {
  weight: '体重',
  bodyFat: '体脂肪率',
  muscleMass: '筋肉量',
}

export const METRIC_UNITS: Record<GoalMetric, string> = {
  weight: 'kg',
  bodyFat: '%',
  muscleMass: 'kg',
}

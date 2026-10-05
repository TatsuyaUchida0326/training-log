import type { BodyRecord, BodySettings, GoalBaselines, GoalMetric } from '../types'
import { calcBody } from './body'

export type GoalStatus = 'decrease' | 'increase' | 'achieved'

export interface GoalProgress {
  metric: GoalMetric
  current: number   // 現在の値（体重 kg・体脂肪率 %・筋肉量 kg）
  target: number
  remaining: number // 目標までの残り（0 以上、小数1桁）
  status: GoalStatus
}

type GoalValues = Partial<Record<GoalMetric, number>>

// 画面に出す順
const GOAL_METRICS: GoalMetric[] = ['weight', 'bodyFat', 'muscleMass']

function targetOf(metric: GoalMetric, settings: BodySettings): number {
  switch (metric) {
    case 'weight':
      return settings.targetWeight
    case 'bodyFat':
      return settings.targetBodyFat
    case 'muscleMass':
      return settings.targetMuscleMass
  }
}

/** 小数1桁に丸める。68.2 - 65 のような引き算の誤差（3.2000000000000028）を先に落としてから丸める */
function roundToOneDecimal(value: number): number {
  return Math.round(Number((value * 10).toPrecision(12))) / 10
}

/** 筋肉量を kg で返す。単位が % のときは、体重が同じ日に無いと換算できないので null */
function muscleMassKgOf(record: BodyRecord, settings: BodySettings): number | null {
  // calcBody は kg 単位でも体重を必須にするが、kg で記録している人は体重なしでも筋肉量を比べられる
  if (settings.muscleMassUnit === 'kg') return record.muscleMass
  return calcBody(record, settings).muscleMassKg
}

/**
 * 項目ごとの現在値。その項目が入っている一番新しい日付の記録から取る（配列の並びには依存しない）。
 * 一度も記録していない項目は含めない。
 */
export function latestGoalValues(records: BodyRecord[], settings: BodySettings): GoalValues {
  // 日付は 'YYYY-MM-DD' なので文字列比較で新しい順になる。元の配列は並べ替えない
  const newestFirst = [...records].sort((a, b) => b.date.localeCompare(a.date))
  const readers: Record<GoalMetric, (record: BodyRecord) => number | null> = {
    weight: (record) => record.weight,
    bodyFat: (record) => record.bodyFat,
    muscleMass: (record) => muscleMassKgOf(record, settings),
  }

  const values: GoalValues = {}
  for (const metric of GOAL_METRICS) {
    for (const record of newestFirst) {
      const value = readers[metric](record)
      if (value !== null) {
        values[metric] = value
        break
      }
    }
  }
  return values
}

/** 保存データが壊れていても落ちないよう、数値の baseline だけを取り出す */
function validBaselines(baselines: unknown): GoalValues {
  const valid: GoalValues = {}
  if (typeof baselines !== 'object' || baselines === null || Array.isArray(baselines)) return valid
  const source = baselines as Record<string, unknown>
  for (const metric of GOAL_METRICS) {
    const value = source[metric]
    if (typeof value === 'number' && Number.isFinite(value)) valid[metric] = value
  }
  return valid
}

/**
 * 減らす目標か増やす目標か。向きは目標を入れた時点の値（baseline）で決める。
 * その場の差だけで決めると、65kg を目指して 64.5kg になった人に「あと 0.5kg 増」と出てしまうため。
 * baseline が無い・目標と同じ値のときは向きを決められないので、現在値と目標の差の符号に従う。
 */
function directionOf(
  current: number,
  target: number,
  baseline: number | undefined,
): 'decrease' | 'increase' {
  const hasDirection = baseline !== undefined && roundToOneDecimal(baseline) !== roundToOneDecimal(target)
  const reference = hasDirection ? baseline : current
  return reference > target ? 'decrease' : 'increase'
}

/**
 * ホームに出す「目標までの残り」。目標を設定した項目のうち、現在値がある項目だけを
 * 体重 → 体脂肪率 → 筋肉量の順で返す。何も無ければ空（目標を設定しない人には何も出さない）。
 */
export function calcGoalProgress(records: BodyRecord[], settings: BodySettings): GoalProgress[] {
  const currents = latestGoalValues(records, settings)
  const baselines = validBaselines(settings.goalBaselines)
  const goals: GoalProgress[] = []

  for (const metric of GOAL_METRICS) {
    const target = targetOf(metric, settings)
    const current = currents[metric]
    if (!(target > 0) || current === undefined) continue

    const remaining = roundToOneDecimal(Math.abs(current - target))
    const direction = directionOf(current, target, baselines[metric])
    const reached = direction === 'decrease' ? current <= target : current >= target
    // 丸めて 0 になる差は、画面に「あと 0.0」と出てしまうので達成として扱う
    const achieved = reached || remaining === 0

    goals.push({
      metric,
      current,
      target,
      remaining: achieved ? 0 : remaining,
      status: achieved ? 'achieved' : direction,
    })
  }
  return goals
}

/**
 * 目標を変えたときの baseline の更新。元の baselines は書き換えず新しいオブジェクトを返す。
 * 目標が 0（未設定）または現在値が無いときは、その項目の古い向きを引きずらないよう取り除く。
 */
export function withGoalBaseline(
  baselines: GoalBaselines,
  metric: GoalMetric,
  target: number,
  current: number | undefined,
): GoalBaselines {
  const next = validBaselines(baselines)
  if (target > 0 && current !== undefined) {
    next[metric] = current
  } else {
    delete next[metric]
  }
  return next
}

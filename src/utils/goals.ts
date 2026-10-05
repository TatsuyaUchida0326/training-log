import type {
  BodyRecord,
  BodySettings,
  GoalBaselines,
  GoalMetric,
  GoalValues,
} from '../types'
import { calcBody } from './body'
import { roundToOneDecimal } from './number'
import { isPlainObject } from './storage'

export type GoalDirection = 'decrease' | 'increase'
export type GoalStatus = GoalDirection | 'achieved'

export interface GoalProgress {
  metric: GoalMetric
  current: number   // 現在の値。画面に出す小数1桁の値（体重 kg・体脂肪率 %・筋肉量 kg）
  target: number    // 目標の値。小数1桁
  remaining: number // 目標までの残り（0 以上）。current と target の差と一致する
  status: GoalStatus
}

/** 項目と、目標を持つ設定項目の対応。表示順（体重 → 体脂肪率 → 筋肉量）もこの並び */
export const GOAL_TARGET_FIELDS = {
  weight: 'targetWeight',
  bodyFat: 'targetBodyFat',
  muscleMass: 'targetMuscleMassKg',
} as const satisfies Record<GoalMetric, keyof BodySettings>

const GOAL_METRICS = Object.keys(GOAL_TARGET_FIELDS) as GoalMetric[]

/** localStorage の値は型どおりとは限らない。文字列・null・NaN などで計算が壊れないよう、数値として使えるかを見る */
export function isUsableNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** 設定した目標。未設定（0）や数値でない値は 0 として返す */
function targetOf(metric: GoalMetric, settings: BodySettings): number {
  const target = settings[GOAL_TARGET_FIELDS[metric]]
  return isUsableNumber(target) && target > 0 ? target : 0
}

function usableOrNull(value: unknown): number | null {
  return isUsableNumber(value) ? value : null
}

/**
 * 項目ごとの現在値。その項目が入っている一番新しい日付の記録から取る（配列の並びには依存しない）。
 * 一度も記録していない項目、数値でない値の日は「値なし」として古い日へ遡る。丸めない（baseline に生の値を残すため）。
 */
export function latestMeasuredValues(records: BodyRecord[], settings: BodySettings): GoalValues {
  // 日付は 'YYYY-MM-DD' なので文字列比較で新しい順になる。元の配列は並べ替えない
  const newestFirst = [...records].sort((a, b) => b.date.localeCompare(a.date))
  const readers: Record<GoalMetric, (record: BodyRecord) => number | null> = {
    weight: (record) => usableOrNull(record.weight),
    bodyFat: (record) => usableOrNull(record.bodyFat),
    muscleMass: (record) =>
      calcBody(
        { ...record, weight: usableOrNull(record.weight), muscleMass: usableOrNull(record.muscleMass) },
        settings,
      ).muscleMassKg,
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
function validBaselines(baselines: unknown): GoalBaselines {
  const valid: GoalBaselines = {}
  if (!isPlainObject(baselines)) return valid
  for (const metric of GOAL_METRICS) {
    const value = baselines[metric]
    if (isUsableNumber(value)) valid[metric] = value
  }
  return valid
}

/**
 * 減らす目標か増やす目標か。向きは目標を入れた時点の値（baseline）で決める。
 * その場の差だけで決めると、65kg を目指して 64.5kg になった人に「あと 0.5kg 増」と出てしまうため。
 * baseline が無い・目標と同じ値のときは向きを決められないので、現在値と目標の差の符号に従う。
 */
function directionOf(current: number, target: number, baseline: number | undefined): GoalDirection {
  const baselineShowsDirection =
    baseline !== undefined && roundToOneDecimal(baseline) !== target
  const reference = baselineShowsDirection ? baseline : current
  return reference > target ? 'decrease' : 'increase'
}

/**
 * ホームに出す「目標までの残り」。目標を設定した項目のうち、現在値がある項目だけを
 * 体重 → 体脂肪率 → 筋肉量の順で返す。何も無ければ空（目標を設定しない人には何も出さない）。
 * 画面には小数1桁で出すので、丸めた値どうしで残りと達成を決める（画面の引き算と合わせるため）。
 */
export function calcGoalProgress(records: BodyRecord[], settings: BodySettings): GoalProgress[] {
  const measured = latestMeasuredValues(records, settings)
  const baselines = validBaselines(settings.goalBaselines)
  const goals: GoalProgress[] = []

  for (const metric of GOAL_METRICS) {
    const rawTarget = targetOf(metric, settings)
    const rawCurrent = measured[metric]
    if (rawTarget === 0 || rawCurrent === undefined) continue

    const target = roundToOneDecimal(rawTarget)
    const current = roundToOneDecimal(rawCurrent)
    const direction = directionOf(current, target, baselines[metric])
    const achieved = direction === 'decrease' ? current <= target : current >= target

    goals.push({
      metric,
      current,
      target,
      remaining: achieved ? 0 : roundToOneDecimal(Math.abs(current - target)),
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

/**
 * 目標はあるのに baseline が無い項目を、いまの値で埋める。埋める項目が無ければ null。既にある baseline は変えない。
 * 画面は上から「目標 → 計測値」の順なので、目標を先に入れて記録が後になる人が多い。
 * この機能より前に目標を入れていた人も、これで向きが決まる。
 */
export function fillMissingGoalBaselines(
  settings: BodySettings,
  currents: GoalValues,
): GoalBaselines | null {
  const baselines = validBaselines(settings.goalBaselines)
  let filled = false

  for (const metric of GOAL_METRICS) {
    const current = currents[metric]
    if (targetOf(metric, settings) > 0 && baselines[metric] === undefined && isUsableNumber(current)) {
      baselines[metric] = current
      filled = true
    }
  }
  return filled ? baselines : null
}

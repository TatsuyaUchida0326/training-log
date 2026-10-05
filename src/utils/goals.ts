import type { BodyRecord, BodySettings, GoalBaselines, GoalMetric, GoalValues } from '../types'
import {
  contestBaseline,
  nearestContestTargets,
  type GoalContestOptions,
  type NearestContestTargets,
} from './contestGoals'
import { GOAL_METRICS, GOAL_TARGET_FIELDS } from './goalMetrics'
import { latestMeasuredValues } from './measuredValues'
import { isPositiveNumber, isUsableNumber, roundToOneDecimal } from './number'
import { isPlainObject } from './storage'

// 記録から値を読む部分は measuredValues.ts、大会ごとの目標は contestGoals.ts にある。画面はここから import する
export { latestMeasuredValues }
export {
  contestTargetChanges,
  fillMissingContestOrigins,
  removeContestCarryingOrigins,
} from './contestGoals'
export type { GoalContestOptions }

export type GoalDirection = 'decrease' | 'increase'
export type GoalStatus = GoalDirection | 'achieved'

export interface GoalProgress {
  metric: GoalMetric
  current: number   // 現在の値。画面に出す小数1桁の値（体重 kg・体脂肪率 %・筋肉量 kg）
  target: number    // 目標の値。小数1桁
  remaining: number // 目標までの残り（0 以上）。current と target の差と一致する
  status: GoalStatus
  source: 'contest' | 'base' // 目標の出どころ。一番近い大会の目標か、基本情報のふだんの目標か
  contestId?: string         // source が 'contest' のとき、その大会の id（カードが大会の行を探す手がかり）
}

/** 設定した目標。未設定（0）や数値でない値は 0 として返す */
function targetOf(metric: GoalMetric, settings: BodySettings): number {
  const target = settings[GOAL_TARGET_FIELDS[metric]]
  return isPositiveNumber(target) ? target : 0
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
 * 項目ごとの、使う目標とその出どころ。一番近い大会にその項目の目標があれば大会、無ければふだんの目標。
 * どちらにも無い項目は含めない。ホームのカードとグラフの目標線が同じ目標になるよう、決め方はここだけに置く。
 */
function chooseTargets(
  settings: BodySettings,
  nearest: NearestContestTargets | undefined,
): Partial<Record<GoalMetric, { target: number; source: GoalProgress['source'] }>> {
  const chosen: Partial<Record<GoalMetric, { target: number; source: GoalProgress['source'] }>> = {}
  for (const metric of GOAL_METRICS) {
    const contestTarget = nearest?.targets[metric]
    if (contestTarget !== undefined) {
      chosen[metric] = { target: contestTarget, source: 'contest' }
    } else if (targetOf(metric, settings) > 0) {
      chosen[metric] = { target: targetOf(metric, settings), source: 'base' }
    }
  }
  return chosen
}

/**
 * ホームのグラフの目標線に使う、項目ごとの目標（丸める前の値）。
 * カードと同じく、一番近い大会にその項目の目標があればその値、無ければふだんの目標。どちらも無い項目は含めない。
 */
export function effectiveGoalTargets(settings: BodySettings, options?: GoalContestOptions): GoalValues {
  const targets: GoalValues = {}
  for (const [metric, chosen] of Object.entries(chooseTargets(settings, nearestContestTargets(options)))) {
    targets[metric as GoalMetric] = chosen.target
  }
  return targets
}

/**
 * ホームに出す「目標までの残り」。目標を設定した項目のうち、現在値がある項目だけを
 * 体重 → 体脂肪率 → 筋肉量の順で返す。何も無ければ空（目標を設定しない人には何も出さない）。
 * 画面には小数1桁で出すので、丸めた値どうしで残りと達成を決める（画面の引き算と合わせるため）。
 *
 * options を渡すと、一番近いこれからの大会の目標を項目ごとに優先する（無い項目はふだんの目標）。
 * 「今日」は呼び出し側から受け取る（この関数の中で現在時刻を引かない）。
 */
export function calcGoalProgress(
  records: BodyRecord[],
  settings: BodySettings,
  options?: GoalContestOptions,
): GoalProgress[] {
  const measured = latestMeasuredValues(records, settings)
  const baselines = validBaselines(settings.goalBaselines)
  const nearest = nearestContestTargets(options)
  const chosen = chooseTargets(settings, nearest)
  const goals: GoalProgress[] = []

  for (const metric of GOAL_METRICS) {
    const choice = chosen[metric]
    const rawCurrent = measured[metric]
    if (!choice || rawCurrent === undefined) continue

    // 大会の目標の向きは起点（contestGoals.ts）から決める。
    // ふだんの目標は保存済みの goalBaselines のまま。大会が過ぎてふだんの目標に戻ったときは、入れた時点の向きのまま。
    // 大会の目標と同じ考え方に揃えるのは別の PR（保存の形を変える必要があるため）
    const baseline =
      choice.source === 'contest' && nearest
        ? contestBaseline(nearest, metric, records, settings)
        : baselines[metric]

    const target = roundToOneDecimal(choice.target)
    const current = roundToOneDecimal(rawCurrent)
    const direction = directionOf(current, target, baseline)
    const achieved = direction === 'decrease' ? current <= target : current >= target

    goals.push({
      metric,
      current,
      target,
      remaining: achieved ? 0 : roundToOneDecimal(Math.abs(current - target)),
      status: achieved ? 'achieved' : direction,
      source: choice.source,
      ...(choice.source === 'contest' && nearest && { contestId: nearest.contest.id }),
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

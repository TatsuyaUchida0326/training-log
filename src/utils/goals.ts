import { format } from 'date-fns'
import type {
  BodyRecord,
  BodySettings,
  Contest,
  GoalBaselines,
  GoalMetric,
  GoalValues,
} from '../types'
import { calcBody } from './body'
import { isValidContestDate, sanitizeContestTargets, upcomingContests } from './contests'
import { GOAL_METRICS, GOAL_TARGET_FIELDS } from './goalMetrics'
import { isUsableNumber, roundToOneDecimal } from './number'
import { isPlainObject } from './storage'

export type GoalDirection = 'decrease' | 'increase'
export type GoalStatus = GoalDirection | 'achieved'

export interface GoalProgress {
  metric: GoalMetric
  current: number   // 現在の値。画面に出す小数1桁の値（体重 kg・体脂肪率 %・筋肉量 kg）
  target: number    // 目標の値。小数1桁
  remaining: number // 目標までの残り（0 以上）。current と target の差と一致する
  status: GoalStatus
  source: 'contest' | 'base' // 目標の出どころ。一番近い大会の目標か、基本情報のふだんの目標か
}

/** 一番近い大会を選ぶための、大会の一覧と今日 */
export interface GoalContestOptions {
  contests: Contest[]
  today: Date
}

/** 設定した目標。未設定（0）や数値でない値は 0 として返す */
function targetOf(metric: GoalMetric, settings: BodySettings): number {
  const target = settings[GOAL_TARGET_FIELDS[metric]]
  return isUsableNumber(target) && target > 0 ? target : 0
}

function usableOrNull(value: unknown): number | null {
  return isUsableNumber(value) ? value : null
}

/** 1日の記録から、その項目の値（体重 kg・体脂肪率 %・筋肉量 kg）を読む。入っていなければ null。丸めない */
type MetricReader = (record: BodyRecord) => number | null

function metricReaders(settings: BodySettings): Record<GoalMetric, MetricReader> {
  return {
    weight: (record) => usableOrNull(record.weight),
    bodyFat: (record) => usableOrNull(record.bodyFat),
    muscleMass: (record) =>
      calcBody(
        { ...record, weight: usableOrNull(record.weight), muscleMass: usableOrNull(record.muscleMass) },
        settings,
      ).muscleMassKg,
  }
}

/** 日付は 'YYYY-MM-DD' なので文字列比較で新しい順になる。元の配列は並べ替えない */
function newestFirst(records: BodyRecord[]): BodyRecord[] {
  return [...records].sort((a, b) => b.date.localeCompare(a.date))
}

/** 並びの先頭から探して、その項目が入っている最初の記録の値。無ければ null */
function firstValue(records: BodyRecord[], read: MetricReader): number | null {
  for (const record of records) {
    const value = read(record)
    if (value !== null) return value
  }
  return null
}

/**
 * 項目ごとの現在値。その項目が入っている一番新しい日付の記録から取る（配列の並びには依存しない）。
 * 一度も記録していない項目、数値でない値の日は「値なし」として古い日へ遡る。丸めない（baseline に生の値を残すため）。
 */
export function latestMeasuredValues(records: BodyRecord[], settings: BodySettings): GoalValues {
  const sorted = newestFirst(records)
  const readers = metricReaders(settings)

  const values: GoalValues = {}
  for (const metric of GOAL_METRICS) {
    const value = firstValue(sorted, readers[metric])
    if (value !== null) values[metric] = value
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

/** 大会の目標の向きを決める基準値つきの目標 */
type ContestGoals = Partial<Record<GoalMetric, { target: number; baseline: number | undefined }>>

/** 日付の遅いほう（'YYYY-MM-DD' は文字列比較で日付順になる）。両方無ければ undefined */
function laterDate(a: string | undefined, b: string | undefined): string | undefined {
  if (a === undefined) return b
  if (b === undefined) return a
  return a > b ? a : b
}

/** その大会より日付が前の大会のうち、一番遅い日。同じ日の大会は数えない。無ければ undefined */
function previousContestDate(contest: Contest, contests: Contest[]): string | undefined {
  let latest: string | undefined
  for (const other of contests) {
    if (!isValidContestDate(other.date) || other.date >= contest.date) continue
    latest = laterDate(latest, other.date)
  }
  return latest
}

/**
 * 起点の日以前でその項目が入っている一番新しい記録の値。無ければ、起点より後で一番古い記録の値。それも無ければ undefined。
 * 目標を入れた日の翌日以降に初めて記録する人（目標が先・記録が後）でも、向きを決められるようにする。
 */
function baselineAround(records: BodyRecord[], read: MetricReader, origin: string): number | undefined {
  const sorted = newestFirst(records)
  const onOrBefore = firstValue(sorted.filter((record) => record.date <= origin), read)
  if (onOrBefore !== null) return onOrBefore
  const after = firstValue(sorted.filter((record) => record.date > origin).reverse(), read)
  return after ?? undefined
}

/**
 * 一番近いこれからの大会の目標（項目ごと）と、向きを決める baseline。対象の大会が無い・目標が無ければ空。
 *
 * 目標を入れた時点の値は保存せず、記録の履歴から起点の日の値を引く。起点の日は
 * 「その項目の目標を最後に変えた日」と「前の大会の日」の遅いほう。
 * 例: 68kg のとき、1つ目の大会に 62、2つ目に 66 の目標を入れると、2つ目は「68→66 で減」になる。
 * 1つ目を 62kg で終えたあとは「62→66 で増」が正しいのに「達成」と出てしまう。
 * 大会が切り替わった時点（前の大会の日）の値を起点にすれば正しくなり、履歴から計算できるので保存も補完も要らない。
 */
function nearestContestGoals(
  records: BodyRecord[],
  settings: BodySettings,
  options: GoalContestOptions | undefined,
): ContestGoals {
  const nearest = options && upcomingContests(options.contests, options.today)[0]?.contest
  if (!options || !nearest) return {}

  const { targets, targetsSetOn } = sanitizeContestTargets(nearest.targets, nearest.targetsSetOn)
  const readers = metricReaders(settings)
  const previousDate = previousContestDate(nearest, options.contests)

  const goals: ContestGoals = {}
  for (const metric of GOAL_METRICS) {
    const target = targets?.[metric]
    if (target === undefined) continue
    const origin = laterDate(targetsSetOn?.[metric], previousDate)
    goals[metric] = {
      target,
      baseline: origin === undefined ? undefined : baselineAround(records, readers[metric], origin),
    }
  }
  return goals
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
  const contestGoals = nearestContestGoals(records, settings, options)
  const goals: GoalProgress[] = []

  for (const metric of GOAL_METRICS) {
    const contestGoal = contestGoals[metric]
    const rawTarget = contestGoal ? contestGoal.target : targetOf(metric, settings)
    const baseline = contestGoal ? contestGoal.baseline : baselines[metric]
    const rawCurrent = measured[metric]
    if (rawTarget === 0 || rawCurrent === undefined) continue

    const target = roundToOneDecimal(rawTarget)
    const current = roundToOneDecimal(rawCurrent)
    const direction = directionOf(current, target, baseline)
    const achieved = direction === 'decrease' ? current <= target : current >= target

    goals.push({
      metric,
      current,
      target,
      remaining: achieved ? 0 : roundToOneDecimal(Math.abs(current - target)),
      status: achieved ? 'achieved' : direction,
      source: contestGoal ? 'contest' : 'base',
    })
  }
  return goals
}

/**
 * 大会の目標を1項目変えたあとの targets・targetsSetOn。元の大会は書き換えない。
 * 目標を入れる（0 より大きい）と、その項目の入れた日を今日にする。0 なら両方からその項目を取り除き、
 * 空になったほうは undefined にする（空オブジェクトを残さない）。
 */
export function withContestTarget(
  contest: Contest,
  metric: GoalMetric,
  target: number,
  today: Date,
): Pick<Contest, 'targets' | 'targetsSetOn'> {
  const targets = { ...contest.targets }
  const setOn = { ...contest.targetsSetOn }
  if (isUsableNumber(target) && target > 0) {
    targets[metric] = target
    setOn[metric] = format(today, 'yyyy-MM-dd')
  } else {
    delete targets[metric]
    delete setOn[metric]
  }
  return {
    targets: Object.keys(targets).length > 0 ? targets : undefined,
    targetsSetOn: Object.keys(setOn).length > 0 ? setOn : undefined,
  }
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

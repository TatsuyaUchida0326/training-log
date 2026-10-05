import { format } from 'date-fns'
import type {
  BodyRecord,
  BodySettings,
  Contest,
  GoalMetric,
  GoalOrigin,
  GoalValues,
} from '../types'
import { daysUntil, sanitizeContestTargets, upcomingContests } from './contests'
import { GOAL_METRICS } from './goalMetrics'
import { baselineAsOf, metricReaders } from './measuredValues'
import { isPositiveNumber, isUsableNumber } from './number'

/**
 * 大会ごとの目標（Contest.targets）と、その向き（減らす・増やす）を決める起点（Contest.targetOrigins）。
 *
 * 用語: 起点 = 目標を入れた・変えた日（date）と、そのときの値（value）の組。baseline = 向きを決める基準の値。
 *
 * 向きは baseline と目標の大小で決める（goals.ts の directionOf）。baseline の決め方（contestBaseline）の理由は次のとおり。
 *  - 起点の値を保存する理由: 記録は日付単位なので、履歴からは「目標を入れた・変えた時点の値」と
 *    「同じ日に後から入れ直した値」を区別できない。68.3kg で目標 68 を入れ、同じ日に体重を 67.9 に直すと、
 *    履歴を読むだけでは向きが逆（増やす目標）になる。その時点の値を保存しておけば、記録を直しても向きは変わらない。
 *  - 前の大会の日の値を履歴から読む理由: 大会が過ぎて次の大会に切り替わる瞬間には、値を保存する機会が無い。
 *    例（こうしなかった場合）: 68kg のとき、1つ目の大会に 62、2つ目に 66 の目標を入れ、1つ目を 62kg で終えたとする。
 *    次の大会の向きを、目標を入れた時点の 68 のままにすると「68→66 で減」になり、現在の 62 は 66 以下なので「達成」と誤る。
 *    正しいのは「62→66 で増」。そこで、前の大会の日の値（62）を履歴から読んで baseline にする。
 *  - 前の大会に数えるのは、同じ項目の目標を持つ大会だけ: 目標を持たない予定（健診など）で向きが変わらないようにする。
 */

/** 一番近い大会を選ぶための、大会の一覧と今日 */
export interface GoalContestOptions {
  contests: Contest[]
  today: Date
}

/** 一番近いこれからの大会と、その大会の使える目標・起点。contests は前の大会を探すための全大会 */
export interface NearestContestTargets {
  contest: Contest
  contests: Contest[]
  targets: GoalValues
  origins: Partial<Record<GoalMetric, GoalOrigin>>
}

/** 日付の遅いほう（'YYYY-MM-DD' は文字列比較で日付順になる）。片方だけあればそのほう、両方無ければ undefined */
function laterDate(a: string | undefined, b: string | undefined): string | undefined {
  if (a === undefined) return b
  if (b === undefined) return a
  return a > b ? a : b
}

/** 一番近いこれからの大会（今日を含む。同じ日は登録順で先の1件）。その大会に使える目標が1つも無ければ undefined */
export function nearestContestTargets(options: GoalContestOptions | undefined): NearestContestTargets | undefined {
  if (!options) return undefined
  const nearest = upcomingContests(options.contests, options.today)[0]?.contest
  if (!nearest) return undefined

  const { targets, targetOrigins } = sanitizeContestTargets(nearest.targets, nearest.targetOrigins)
  if (!targets) return undefined
  return { contest: nearest, contests: options.contests, targets, origins: targetOrigins ?? {} }
}

/** その大会より日付が前で、同じ項目の目標を持つ大会のうち、一番遅い日。同じ日の大会は数えない。無ければ undefined */
function previousContestDate(contest: Contest, contests: Contest[], metric: GoalMetric): string | undefined {
  let latest: string | undefined
  for (const other of contests) {
    if (other.date >= contest.date) continue
    if (sanitizeContestTargets(other.targets, undefined).targets?.[metric] === undefined) continue
    latest = laterDate(latest, other.date)
  }
  return latest
}

/**
 * 大会の目標の向きを決める baseline。決められなければ undefined（呼び出し側は現在値と目標の差の符号で決める）。
 *  (a) 前の大会があり、起点が無いか、前の大会の日が起点の日より後: 履歴から前の大会の日の値を読む。
 *  (b) それ以外: 起点の値（無ければ baseline 無し。履歴は見ない）。
 */
export function contestBaseline(
  nearest: NearestContestTargets,
  metric: GoalMetric,
  records: BodyRecord[],
  settings: BodySettings,
): number | undefined {
  const origin = nearest.origins[metric]
  const previousDate = previousContestDate(nearest.contest, nearest.contests, metric)

  if (previousDate !== undefined && (origin === undefined || previousDate > origin.date)) {
    return baselineAsOf(records, metricReaders(settings)[metric], previousDate)
  }
  return origin?.value
}

/** 起点（目標を入れた・変えた日と、そのときの値）。値が無ければ日付だけ */
function makeOrigin(date: string, value: number | undefined): GoalOrigin {
  return isUsableNumber(value) ? { date, value } : { date }
}

/**
 * 大会の目標を1項目入れた・変えた・消したあとの targets・targetOrigins。元の大会は書き換えない。
 * 目標を入れる（0 より大きい）と、その項目の起点を { date: 今日, value: いまの値 } にする（いまの値が無ければ date だけ）。
 * 0 なら両方からその項目を取り除き、空になったほうは undefined にする（空オブジェクトを残さない）。
 */
export function contestTargetChanges(
  contest: Contest,
  metric: GoalMetric,
  target: number,
  today: Date,
  current: number | undefined,
): Pick<Contest, 'targets' | 'targetOrigins'> {
  const targets = { ...contest.targets }
  const origins = { ...contest.targetOrigins }
  if (isPositiveNumber(target)) {
    targets[metric] = target
    origins[metric] = makeOrigin(format(today, 'yyyy-MM-dd'), current)
  } else {
    delete targets[metric]
    delete origins[metric]
  }
  return {
    targets: Object.keys(targets).length > 0 ? targets : undefined,
    targetOrigins: Object.keys(origins).length > 0 ? origins : undefined,
  }
}

/**
 * 目標はあるのに起点の値が無い項目を、いまの値で埋めた大会の一覧。埋める項目が無ければ null。
 * 起点の date は変えない（無いときは今日）。既にある値は変えない。
 * 記録より先に目標を入れる人がいる。値を補わないと、最初の記録を同じ日に直したときに向きが変わってしまう。
 */
export function fillMissingContestOrigins(
  contests: Contest[],
  currents: GoalValues,
  today: Date,
): Contest[] | null {
  const todayText = format(today, 'yyyy-MM-dd')
  let filled = false

  const next = contests.map((contest) => {
    const { targets, targetOrigins } = sanitizeContestTargets(contest.targets, contest.targetOrigins)
    const additions: Partial<Record<GoalMetric, GoalOrigin>> = {}
    for (const metric of GOAL_METRICS) {
      const current = currents[metric]
      if (targets?.[metric] === undefined || targetOrigins?.[metric]?.value !== undefined) continue
      if (!isUsableNumber(current)) continue
      additions[metric] = makeOrigin(targetOrigins?.[metric]?.date ?? todayText, current)
    }
    if (Object.keys(additions).length === 0) return contest
    filled = true
    return { ...contest, targetOrigins: { ...targetOrigins, ...additions } }
  })
  return filled ? next : null
}

/**
 * 大会を消した一覧。過ぎた大会を消すときは、あとの大会へ起点を引き継ぐ。
 * 前の大会の日の値は、その大会が残っている間しか履歴から読めない（「前の大会」は残っている大会から探すため）。
 * 消すと次の大会の向きが変わり、「あと 3.5 kg 増」が「達成」に変わってしまう。
 * そこで消す前に、あとの大会の起点を { date: 消す大会の日, value: その日の値 } に置き換える。
 * 引き継ぐのは、消す大会が目標を持つ項目で、あとの大会の起点がそれより前（か無い）ときだけ。
 */
export function removeContestCarryingOrigins(
  contests: Contest[],
  removedId: string,
  records: BodyRecord[],
  settings: BodySettings,
  today: Date,
): Contest[] {
  const removed = contests.find((contest) => contest.id === removedId)
  const remaining = contests.filter((contest) => contest.id !== removedId)
  if (!removed || daysUntil(removed.date, today) >= 0) return remaining

  const removedTargets = sanitizeContestTargets(removed.targets, undefined).targets
  if (!removedTargets) return remaining

  const readers = metricReaders(settings)
  return remaining.map((contest) => {
    if (contest.date <= removed.date) return contest
    const { targets, targetOrigins } = sanitizeContestTargets(contest.targets, contest.targetOrigins)

    const carried: Partial<Record<GoalMetric, GoalOrigin>> = {}
    for (const metric of GOAL_METRICS) {
      if (removedTargets[metric] === undefined || targets?.[metric] === undefined) continue
      const origin = targetOrigins?.[metric]
      if (origin && origin.date >= removed.date) continue
      carried[metric] = makeOrigin(removed.date, baselineAsOf(records, readers[metric], removed.date))
    }
    if (Object.keys(carried).length === 0) return contest
    return { ...contest, targetOrigins: { ...targetOrigins, ...carried } }
  })
}

import { differenceInCalendarDays, isValid, parseISO } from 'date-fns'
import type { Contest, ContestCountdown } from '../types'
import { GOAL_METRICS } from './goalMetrics'
import { isUsableNumber } from './number'
import { isPlainObject } from './storage'

export const MAX_CONTEST_NAME_LENGTH = 30

/**
 * 大会の日付に認める年の範囲。日付欄をキーボードで打つ途中の値（0002 年など）を保存しないために絞る。
 * 日付欄の min / max にも同じ値を使う。
 */
const MIN_CONTEST_YEAR = 2000
const MAX_CONTEST_YEAR = 2999
export const MIN_CONTEST_DATE = `${MIN_CONTEST_YEAR}-01-01`
export const MAX_CONTEST_DATE = `${MAX_CONTEST_YEAR}-12-31`

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** 空白以外の文字を含む名前か（空・空白だけは false） */
export function isValidContestName(name: string): boolean {
  return name.trim() !== ''
}

/** 'YYYY-MM-DD' の形で、暦に実在し、年が認める範囲の日付か（2月30日・ゼロ埋めなしは false） */
export function isValidContestDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const parsed = parseISO(value)
  if (!isValid(parsed)) return false
  const year = parsed.getFullYear()
  return year >= MIN_CONTEST_YEAR && year <= MAX_CONTEST_YEAR
}

/**
 * 今日から大会の日までの日数。当日は 0、過ぎていれば負。
 * parseISO は 'YYYY-MM-DD' を端末の現地の暦日として読む。`new Date('2026-10-17')` は UTC として
 * 解釈されるので、タイムゾーンや時刻によって日付がずれる。使わない。
 */
export function daysUntil(date: string, today: Date): number {
  return differenceInCalendarDays(parseISO(date), today)
}

/**
 * 大会の目標と、目標を入れた日を、使える項目だけにする。保存前と読み込み後で同じ基準を使う。
 * 目標は有限で 0 より大きい数値の既知の項目だけ。入れた日は、対応する目標があり実在する日付のものだけ。
 * 何も残らなければ、そのキーは付けない（空オブジェクトを残さない）。
 */
export function sanitizeContestTargets(
  targets: unknown,
  targetsSetOn: unknown,
): Pick<Contest, 'targets' | 'targetsSetOn'> {
  const validTargets: NonNullable<Contest['targets']> = {}
  const validSetOn: NonNullable<Contest['targetsSetOn']> = {}
  const targetSource = isPlainObject(targets) ? targets : {}
  const setOnSource = isPlainObject(targetsSetOn) ? targetsSetOn : {}

  for (const metric of GOAL_METRICS) {
    const target = targetSource[metric]
    if (!isUsableNumber(target) || target <= 0) continue
    validTargets[metric] = target
    const setOn = setOnSource[metric]
    if (typeof setOn === 'string' && isValidContestDate(setOn)) validSetOn[metric] = setOn
  }

  const sanitized: Pick<Contest, 'targets' | 'targetsSetOn'> = {}
  if (Object.keys(validTargets).length > 0) sanitized.targets = validTargets
  if (Object.keys(validSetOn).length > 0) sanitized.targetsSetOn = validSetOn
  return sanitized
}

/** その大会に、使える目標が1つでも入っているか */
export function hasContestTargets(contest: Contest): boolean {
  return sanitizeContestTargets(contest.targets, undefined).targets !== undefined
}

/** 保存データから読んだ大会を、使える要素だけにする。
 * 配列でなければ空。壊れた要素と、同じ id の2件目以降は捨てる。並びは保存された順のまま。
 */
export function sanitizeContests(value: unknown): Contest[] {
  if (!Array.isArray(value)) return []
  const seenIds = new Set<string>()
  const contests: Contest[] = []
  for (const item of value as unknown[]) {
    if (!isPlainObject(item)) continue
    const { id, name, date } = item
    if (typeof id !== 'string' || id === '' || seenIds.has(id)) continue
    if (typeof name !== 'string' || !isValidContestName(name)) continue
    if (typeof date !== 'string' || !isValidContestDate(date)) continue
    seenIds.add(id)
    contests.push({ id, name, date, ...sanitizeContestTargets(item.targets, item.targetsSetOn) })
  }
  return contests
}

/**
 * 今日以降の大会を、近い順（同じ日は配列の順）に並べて残り日数を添える。
 * 配列の並べ替えは安定ソートなので、同じ日の登録順は保たれる。
 */
export function upcomingContests(contests: Contest[], today: Date): ContestCountdown[] {
  return contests
    .map((contest) => ({ contest, daysLeft: daysUntil(contest.date, today) }))
    .filter(({ daysLeft }) => daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
}

/** 日付ごとの大会。同じ日の大会は配列の順。過ぎた大会も含む（カレンダーの印に使う） */
export function groupContestsByDate(contests: Contest[]): Map<string, Contest[]> {
  const grouped = new Map<string, Contest[]>()
  for (const contest of contests) {
    const sameDay = grouped.get(contest.date)
    if (sameDay) sameDay.push(contest)
    else grouped.set(contest.date, [contest])
  }
  return grouped
}

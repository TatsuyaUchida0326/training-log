import { differenceInCalendarDays, isValid, parseISO } from 'date-fns'
import type { Contest } from '../types'
import { isPlainObject } from './storage'

/** 「あと何日」を添えた、これからの大会 */
export interface ContestCountdown {
  contest: Contest
  daysLeft: number // 0 = 今日
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** 'YYYY-MM-DD' の形で、暦に実在する日付か（2月30日・ゼロ埋めなしは false） */
export function isValidContestDate(value: string): boolean {
  return DATE_PATTERN.test(value) && isValid(parseISO(value))
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
 * 保存データから読んだ大会を、使える要素だけにする。
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
    if (typeof name !== 'string' || name.trim() === '') continue
    if (typeof date !== 'string' || !isValidContestDate(date)) continue
    seenIds.add(id)
    contests.push({ id, name, date })
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

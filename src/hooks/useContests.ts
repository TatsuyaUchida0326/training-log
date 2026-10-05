import { useState } from 'react'
import type { BodyRecord, BodySettings, Contest, GoalMetric, GoalValues } from '../types'
import {
  isValidContestDate,
  isValidContestName,
  sanitizeContestTargets,
  sanitizeContests,
} from '../utils/contests'
import {
  contestTargetChanges,
  fillMissingContestOrigins,
  removeContestCarryingOrigins,
} from '../utils/goals'
import { isArrayOf, loadStoredValue, writeStoredValue } from '../utils/storage'

export const STORAGE_KEY = 'strength-log-contests'

type ContestChanges = Partial<Pick<Contest, 'name' | 'date'>>

/** 目標を入れる・変える・消すときに渡す、今日といまの値（起点に残す） */
interface TargetContext {
  today: Date
  current: number | undefined
}

/** 大会を消すときに渡す、過ぎた大会の起点を引き継ぐための記録・設定・今日 */
interface RemoveContext {
  records: BodyRecord[]
  settings: BodySettings
  today: Date
}

function load(): Contest[] {
  // 配列でない値は loadStoredValue が退避して null を返す。配列の中の壊れた要素は sanitize で捨てる
  return sanitizeContests(loadStoredValue<unknown>(STORAGE_KEY, isArrayOf))
}

function persist(contests: Contest[]): void {
  writeStoredValue(STORAGE_KEY, contests)
}

/** 時刻＋乱数。同じミリ秒に2件追加されても、まず重ならない */
function createId(): string {
  return `contest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/** 名前は前後の空白を取り除いて保存する */
function applyChanges(contest: Contest, changes: ContestChanges): Contest {
  return {
    ...contest,
    name: changes.name?.trim() ?? contest.name,
    date: changes.date ?? contest.date,
  }
}

/**
 * 大会の目標を、渡された targets・targetOrigins に丸ごと置き換える。
 * {...contest, ...changes} だと、undefined を渡してもキーが残り、消えたことにならない。
 * 保存前に、読み込み後と同じ基準（sanitizeContestTargets）で整える。
 */
function replaceTargets(contest: Contest, changes: Pick<Contest, 'targets' | 'targetOrigins'>): Contest {
  const { id, name, date } = contest
  return { id, name, date, ...sanitizeContestTargets(changes.targets, changes.targetOrigins) }
}

export function useContests() {
  const [contests, setContests] = useState<Contest[]>(load)

  function addContest(name: string, date: string): void {
    if (!isValidContestName(name) || !isValidContestDate(date)) return
    // id は更新関数の外で決める（更新関数が2回呼ばれても同じ id になる）
    const newContest: Contest = { id: createId(), name: name.trim(), date }
    setContests((prev) => {
      const next = [...prev, newContest]
      persist(next)
      return next
    })
  }

  function updateContest(id: string, changes: ContestChanges): void {
    if (changes.name !== undefined && !isValidContestName(changes.name)) return
    if (changes.date !== undefined && !isValidContestDate(changes.date)) return
    setContests((prev) => {
      if (!prev.some((contest) => contest.id === id)) return prev
      const next = prev.map((contest) => (contest.id === id ? applyChanges(contest, changes) : contest))
      persist(next)
      return next
    })
  }

  /** 目標を入れる・変える（0 より大きい）・消す（0）。入れた・変えたときは、起点を今日といまの値にする */
  function setContestTarget(id: string, metric: GoalMetric, target: number, context: TargetContext): void {
    setContests((prev) => {
      if (!prev.some((contest) => contest.id === id)) return prev
      const next = prev.map((contest) =>
        contest.id === id
          ? replaceTargets(contest, contestTargetChanges(contest, metric, target, context.today, context.current))
          : contest,
      )
      persist(next)
      return next
    })
  }

  /** context を渡すと、過ぎた大会を消すときにあとの大会へ起点を引き継ぐ。渡さなければ単純に消す */
  function removeContest(id: string, context?: RemoveContext): void {
    setContests((prev) => {
      if (!prev.some((contest) => contest.id === id)) return prev
      const next = context
        ? removeContestCarryingOrigins(prev, id, context.records, context.settings, context.today)
        : prev.filter((contest) => contest.id !== id)
      persist(next)
      return next
    })
  }

  /** 目標はあるのに起点の値が無い項目を、いまの値で埋める。埋めるものが無ければ何も保存しない */
  function fillMissingOrigins(currents: GoalValues, today: Date): void {
    setContests((prev) => {
      const filled = fillMissingContestOrigins(prev, currents, today)
      if (!filled) return prev
      persist(filled)
      return filled
    })
  }

  return { contests, addContest, updateContest, setContestTarget, removeContest, fillMissingOrigins }
}

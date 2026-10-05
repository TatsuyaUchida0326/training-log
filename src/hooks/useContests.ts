import { useState } from 'react'
import type { Contest } from '../types'
import {
  isValidContestDate,
  isValidContestName,
  sanitizeContestTargets,
  sanitizeContests,
} from '../utils/contests'
import { isArrayOf, loadStoredValue, writeStoredValue } from '../utils/storage'

export const STORAGE_KEY = 'strength-log-contests'

/** targets・targetsSetOn は丸ごと置き換える（undefined や {} を渡すと目標が消える）。キーを渡さなければ今のまま */
type ContestChanges = Partial<Pick<Contest, 'name' | 'date' | 'targets' | 'targetsSetOn'>>

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

/**
 * 大会に変更を反映する。名前は前後の空白を取り除いて保存する。
 * 目標は sanitize し直して付ける。{...contest, ...changes} の結果をそのまま使うと、
 * undefined を渡してもキーが残り、消えたことにならないため。
 */
function applyChanges(contest: Contest, changes: ContestChanges): Contest {
  const merged = { ...contest, ...changes }
  return {
    id: contest.id,
    name: changes.name !== undefined ? changes.name.trim() : contest.name,
    date: changes.date ?? contest.date,
    ...sanitizeContestTargets(merged.targets, merged.targetsSetOn),
  }
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

  function removeContest(id: string): void {
    setContests((prev) => {
      if (!prev.some((contest) => contest.id === id)) return prev
      const next = prev.filter((contest) => contest.id !== id)
      persist(next)
      return next
    })
  }

  return { contests, addContest, updateContest, removeContest }
}

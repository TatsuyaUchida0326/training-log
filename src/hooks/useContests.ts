import { useState } from 'react'
import type { Contest } from '../types'
import { isValidContestDate, isValidContestName, sanitizeContests } from '../utils/contests'
import { isArrayOf, loadStoredValue, writeStoredValue } from '../utils/storage'

export const STORAGE_KEY = 'strength-log-contests'

type ContestChanges = Partial<Pick<Contest, 'name' | 'date'>>

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
function trimName(changes: ContestChanges): ContestChanges {
  const normalized: ContestChanges = {}
  if (changes.name !== undefined) normalized.name = changes.name.trim()
  if (changes.date !== undefined) normalized.date = changes.date
  return normalized
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
    const normalized = trimName(changes)
    setContests((prev) => {
      if (!prev.some((contest) => contest.id === id)) return prev
      const next = prev.map((contest) => (contest.id === id ? { ...contest, ...normalized } : contest))
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

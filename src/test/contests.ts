import type { Contest } from '../types'

/**
 * 大会のテスト用ヘルパー。
 * キー名の定義は storageKeys.ts に集約し、ここからは再 export する。
 */
import { CONTESTS_KEY } from './storageKeys'

export { CONTESTS_KEY }

let sequence = 0

/** 大会1件。id を省略すると呼び出しごとに別の id を振る */
export function makeContest(name: string, date: string, id?: string): Contest {
  sequence += 1
  return { id: id ?? `contest-${sequence}`, name, date }
}

/** 大会を localStorage に書き込む */
export function seedContests(contests: unknown[]): void {
  localStorage.setItem(CONTESTS_KEY, JSON.stringify(contests))
}

/** localStorage に保存されている大会を、検証せずそのまま読む（未保存なら空配列） */
export function readStoredContests(): Contest[] {
  return JSON.parse(localStorage.getItem(CONTESTS_KEY) ?? '[]') as Contest[]
}

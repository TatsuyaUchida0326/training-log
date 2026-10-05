import type { Contest } from '../types'

/**
 * 大会のテスト用ヘルパー。
 * storageKeys.ts / seed.ts に足さず別ファイルにしているのは、フックの実装前でも
 * 既存テスト（storageKeys.ts / seed.ts を import している）を壊さないため。
 * 実装後に storageKeys.ts へ寄せてもよい（その場合はこのファイルから再 export するだけで済む）。
 */
export { STORAGE_KEY as CONTESTS_KEY } from '../hooks/useContests'
import { STORAGE_KEY as CONTESTS_KEY } from '../hooks/useContests'

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

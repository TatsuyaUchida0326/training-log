/**
 * 大会のテスト用ヘルパー。
 * localStorage のキーは storageKeys.ts の CONTESTS_KEY を使う（ここからは再 export しない）。
 */
import { screen, within } from '@testing-library/react'
import type { Contest, GoalValues } from '../types'
import { CONTESTS_KEY } from './storageKeys'

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

/** ホームのカード（GoalCard）の「大会までの残り日数」リストの行 */
export function contestRows(): HTMLElement[] {
  return within(screen.getByRole('list', { name: '大会までの残り日数' })).getAllByRole('listitem')
}

/** 大会に目標（と、目標を入れた日）を付けた大会を返す。元の大会は書き換えない */
export function withTargets(
  contest: Contest,
  targets: GoalValues,
  targetsSetOn?: Contest['targetsSetOn'],
): Contest {
  return targetsSetOn ? { ...contest, targets, targetsSetOn } : { ...contest, targets }
}

/** カードの、大会の行の中に入れ子で出る「{大会名}の目標までの残り」リスト（無ければ null） */
export function queryNestedGoalList(contestName: string): HTMLElement | null {
  return screen.queryByRole('list', { name: `${contestName}の目標までの残り` })
}

/** 同じリストの行（listitem）。大会の行そのものは含まない */
export function nestedGoalRows(contestName: string): HTMLElement[] {
  return within(screen.getByRole('list', { name: `${contestName}の目標までの残り` })).getAllByRole('listitem')
}

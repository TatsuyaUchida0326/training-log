/**
 * 大会のテスト用ヘルパー。
 * localStorage のキーは storageKeys.ts の CONTESTS_KEY を使う（ここからは再 export しない）。
 */
import { screen, within } from '@testing-library/react'
import type { Contest, ContestCountdown, GoalValues } from '../types'
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

/** 大会に目標（と、向きを決める起点）を付けた大会を返す。元の大会は書き換えない */
export function withTargets(
  contest: Contest,
  targets: GoalValues,
  targetOrigins?: Contest['targetOrigins'],
): Contest {
  return targetOrigins ? { ...contest, targets, targetOrigins } : { ...contest, targets }
}

/** カードに渡す「あと何日」つきの大会 */
export function countdown(id: string, name: string, date: string, daysLeft: number): ContestCountdown {
  return { contest: { id, name, date }, daysLeft }
}

/** 日付が近い順に並んだ5件（カードの「3件まで＋ほか N 件」の確認用） */
export const FIVE_COUNTDOWNS: ContestCountdown[] = [
  countdown('c1', '大会いち', '2026-10-06', 1),
  countdown('c2', '大会に', '2026-10-07', 2),
  countdown('c3', '大会さん', '2026-10-08', 3),
  countdown('c4', '大会よん', '2026-10-09', 4),
  countdown('c5', '大会ご', '2026-10-10', 5),
]

/** カードの、大会の行の中に入れ子で出る「{大会名}の目標までの残り」リスト（無ければ null） */
export function queryNestedGoalList(contestName: string): HTMLElement | null {
  return screen.queryByRole('list', { name: `${contestName}の目標までの残り` })
}

/** 同じリストの行（listitem）。大会の行そのものは含まない */
export function nestedGoalRows(contestName: string): HTMLElement[] {
  return within(screen.getByRole('list', { name: `${contestName}の目標までの残り` })).getAllByRole('listitem')
}

/**
 * 体組成画面の計測値などの入力欄を、見える文字（ラベル）で取る。
 * 大会の目標の欄が開いていると、その見出し（体重・体脂肪率・筋肉量）も同じ文字の <label> なので、
 * getByLabelText('体重') が複数に当たる。目標の欄（role="group"）の中は除く。
 */
export function bodyInput(label: string): HTMLInputElement {
  const matches = screen
    .getAllByLabelText(label)
    .filter((element) => !element.closest('[role="group"]'))
  if (matches.length !== 1) {
    throw new Error(`「${label}」の入力欄が ${matches.length} 件見つかりました（1件のはず）`)
  }
  return matches[0] as HTMLInputElement
}

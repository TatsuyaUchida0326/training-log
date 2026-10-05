import { addDays, format } from 'date-fns'
import { beforeEach, describe, expect, it } from 'vitest'
import { applySampleData } from './sampleData'
import { calcGoalProgress } from './goals'
import { isValidContestDate, sanitizeContests } from './contests'
import { DEFAULT_EXERCISES } from '../data/defaultExercises'
import { readStoredContests } from '../test/contests'
import { BODY_RECORDS_KEY, BODY_SETTINGS_KEY } from '../test/storageKeys'
import type { BodyRecord, BodySettings, GoalMetric } from '../types'

/**
 * サンプルデータの大会に目標が入る。数値は実装の定数に依存せず、振る舞い
 * （3項目あり、目標を入れた日が今日より前で、サンプルの記録の始まりより後ではなく、達成済みにならない）だけを見る。
 */

const TODAY = new Date(2026, 8, 23)
const METRICS: GoalMetric[] = ['weight', 'bodyFat', 'muscleMass']

beforeEach(() => {
  localStorage.clear()
})

function storedBodyRecords(): BodyRecord[] {
  return JSON.parse(localStorage.getItem(BODY_RECORDS_KEY) ?? '[]') as BodyRecord[]
}

function storedBodySettings(): BodySettings {
  return JSON.parse(localStorage.getItem(BODY_SETTINGS_KEY) ?? '{}') as BodySettings
}

describe('applySampleData — 大会の目標', () => {
  it('サンプルの大会に、体重・体脂肪率・筋肉量の目標が入る（正の有限な数）', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    const [contest] = readStoredContests()
    for (const metric of METRICS) {
      const target = contest.targets?.[metric]
      expect(typeof target).toBe('number')
      expect(Number.isFinite(target)).toBe(true)
      expect(target).toBeGreaterThan(0)
    }
  })

  it('targetsSetOn が3項目とも入り、実在する日付で、今日より前', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    const [contest] = readStoredContests()
    const todayText = format(TODAY, 'yyyy-MM-dd')
    for (const metric of METRICS) {
      const setOn = contest.targetsSetOn?.[metric]
      expect(typeof setOn).toBe('string')
      expect(isValidContestDate(setOn as string)).toBe(true)
      expect((setOn as string) < todayText).toBe(true)
    }
  })

  it('targetsSetOn はサンプルの体組成記録の最初の日以前（目標を入れた日から記録が始まる）', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    const [contest] = readStoredContests()
    const firstRecordDate = storedBodyRecords()
      .map((record) => record.date)
      .sort()[0]
    for (const metric of METRICS) {
      expect((contest.targetsSetOn?.[metric] as string) <= firstRecordDate).toBe(true)
    }
  })

  it('保存した大会は sanitizeContests を通しても変わらない（検査に通る形）', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    const stored = readStoredContests()
    expect(sanitizeContests(stored)).toEqual(stored)
  })

  it('calcGoalProgress に大会と今日を渡すと、3項目とも source: contest になる', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    const goals = calcGoalProgress(storedBodyRecords(), storedBodySettings(), {
      contests: readStoredContests(),
      today: TODAY,
    })
    expect(goals.map((goal) => goal.metric)).toEqual(METRICS)
    expect(goals.map((goal) => goal.source)).toEqual(['contest', 'contest', 'contest'])
  })

  it('3項目とも達成済み（achieved）ではなく、残りがある（デモで「あと ◯ 」が見える）', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    const goals = calcGoalProgress(storedBodyRecords(), storedBodySettings(), {
      contests: readStoredContests(),
      today: TODAY,
    })
    for (const goal of goals) {
      expect(goal.status).not.toBe('achieved')
      expect(goal.remaining).toBeGreaterThan(0)
    }
  })

  it('今日がいつでも同じ（年またぎ・うるう日をまたぐ日付でも、3項目が contest で達成済みにならない）', () => {
    for (const today of [new Date(2026, 11, 31), new Date(2028, 1, 20), new Date(2027, 11, 25, 23, 59)]) {
      localStorage.clear()
      applySampleData(DEFAULT_EXERCISES, today)
      const goals = calcGoalProgress(storedBodyRecords(), storedBodySettings(), {
        contests: readStoredContests(),
        today,
      })
      expect(goals.map((goal) => goal.source)).toEqual(['contest', 'contest', 'contest'])
      expect(goals.every((goal) => goal.status !== 'achieved')).toBe(true)
      const setOn = readStoredContests()[0].targetsSetOn?.weight as string
      expect(setOn < format(today, 'yyyy-MM-dd')).toBe(true)
      expect(setOn >= format(addDays(today, -60), 'yyyy-MM-dd')).toBe(true)
    }
  })

  it('大会の目標を入れても、サンプルの大会は1件のまま・日付は今までどおり', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    expect(readStoredContests()).toHaveLength(1)
  })

  it('2回続けて適用しても、目標つきの大会は同じ中身で1件のまま', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    const first = readStoredContests()
    applySampleData(DEFAULT_EXERCISES, TODAY)
    expect(readStoredContests()).toEqual(first)
  })
})

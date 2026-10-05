import { addDays, format } from 'date-fns'
import { beforeEach, describe, expect, it } from 'vitest'
import { applySampleData } from './sampleData'
import { calcGoalProgress } from './goals'
import { isValidContestDate, sanitizeContests } from './contests'
import { DEFAULT_EXERCISES } from '../data/defaultExercises'
import { readStoredContests } from '../test/contests'
import { readStoredBodySettings } from '../test/seed'
import { BODY_RECORDS_KEY } from '../test/storageKeys'
import type { BodyRecord, GoalMetric } from '../types'

/**
 * サンプルデータの大会に目標が入る。数値は実装の定数に依存せず、振る舞い
 * （3項目あり、起点の日が今日より前で記録の始まりより後ではなく、起点の値が向きに合い、達成済みにならない）だけを見る。
 */

const TODAY = new Date(2026, 8, 23)
const METRICS: GoalMetric[] = ['weight', 'bodyFat', 'muscleMass']

beforeEach(() => {
  localStorage.clear()
})

function storedBodyRecords(): BodyRecord[] {
  return JSON.parse(localStorage.getItem(BODY_RECORDS_KEY) ?? '[]') as BodyRecord[]
}

function sampleGoals(today: Date = TODAY) {
  return calcGoalProgress(storedBodyRecords(), readStoredBodySettings(), {
    contests: readStoredContests(),
    today,
  })
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

  it('targetOrigins が3項目とも入り、date は実在する日付で今日より前、value は有限の数値', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    const [contest] = readStoredContests()
    const todayText = format(TODAY, 'yyyy-MM-dd')
    for (const metric of METRICS) {
      const origin = contest.targetOrigins?.[metric]
      expect(origin).toBeDefined()
      expect(isValidContestDate(origin?.date as string)).toBe(true)
      expect((origin?.date as string) < todayText).toBe(true)
      expect(Number.isFinite(origin?.value)).toBe(true)
    }
  })

  it('旧形式の targetsSetOn は入れない', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    expect(readStoredContests()[0]).not.toHaveProperty('targetsSetOn')
  })

  it('起点の date はサンプルの体組成記録の最初の日以前（目標を入れた日から記録が始まる）', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    const [contest] = readStoredContests()
    const firstRecordDate = storedBodyRecords()
      .map((record) => record.date)
      .sort()[0]
    for (const metric of METRICS) {
      expect((contest.targetOrigins?.[metric]?.date as string) <= firstRecordDate).toBe(true)
    }
  })

  it('起点の value は、サンプルの最初の体組成の値に近い（体重・体脂肪率は ±1 以内）', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    const [contest] = readStoredContests()
    const [first] = [...storedBodyRecords()].sort((a, b) => a.date.localeCompare(b.date))
    expect(Math.abs((contest.targetOrigins?.weight?.value as number) - (first.weight as number))).toBeLessThanOrEqual(1)
    expect(Math.abs((contest.targetOrigins?.bodyFat?.value as number) - (first.bodyFat as number))).toBeLessThanOrEqual(1)
  })

  it('保存した大会は sanitizeContests を通しても変わらない（検査に通る形）', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    const stored = readStoredContests()
    expect(sanitizeContests(stored)).toEqual(stored)
  })

  it('calcGoalProgress に大会と今日を渡すと、3項目とも source: contest になり、contestId は大会の id', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    const goals = sampleGoals()
    expect(goals.map((goal) => goal.metric)).toEqual(METRICS)
    expect(goals.map((goal) => goal.source)).toEqual(['contest', 'contest', 'contest'])
    expect(goals.map((goal) => goal.contestId)).toEqual(Array(3).fill(readStoredContests()[0].id))
  })

  it('3項目とも達成済み（achieved）ではなく、残りがある（デモで「あと ◯」が見える）', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    for (const goal of sampleGoals()) {
      expect(goal.status).not.toBe('achieved')
      expect(goal.remaining).toBeGreaterThan(0)
    }
  })

  it('向きは 体重と体脂肪率が「減」、筋肉量が「増」', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    expect(sampleGoals().map((goal) => goal.status)).toEqual(['decrease', 'decrease', 'increase'])
  })

  it('今日がいつでも同じ（年またぎ・うるう日をまたぐ日付でも、3項目が contest・達成済みでなく、向きも同じ）', () => {
    for (const today of [new Date(2026, 11, 31), new Date(2028, 1, 20), new Date(2027, 11, 25, 23, 59)]) {
      localStorage.clear()
      applySampleData(DEFAULT_EXERCISES, today)
      const goals = sampleGoals(today)
      expect(goals.map((goal) => goal.source)).toEqual(['contest', 'contest', 'contest'])
      expect(goals.map((goal) => goal.status)).toEqual(['decrease', 'decrease', 'increase'])
      const setOn = readStoredContests()[0].targetOrigins?.weight?.date as string
      expect(setOn < format(today, 'yyyy-MM-dd')).toBe(true)
      expect(setOn >= format(addDays(today, -60), 'yyyy-MM-dd')).toBe(true)
    }
  })

  it('大会の目標を入れても、サンプルの大会は1件のまま', () => {
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

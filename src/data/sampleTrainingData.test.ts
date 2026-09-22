import { format, subDays } from 'date-fns'
import { describe, it, expect } from 'vitest'
import { DEFAULT_EXERCISES } from './defaultExercises'
import { buildSampleData, SAMPLE_PERIOD_DAYS } from './sampleTrainingData'
import { isFilledSet } from '../utils/training'

const TODAY = new Date(2026, 8, 23) // 2026-09-23（水）

function build(today: Date = TODAY) {
  return buildSampleData(DEFAULT_EXERCISES, today)
}

describe('buildSampleData — トレーニング記録', () => {
  it('すべてのセットが回数1以上（空セットを作らない）', () => {
    const { records } = build()
    const allSets = records.flatMap((record) => record.sets)
    expect(allSets.length).toBeGreaterThan(0)
    expect(allSets.every(isFilledSet)).toBe(true)
  })

  it('回数が 5〜12 の範囲に収まる', () => {
    const { records } = build()
    const allReps = records.flatMap((record) => record.sets.map((set) => set.reps))
    expect(Math.min(...allReps)).toBeGreaterThanOrEqual(5)
    expect(Math.max(...allReps)).toBeLessThanOrEqual(12)
  })

  it('日付が今日から過去35日以内に収まる', () => {
    const { records } = build()
    const todayString = format(TODAY, 'yyyy-MM-dd')
    const oldestString = format(subDays(TODAY, SAMPLE_PERIOD_DAYS - 1), 'yyyy-MM-dd')

    for (const record of records) {
      expect(record.date >= oldestString).toBe(true)
      expect(record.date <= todayString).toBe(true)
    }
  })

  it('トレーニング日数が週3〜4回ぶん（14〜20日）になる', () => {
    const { records } = build()
    const trainingDates = new Set(records.map((record) => record.date))
    expect(trainingDates.size).toBeGreaterThanOrEqual(14)
    expect(trainingDates.size).toBeLessThanOrEqual(20)
  })

  it('1回あたり4種目で、1種目めが4セット・残りが3セット', () => {
    const { records } = build()
    const recordsByDate = new Map<string, typeof records>()
    for (const record of records) {
      recordsByDate.set(record.date, [...(recordsByDate.get(record.date) ?? []), record])
    }

    for (const dailyRecords of recordsByDate.values()) {
      expect(dailyRecords).toHaveLength(4)
      expect(dailyRecords[0].sets).toHaveLength(4)
      expect(dailyRecords.slice(1).every((record) => record.sets.length === 3)).toBe(true)
    }
  })

  it('同じ種目の重量が回を追うごとに伸びる（最後 > 最初）', () => {
    const { records } = build()
    const benchPress = DEFAULT_EXERCISES.find((exercise) => exercise.name === 'ベンチプレス')!
    const benchRecords = records
      .filter((record) => record.exerciseId === benchPress.id)
      .sort((a, b) => a.date.localeCompare(b.date))

    expect(benchRecords.length).toBeGreaterThan(1)
    const firstWeight = benchRecords[0].sets[0].weight
    const lastWeight = benchRecords[benchRecords.length - 1].sets[0].weight
    expect(firstWeight).toBe(60)
    expect(lastWeight).toBeGreaterThan(firstWeight)
  })

  it('メモは一部のセットにだけ入る', () => {
    const { records } = build()
    const allSets = records.flatMap((record) => record.sets)
    const setsWithMemo = allSets.filter((set) => set.memo !== '')

    expect(setsWithMemo.length).toBeGreaterThan(0)
    expect(setsWithMemo.length).toBeLessThan(allSets.length / 2)
  })

  it('同じ today を渡せば毎回同じ結果になる（固定シード）', () => {
    expect(build()).toEqual(build())
  })

  it('種目一覧が空でも落ちず、記録は空になる', () => {
    const { records, bodyRecords } = buildSampleData([], TODAY)
    expect(records).toEqual([])
    expect(bodyRecords.length).toBeGreaterThan(0)
  })

  it('種目が一部しか無い場合は見つかったものだけを記録する', () => {
    const benchPress = DEFAULT_EXERCISES.find((exercise) => exercise.name === 'ベンチプレス')!
    const { records } = buildSampleData([benchPress], TODAY)

    expect(records.length).toBeGreaterThan(0)
    expect(records.every((record) => record.exerciseId === benchPress.id)).toBe(true)
  })
})

describe('buildSampleData — 体組成記録', () => {
  it('件数が 20〜30 件に収まる', () => {
    const { bodyRecords } = build()
    expect(bodyRecords.length).toBeGreaterThanOrEqual(20)
    expect(bodyRecords.length).toBeLessThanOrEqual(30)
  })

  it('日付が今日から過去35日以内で、重複しない', () => {
    const { bodyRecords } = build()
    const todayString = format(TODAY, 'yyyy-MM-dd')
    const oldestString = format(subDays(TODAY, SAMPLE_PERIOD_DAYS - 1), 'yyyy-MM-dd')

    for (const bodyRecord of bodyRecords) {
      expect(bodyRecord.date >= oldestString).toBe(true)
      expect(bodyRecord.date <= todayString).toBe(true)
    }
    expect(new Set(bodyRecords.map((bodyRecord) => bodyRecord.date)).size).toBe(
      bodyRecords.length,
    )
  })

  it('体重が単調に増え続けず、全体として減る', () => {
    const { bodyRecords } = build()
    const weights = bodyRecords.map((bodyRecord) => bodyRecord.weight!)

    const isMonotonicIncreasing = weights.every(
      (weight, index) => index === 0 || weight >= weights[index - 1],
    )
    expect(isMonotonicIncreasing).toBe(false)
    expect(weights[weights.length - 1]).toBeLessThan(weights[0])
  })

  it('体脂肪率も全体として減り、筋肉量は増える', () => {
    const { bodyRecords } = build()
    const first = bodyRecords[0]
    const last = bodyRecords[bodyRecords.length - 1]

    expect(last.bodyFat!).toBeLessThan(first.bodyFat!)
    expect(last.muscleMass!).toBeGreaterThan(first.muscleMass!)
  })

  it('腹囲も含めてすべての項目が埋まっている', () => {
    const { bodyRecords } = build()
    for (const bodyRecord of bodyRecords) {
      expect(bodyRecord.weight).not.toBeNull()
      expect(bodyRecord.bodyFat).not.toBeNull()
      expect(bodyRecord.muscleMass).not.toBeNull()
      expect(bodyRecord.waist).not.toBeNull()
    }
  })

  it('別の today を渡すと日付がその日基準にずれる', () => {
    const otherToday = new Date(2026, 11, 1)
    const { bodyRecords } = build(otherToday)
    const lastDate = bodyRecords[bodyRecords.length - 1].date

    expect(lastDate <= format(otherToday, 'yyyy-MM-dd')).toBe(true)
    expect(lastDate >= format(subDays(otherToday, SAMPLE_PERIOD_DAYS - 1), 'yyyy-MM-dd')).toBe(
      true,
    )
  })
})

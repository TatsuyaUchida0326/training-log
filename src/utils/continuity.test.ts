import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { calcContinuityStreak, getQualifyingDates } from './continuity'
import type { TrainingRecord } from '../types'

// テスト用: 今日を固定する
const TODAY = '2026-04-22'

function makeRecord(date: string, exerciseId: string, setsCount: number): TrainingRecord {
  return {
    id: `${date}-${exerciseId}`,
    date,
    exerciseId,
    sets: Array.from({ length: setsCount }, (_, i) => ({
      id: `s${i}`,
      weight: 60,
      reps: 10,
      memo: '',
    })),
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(TODAY))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('calcContinuityStreak', () => {
  it('記録が空なら 0 を返す', () => {
    expect(calcContinuityStreak([], 3, 3)).toBe(0)
  })

  it('今日1日だけ達成なら 1 を返す', () => {
    const records: TrainingRecord[] = [
      makeRecord(TODAY, 'ex1', 3),
      makeRecord(TODAY, 'ex2', 3),
      makeRecord(TODAY, 'ex3', 3),
    ]
    expect(calcContinuityStreak(records, 3, 3)).toBe(1)
  })

  it('連続3日達成なら 3 を返す', () => {
    const records: TrainingRecord[] = [
      makeRecord('2026-04-20', 'ex1', 3),
      makeRecord('2026-04-20', 'ex2', 3),
      makeRecord('2026-04-20', 'ex3', 3),
      makeRecord('2026-04-21', 'ex1', 3),
      makeRecord('2026-04-21', 'ex2', 3),
      makeRecord('2026-04-21', 'ex3', 3),
      makeRecord(TODAY, 'ex1', 3),
      makeRecord(TODAY, 'ex2', 3),
      makeRecord(TODAY, 'ex3', 3),
    ]
    expect(calcContinuityStreak(records, 3, 3)).toBe(3)
  })

  it('条件未満の種目数の日はカウントしない', () => {
    // 今日は2種目のみ（3必要）
    const records: TrainingRecord[] = [
      makeRecord(TODAY, 'ex1', 3),
      makeRecord(TODAY, 'ex2', 3),
    ]
    expect(calcContinuityStreak(records, 3, 3)).toBe(0)
  })

  it('条件未満のセット数の種目はカウントしない', () => {
    // 3種目あるがそれぞれ2セット（3必要）
    const records: TrainingRecord[] = [
      makeRecord(TODAY, 'ex1', 2),
      makeRecord(TODAY, 'ex2', 2),
      makeRecord(TODAY, 'ex3', 2),
    ]
    expect(calcContinuityStreak(records, 3, 3)).toBe(0)
  })

  it('1日に同じ種目を複数回記録しても +1 まで（反則技防止）', () => {
    // 同じ日に大量記録しても streak は 1
    const records: TrainingRecord[] = [
      makeRecord(TODAY, 'ex1', 5),
      makeRecord(TODAY, 'ex2', 5),
      makeRecord(TODAY, 'ex3', 5),
      makeRecord(TODAY, 'ex4', 5),
    ]
    expect(calcContinuityStreak(records, 3, 3)).toBe(1)
  })

  it('resetDays(10日)以上空いたらリセット → 0', () => {
    // 11日前に達成、今日は何もなし
    const records: TrainingRecord[] = [
      makeRecord('2026-04-11', 'ex1', 3),
      makeRecord('2026-04-11', 'ex2', 3),
      makeRecord('2026-04-11', 'ex3', 3),
    ]
    expect(calcContinuityStreak(records, 3, 3)).toBe(0)
  })

  it('9日前の達成はまだ有効 → 1', () => {
    const records: TrainingRecord[] = [
      makeRecord('2026-04-13', 'ex1', 3),
      makeRecord('2026-04-13', 'ex2', 3),
      makeRecord('2026-04-13', 'ex3', 3),
    ]
    expect(calcContinuityStreak(records, 3, 3)).toBe(1)
  })

  it('途中に 10日以上の空白がある場合、空白より後のみカウント', () => {
    // 1月に達成 → 空白(10日超) → 今日まで3日連続
    const records: TrainingRecord[] = [
      makeRecord('2026-01-01', 'ex1', 3),
      makeRecord('2026-01-01', 'ex2', 3),
      makeRecord('2026-01-01', 'ex3', 3),
      makeRecord('2026-04-20', 'ex1', 3),
      makeRecord('2026-04-20', 'ex2', 3),
      makeRecord('2026-04-20', 'ex3', 3),
      makeRecord('2026-04-21', 'ex1', 3),
      makeRecord('2026-04-21', 'ex2', 3),
      makeRecord('2026-04-21', 'ex3', 3),
      makeRecord(TODAY, 'ex1', 3),
      makeRecord(TODAY, 'ex2', 3),
      makeRecord(TODAY, 'ex3', 3),
    ]
    expect(calcContinuityStreak(records, 3, 3)).toBe(3)
  })

  it('requiredExercises=1 に設定変更した場合、1種目で達成', () => {
    const records: TrainingRecord[] = [
      makeRecord(TODAY, 'ex1', 3),
    ]
    expect(calcContinuityStreak(records, 1, 3)).toBe(1)
  })

  it('requiredSets=5 に設定変更した場合、5セット未満の種目は不達成', () => {
    const records: TrainingRecord[] = [
      makeRecord(TODAY, 'ex1', 4),
      makeRecord(TODAY, 'ex2', 4),
      makeRecord(TODAY, 'ex3', 4),
    ]
    expect(calcContinuityStreak(records, 3, 5)).toBe(0)
  })

  it('requiredSets=5 に設定変更した場合、5セット以上の種目が3つあれば達成', () => {
    const records: TrainingRecord[] = [
      makeRecord(TODAY, 'ex1', 5),
      makeRecord(TODAY, 'ex2', 5),
      makeRecord(TODAY, 'ex3', 5),
    ]
    expect(calcContinuityStreak(records, 3, 5)).toBe(1)
  })
})

describe('getQualifyingDates', () => {
  it('達成日のみを返す', () => {
    const records: TrainingRecord[] = [
      makeRecord('2026-04-20', 'ex1', 3),
      makeRecord('2026-04-20', 'ex2', 3),
      makeRecord('2026-04-20', 'ex3', 3),
      makeRecord('2026-04-21', 'ex1', 1), // 条件未達（セット不足）
    ]
    expect(getQualifyingDates(records, 3, 3)).toEqual(['2026-04-20'])
  })

  it('記録が空なら空配列を返す', () => {
    expect(getQualifyingDates([], 3, 3)).toEqual([])
  })

  it('複数の達成日を昇順で返す', () => {
    const records: TrainingRecord[] = [
      makeRecord('2026-04-22', 'ex1', 3),
      makeRecord('2026-04-22', 'ex2', 3),
      makeRecord('2026-04-22', 'ex3', 3),
      makeRecord('2026-04-20', 'ex1', 3),
      makeRecord('2026-04-20', 'ex2', 3),
      makeRecord('2026-04-20', 'ex3', 3),
    ]
    expect(getQualifyingDates(records, 3, 3)).toEqual(['2026-04-20', '2026-04-22'])
  })
})

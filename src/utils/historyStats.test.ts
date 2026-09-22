import { describe, it, expect } from 'vitest'
import { calcHistoryStats } from './historyStats'
import { displayVolume, displayWeight } from './training'
import type { TrainingRecord } from '../types'

const records: TrainingRecord[] = [
  {
    id: 'r1',
    date: '2026-04-15',
    exerciseId: 'bench',
    sets: [
      { id: 's1', weight: 90, reps: 10, memo: '' },
      { id: 's2', weight: 100, reps: 8, memo: '' },
    ],
  },
  {
    id: 'r2',
    date: '2026-04-17',
    exerciseId: 'bench',
    sets: [
      { id: 's3', weight: 120, reps: 5, memo: '' },
    ],
  },
  {
    id: 'r3',
    date: '2026-04-16',
    exerciseId: 'bench',
    sets: [], // セット無しは除外
  },
]

describe('calcHistoryStats', () => {
  it('セットのない日は除外される', () => {
    const stats = calcHistoryStats(records)
    expect(stats.trainedDates).not.toContain('2026-04-16')
  })

  it('trainedDates が日付順で返る', () => {
    const stats = calcHistoryStats(records)
    expect(stats.trainedDates).toEqual(['2026-04-15', '2026-04-17'])
  })

  it('maxWeight が各日の最大重量', () => {
    const stats = calcHistoryStats(records)
    expect(stats.maxWeight[0]).toEqual({ date: '2026-04-15', value: 100 })
    expect(stats.maxWeight[1]).toEqual({ date: '2026-04-17', value: 120 })
  })

  it('totalSets が各日の合計セット数', () => {
    const stats = calcHistoryStats(records)
    expect(stats.totalSets[0]).toEqual({ date: '2026-04-15', value: 2 })
    expect(stats.totalSets[1]).toEqual({ date: '2026-04-17', value: 1 })
  })

  it('totalVolume が各日の総負荷量', () => {
    const stats = calcHistoryStats(records)
    // 90×10 + 100×8 = 900 + 800 = 1700
    expect(stats.totalVolume[0]).toEqual({ date: '2026-04-15', value: 1700 })
  })

  it('空配列を渡すと全て空になる', () => {
    const stats = calcHistoryStats([])
    expect(stats.trainedDates).toHaveLength(0)
    expect(stats.maxWeight).toHaveLength(0)
  })
})

/* 判定基準は isFilledSet を参照 */
describe('calcHistoryStats - 空セットの除外', () => {
  const emptyOnly: TrainingRecord = {
    id: 'r-empty',
    date: '2026-04-18',
    exerciseId: 'bench',
    sets: [
      { id: 'e1', weight: 0, reps: 0, memo: '' },
      { id: 'e2', weight: 0, reps: 0, memo: '' },
      { id: 'e3', weight: 0, reps: 0, memo: '' },
    ],
  }

  const mixed: TrainingRecord = {
    id: 'r-mixed',
    date: '2026-04-19',
    exerciseId: 'bench',
    sets: [
      { id: 'm1', weight: 80, reps: 10, memo: '' },
      { id: 'm2', weight: 0, reps: 0, memo: '' },
      { id: 'm3', weight: 0, reps: 0, memo: '' },
    ],
  }

  it('空セットだけの日は trainedDates に含めない', () => {
    const stats = calcHistoryStats([emptyOnly])
    expect(stats.trainedDates).toEqual([])
  })

  it('空セットだけの日はグラフの点を作らない', () => {
    const stats = calcHistoryStats([emptyOnly])
    expect(stats.maxWeight).toEqual([])
    expect(stats.maxRM).toEqual([])
    expect(stats.totalSets).toEqual([])
    expect(stats.totalVolume).toEqual([])
  })

  it('空セットが混ざる日のセット数は中身のあるセットだけ数える', () => {
    const stats = calcHistoryStats([mixed])
    expect(stats.totalSets).toEqual([{ date: '2026-04-19', value: 1 }])
  })

  it('空セットが混ざる日の総負荷量は中身のあるセットだけで計算する', () => {
    const stats = calcHistoryStats([mixed])
    expect(stats.totalVolume).toEqual([{ date: '2026-04-19', value: 800 }])
  })

  it('空セットが混ざる日でも最大重量・最大RMは中身のあるセットから出す', () => {
    const stats = calcHistoryStats([mixed])
    expect(stats.maxWeight).toEqual([{ date: '2026-04-19', value: 80 }])
    expect(stats.maxRM).toEqual([{ date: '2026-04-19', value: 106.7 }])
  })

  it('重さ0でも回数が入っていれば自重種目としてグラフの点を作る', () => {
    const bodyweight: TrainingRecord = {
      id: 'r-bw',
      date: '2026-04-21',
      exerciseId: 'pushup',
      sets: [{ id: 'bw1', weight: 0, reps: 20, memo: '' }],
    }
    const stats = calcHistoryStats([bodyweight])
    expect(stats.trainedDates).toEqual(['2026-04-21'])
    expect(stats.totalSets).toEqual([{ date: '2026-04-21', value: 1 }])
  })

  it('空セットだけの日を挟んでも中身のある日だけが昇順で返る', () => {
    const stats = calcHistoryStats([mixed, emptyOnly, ...records])
    expect(stats.trainedDates).toEqual(['2026-04-15', '2026-04-17', '2026-04-19'])
  })
})

/**
 * 回帰テスト: kg 段階で丸めてから lbs へ換算すると二段丸めになり、
 * 同じ記録が日付詳細画面（100）と履歴グラフ（99）で食い違っていた。
 * calcHistoryStats は生の kg を返し、丸めは表示側の1回だけにする。
 */
describe('calcHistoryStats - lbs 表示との整合（二段丸め防止）', () => {
  // 45.36kg = 100lbs（lbs 入力を kg 換算して保存したときの値）
  const hundredLbsRecord: TrainingRecord = {
    id: 'r-lbs',
    date: '2026-04-24',
    exerciseId: 'bench',
    sets: [{ id: 'lbs1', weight: 45.36, reps: 1, memo: '' }],
  }

  it('総負荷量は lbs 表示で 100 になる（日付詳細画面と同じ値）', () => {
    const stats = calcHistoryStats([hundredLbsRecord])
    expect(displayVolume(stats.totalVolume[0].value, 'lbs')).toBe(100)
  })

  it('最大重量は lbs 表示で 100 になる（日付詳細画面と同じ値）', () => {
    const stats = calcHistoryStats([hundredLbsRecord])
    expect(displayWeight(stats.maxWeight[0].value, 'lbs')).toBe(100)
  })
})

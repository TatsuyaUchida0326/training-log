import { describe, it, expect } from 'vitest'
import { calcHistoryStats } from './historyStats'
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

import { describe, it, expect } from 'vitest'
import { calcRM, kgToLbs, lbsToKg, displayWeight, inputToKg, getBest1RMs, toHalfWidth } from './training'
import type { TrainingRecord, Exercise } from '../types'

function makeRecord(
  id: string,
  date: string,
  exerciseId: string,
  sets: { weight: number; reps: number }[],
): TrainingRecord {
  return {
    id,
    date,
    exerciseId,
    sets: sets.map((s, i) => ({ id: `s${i}`, weight: s.weight, reps: s.reps, memo: '' })),
  }
}

const exBench: Exercise = { id: 'bench', name: 'ベンチプレス', categoryId: '胸', isCustom: false }
const exSquat: Exercise = { id: 'squat', name: 'スクワット', categoryId: '脚', isCustom: false }

describe('calcRM', () => {
  it('Epley公式で1RMを計算する', () => {
    // 100kg × (1 + 10/30) = 133.3
    expect(calcRM(100, 10)).toBe(133.3)
  })

  it('reps=1の時は重量そのものに近い', () => {
    // 100 × (1 + 1/30) = 103.3
    expect(calcRM(100, 1)).toBe(103.3)
  })

  it('weight=0の時は0を返す', () => {
    expect(calcRM(0, 10)).toBe(0)
  })

  it('reps=0の時は0を返す', () => {
    expect(calcRM(100, 0)).toBe(0)
  })
})

describe('kgToLbs / lbsToKg', () => {
  it('100kg → 220.5lbs', () => {
    expect(kgToLbs(100)).toBe(220.5)
  })

  it('220.5lbs → 約100kg', () => {
    expect(lbsToKg(220.5)).toBeCloseTo(100, 0)
  })
})

describe('toHalfWidth', () => {
  it('全角数字を半角に変換する', () => {
    expect(toHalfWidth('６０')).toBe('60')
  })

  it('全角小数点を半角に変換する', () => {
    expect(toHalfWidth('６０．５')).toBe('60.5')
  })

  it('半角はそのまま返す', () => {
    expect(toHalfWidth('60.5')).toBe('60.5')
  })

  it('混在しても正しく変換する', () => {
    expect(toHalfWidth('１００kg')).toBe('100kg')
  })
})

describe('displayWeight', () => {
  it('unit=kgの時はそのまま返す', () => {
    expect(displayWeight(80, 'kg')).toBe(80)
  })

  it('unit=lbsの時はlbsに変換する', () => {
    expect(displayWeight(100, 'lbs')).toBe(220.5)
  })
})

describe('inputToKg', () => {
  it('unit=kgの時はそのまま返す', () => {
    expect(inputToKg(80, 'kg')).toBe(80)
  })

  it('unit=lbsの時はkgに変換する', () => {
    expect(inputToKg(220.5, 'lbs')).toBeCloseTo(100, 0)
  })
})

describe('getBest1RMs', () => {
  it('記録が空なら空配列を返す', () => {
    expect(getBest1RMs([], [exBench])).toEqual([])
  })

  it('1種目の最高RMと更新日を返す', () => {
    const records = [makeRecord('r1', '2026-04-01', 'bench', [{ weight: 80, reps: 5 }])]
    const result = getBest1RMs(records, [exBench])
    expect(result).toHaveLength(1)
    expect(result[0].exerciseName).toBe('ベンチプレス')
    expect(result[0].rm).toBe(calcRM(80, 5))
    expect(result[0].date).toBe('2026-04-01')
  })

  it('同じ種目で複数日記録がある場合、最高RMの日付を返す', () => {
    const records = [
      makeRecord('r1', '2026-04-01', 'bench', [{ weight: 80, reps: 5 }]),
      makeRecord('r2', '2026-04-10', 'bench', [{ weight: 100, reps: 5 }]), // こちらが最高
      makeRecord('r3', '2026-04-15', 'bench', [{ weight: 90, reps: 5 }]),
    ]
    const result = getBest1RMs(records, [exBench])
    expect(result[0].rm).toBe(calcRM(100, 5))
    expect(result[0].date).toBe('2026-04-10')
  })

  it('複数種目を更新日の新しい順で返す', () => {
    const records = [
      makeRecord('r1', '2026-04-01', 'bench', [{ weight: 80, reps: 5 }]),
      makeRecord('r2', '2026-04-10', 'squat', [{ weight: 120, reps: 5 }]), // スクワットの方が新しい
    ]
    const result = getBest1RMs(records, [exBench, exSquat])
    expect(result[0].exerciseName).toBe('スクワット')
    expect(result[1].exerciseName).toBe('ベンチプレス')
  })

  it('種目マスターに存在しないexerciseIdは除外する', () => {
    const records = [makeRecord('r1', '2026-04-01', 'unknown', [{ weight: 100, reps: 5 }])]
    expect(getBest1RMs(records, [exBench])).toEqual([])
  })

  it('セットが空の記録は無視する', () => {
    const records: TrainingRecord[] = [{ id: 'r1', date: '2026-04-01', exerciseId: 'bench', sets: [] }]
    expect(getBest1RMs(records, [exBench])).toEqual([])
  })

  it('同日の複数セットで最高RMのものを採用する', () => {
    const records = [
      makeRecord('r1', '2026-04-01', 'bench', [
        { weight: 60, reps: 10 },
        { weight: 100, reps: 3 }, // こちらが最高RM
      ]),
    ]
    const result = getBest1RMs(records, [exBench])
    expect(result[0].rm).toBe(calcRM(100, 3))
  })
})

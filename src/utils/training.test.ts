import { describe, it, expect } from 'vitest'
import {
  calcRM,
  kgToLbs,
  lbsToKg,
  displayWeight,
  displayVolume,
  inputToKg,
  getBest1RMs,
  toHalfWidth,
  isFilledSet,
  filledSets,
} from './training'
import type { TrainingRecord, TrainingSet, Exercise } from '../types'

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

describe('displayVolume', () => {
  it('unit=kgの時は整数に丸めて返す', () => {
    expect(displayVolume(1800.4, 'kg')).toBe(1800)
  })

  it('unit=lbsの時は換算して整数に丸める', () => {
    // 100 × 2.20462 = 220.462 → 220。小数に丸めてから整数にすると 221 になる
    expect(displayVolume(100, 'lbs')).toBe(220)
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

function makeSet(weight: number, reps: number): TrainingSet {
  return { id: `set-${weight}-${reps}`, weight, reps, memo: '' }
}

function makeSetRecord(sets: TrainingSet[]): TrainingRecord {
  return { id: 'rec-1', date: '2026-04-23', exerciseId: 'ex-bench', sets }
}

describe('isFilledSet', () => {
  it('重さも回数も入っているセットは入力ありと判定する', () => {
    expect(isFilledSet(makeSet(60, 10))).toBe(true)
  })

  it('重さ0でも回数が入っているセットは入力ありと判定する（自重種目）', () => {
    expect(isFilledSet(makeSet(0, 12))).toBe(true)
  })

  it('回数1回だけのセットも入力ありと判定する（境界値）', () => {
    expect(isFilledSet(makeSet(0, 1))).toBe(true)
  })

  it('重さだけ入っていて回数0のセットは入力なしと判定する', () => {
    expect(isFilledSet(makeSet(60, 0))).toBe(false)
  })

  it('重さも回数も0の空セットは入力なしと判定する', () => {
    expect(isFilledSet(makeSet(0, 0))).toBe(false)
  })

  it('回数が負の値のセットは入力なしと判定する', () => {
    expect(isFilledSet(makeSet(60, -1))).toBe(false)
  })
})

describe('filledSets', () => {
  it('セットが1つもない記録では空配列を返す', () => {
    expect(filledSets(makeSetRecord([]))).toEqual([])
  })

  it('空セットだけの記録では空配列を返す', () => {
    const record = makeSetRecord([makeSet(0, 0), makeSet(0, 0), makeSet(0, 0)])
    expect(filledSets(record)).toEqual([])
  })

  it('重さだけ入って回数0のセットだけの記録では空配列を返す', () => {
    const record = makeSetRecord([makeSet(60, 0), makeSet(70, 0)])
    expect(filledSets(record)).toEqual([])
  })

  it('空セットが混ざっている記録では中身のあるセットだけを返す', () => {
    const filled = makeSet(60, 10)
    const record = makeSetRecord([makeSet(0, 0), filled, makeSet(0, 0)])
    expect(filledSets(record)).toEqual([filled])
  })

  it('中身のあるセットの並び順は元の記録のままにする', () => {
    const first = makeSet(60, 10)
    const second = makeSet(70, 8)
    const record = makeSetRecord([first, makeSet(0, 0), second])
    expect(filledSets(record).map((set) => set.id)).toEqual([first.id, second.id])
  })

  it('全セットに入力がある記録ではすべてのセットを返す', () => {
    const record = makeSetRecord([makeSet(60, 10), makeSet(70, 8)])
    expect(filledSets(record)).toHaveLength(2)
  })

  it('元の記録のセット配列を書き換えない', () => {
    const record = makeSetRecord([makeSet(0, 0), makeSet(60, 10)])
    filledSets(record)
    expect(record.sets).toHaveLength(2)
  })
})

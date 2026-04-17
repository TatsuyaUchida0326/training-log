import { describe, it, expect } from 'vitest'
import { calcRM, kgToLbs, lbsToKg, displayWeight, inputToKg } from './training'

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

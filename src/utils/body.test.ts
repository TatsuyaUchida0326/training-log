import { describe, it, expect } from 'vitest'
import { calcBody } from './body'
import type { BodyRecord, BodySettings } from '../types'

const baseRecord: BodyRecord = {
  date: '2026-04-17',
  weight: 98.2,
  bodyFat: 32.7,
  muscleMass: 15.0,
  waist: 114.1,
  memo: '',
}

const baseSettings: BodySettings = {
  height: 169,
  targetWeight: 75,
  muscleMassUnit: '%',
  targetBodyFat: 0,
}

describe('calcBody', () => {
  it('スクショの値と一致する（BMI=34.38）', () => {
    const { bmi } = calcBody(baseRecord, baseSettings)
    expect(bmi).toBe(34.38)
  })

  it('体脂肪量 = 体重 × 体脂肪% = 32.11', () => {
    const { bodyFatMass } = calcBody(baseRecord, baseSettings)
    expect(bodyFatMass).toBe(32.11)
  })

  it('除脂肪体重 = 体重 - 体脂肪量 = 66.09', () => {
    const { leanBodyMass } = calcBody(baseRecord, baseSettings)
    expect(leanBodyMass).toBe(66.09)
  })

  it('筋重量(%) = 体重 × 筋肉量% = 14.73', () => {
    const { muscleMassKg } = calcBody(baseRecord, baseSettings)
    expect(muscleMassKg).toBe(14.73)
  })

  it('筋重量(kg単位) = 入力値そのまま', () => {
    const { muscleMassKg } = calcBody(
      { ...baseRecord, muscleMass: 40.0 },
      { ...baseSettings, muscleMassUnit: 'kg' }
    )
    expect(muscleMassKg).toBe(40.0)
  })

  it('体重がnullのとき全て null', () => {
    const result = calcBody({ ...baseRecord, weight: null }, baseSettings)
    expect(result.bmi).toBeNull()
    expect(result.bodyFatMass).toBeNull()
    expect(result.leanBodyMass).toBeNull()
    expect(result.muscleMassKg).toBeNull()
  })

  it('身長が0のとき BMI は null', () => {
    const { bmi } = calcBody(baseRecord, { ...baseSettings, height: 0 })
    expect(bmi).toBeNull()
  })

  it('体脂肪がnullのとき bodyFatMass / leanBodyMass は null', () => {
    const result = calcBody({ ...baseRecord, bodyFat: null }, baseSettings)
    expect(result.bodyFatMass).toBeNull()
    expect(result.leanBodyMass).toBeNull()
  })
})

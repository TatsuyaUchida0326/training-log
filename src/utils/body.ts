import type { BodyRecord, BodySettings } from '../types'

export interface BodyCalcResult {
  bmi: number | null
  bodyFatMass: number | null   // 体脂肪量 kg
  leanBodyMass: number | null  // 除脂肪体重 kg
  muscleMassKg: number | null  // 筋重量 kg
}

export function calcBody(
  record: BodyRecord,
  settings: BodySettings
): BodyCalcResult {
  const { weight, bodyFat, muscleMass } = record
  const { height, muscleMassUnit } = settings

  // BMI: 身長が未設定(0)なら計算不可
  const bmi =
    weight !== null && height > 0
      ? Math.round((weight / Math.pow(height / 100, 2)) * 100) / 100
      : null

  // 体脂肪量
  const bodyFatMass =
    weight !== null && bodyFat !== null
      ? Math.round(weight * (bodyFat / 100) * 100) / 100
      : null

  // 除脂肪体重
  const leanBodyMass =
    weight !== null && bodyFatMass !== null
      ? Math.round((weight - bodyFatMass) * 100) / 100
      : null

  // 筋重量
  let muscleMassKg: number | null = null
  if (muscleMass !== null && weight !== null) {
    muscleMassKg =
      muscleMassUnit === '%'
        ? Math.round(weight * (muscleMass / 100) * 100) / 100
        : Math.round(muscleMass * 100) / 100
  }

  return { bmi, bodyFatMass, leanBodyMass, muscleMassKg }
}

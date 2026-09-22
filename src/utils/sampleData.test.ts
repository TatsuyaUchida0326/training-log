import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { applySampleData } from './sampleData'
import { DEFAULT_EXERCISES } from '../data/defaultExercises'
import { BODY_RECORDS_KEY, BODY_SETTINGS_KEY, EXERCISES_KEY, RECORDS_KEY, SETTINGS_KEY } from '../test/storageKeys'
import type { BodyRecord, BodySettings, TrainingRecord } from '../types'

const TODAY = new Date(2026, 8, 23)

describe('applySampleData', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('トレーニング記録を localStorage に保存する', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    const stored = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '[]') as TrainingRecord[]
    expect(stored.length).toBeGreaterThan(0)
  })

  it('体組成記録を localStorage に保存する', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    const stored = JSON.parse(localStorage.getItem(BODY_RECORDS_KEY) ?? '[]') as BodyRecord[]
    expect(stored.length).toBeGreaterThan(0)
  })

  it('既存の記録を上書きする（追記しない）', () => {
    localStorage.setItem(
      RECORDS_KEY,
      JSON.stringify([
        { id: 'old', date: '2020-01-01', exerciseId: 'default-0', sets: [] },
      ] satisfies TrainingRecord[]),
    )

    applySampleData(DEFAULT_EXERCISES, TODAY)

    const stored = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '[]') as TrainingRecord[]
    expect(stored.some((record) => record.id === 'old')).toBe(false)
  })

  it('記録設定と種目一覧には触らない', () => {
    applySampleData(DEFAULT_EXERCISES, TODAY)
    expect(localStorage.getItem(SETTINGS_KEY)).toBeNull()
    expect(localStorage.getItem(EXERCISES_KEY)).toBeNull()
  })

  it('体組成の設定（身長・目標値）も入れる', () => {
    // 身長が無いと体組成画面の BMI・除脂肪体重が出ず、見せる状態にならない
    applySampleData(DEFAULT_EXERCISES, TODAY)
    const stored = JSON.parse(localStorage.getItem(BODY_SETTINGS_KEY) ?? '{}') as BodySettings
    expect(stored.height).toBeGreaterThan(0)
    expect(stored.targetWeight).toBeGreaterThan(0)
    expect(stored.targetBodyFat).toBeGreaterThan(0)
  })
})

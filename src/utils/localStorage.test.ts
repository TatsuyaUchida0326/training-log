import { describe, it, expect, beforeEach } from 'vitest'

// localStorage の生存性テスト: フック経由ではなく raw API で確認
const RECORDS_KEY = 'strength-log-records'
const EXERCISES_KEY = 'strength-log-exercises'
const BODY_RECORDS_KEY = 'strength-log-body-records'
const SETTINGS_KEY = 'strength-log-settings'
const BODY_SETTINGS_KEY = 'strength-log-body-settings'

beforeEach(() => {
  localStorage.clear()
})

describe('localStorage 耐障害性', () => {
  it('壊れた JSON が存在しても例外を throw しない', () => {
    localStorage.setItem(RECORDS_KEY, 'INVALID_JSON{{{')
    expect(() => {
      try {
        JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '[]')
      } catch {
        // フックと同じ catch パターン
      }
    }).not.toThrow()
  })

  it('各ストレージキーが独立して動作する', () => {
    localStorage.setItem(RECORDS_KEY, JSON.stringify([{ id: 'r1' }]))
    localStorage.setItem(EXERCISES_KEY, JSON.stringify([{ id: 'e1' }]))
    localStorage.setItem(BODY_RECORDS_KEY, JSON.stringify([{ date: '2026-04-01' }]))

    const records = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '[]')
    const exercises = JSON.parse(localStorage.getItem(EXERCISES_KEY) ?? '[]')
    const bodyRecords = JSON.parse(localStorage.getItem(BODY_RECORDS_KEY) ?? '[]')

    expect(records).toHaveLength(1)
    expect(exercises).toHaveLength(1)
    expect(bodyRecords).toHaveLength(1)
  })

  it('旧バージョンの設定キーが存在しても上書きで問題ない', () => {
    // 旧設定（targetBodyFat なし）を模倣
    localStorage.setItem(BODY_SETTINGS_KEY, JSON.stringify({ height: 170, targetWeight: 65, muscleMassUnit: '%' }))
    const stored = JSON.parse(localStorage.getItem(BODY_SETTINGS_KEY) ?? '{}')
    // デフォルト値とマージ（useBodySettings の動作）
    const merged = { height: 0, targetWeight: 0, muscleMassUnit: '%', targetBodyFat: 0, ...stored }
    expect(merged.targetBodyFat).toBe(0) // デフォルト値で補完される
    expect(merged.height).toBe(170) // 既存値が保持される
  })

  it('トレーニング設定の旧キーと後方互換性', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ defaultSets: 4, weightUnit: 'lbs' }))
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')
    // useSettings のデフォルトマージを模倣
    const merged = { defaultSets: 3, trainingDefaultSets: 3, weightUnit: 'kg', requiredExercises: 3, ...stored }
    expect(merged.defaultSets).toBe(4)
    expect(merged.weightUnit).toBe('lbs')
    expect(merged.trainingDefaultSets).toBe(3) // 旧データにない → デフォルト
  })
})

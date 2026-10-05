import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { DEFAULT_BODY_SETTINGS, STORAGE_KEY, useBodySettings } from './useBodySettings'

describe('useBodySettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('初期値は height=0, targetWeight=0, muscleMassUnit=%, targetBodyFat=0', () => {
    const { result } = renderHook(() => useBodySettings())
    expect(result.current.settings.height).toBe(0)
    expect(result.current.settings.targetWeight).toBe(0)
    expect(result.current.settings.muscleMassUnit).toBe('%')
    expect(result.current.settings.targetBodyFat).toBe(0)
  })

  it('updateSettings で身長を更新できる', () => {
    const { result } = renderHook(() => useBodySettings())
    act(() => { result.current.updateSettings({ height: 170 }) })
    expect(result.current.settings.height).toBe(170)
  })

  it('updateSettings で部分更新できる（他フィールド保持）', () => {
    const { result } = renderHook(() => useBodySettings())
    act(() => { result.current.updateSettings({ height: 170, targetWeight: 70 }) })
    act(() => { result.current.updateSettings({ height: 172 }) })
    expect(result.current.settings.height).toBe(172)
    expect(result.current.settings.targetWeight).toBe(70)
  })

  it('localStorage に保存・復元できる', () => {
    const { result: r1 } = renderHook(() => useBodySettings())
    act(() => { r1.current.updateSettings({ height: 169, targetWeight: 75 }) })
    const { result: r2 } = renderHook(() => useBodySettings())
    expect(r2.current.settings.height).toBe(169)
    expect(r2.current.settings.targetWeight).toBe(75)
  })

  it('updateSettings で targetBodyFat を更新できる', () => {
    const { result } = renderHook(() => useBodySettings())
    act(() => { result.current.updateSettings({ targetBodyFat: 20 }) })
    expect(result.current.settings.targetBodyFat).toBe(20)
  })

  it('localStorage に targetBodyFat が保存・復元できる', () => {
    const { result: r1 } = renderHook(() => useBodySettings())
    act(() => { r1.current.updateSettings({ targetBodyFat: 18 }) })
    const { result: r2 } = renderHook(() => useBodySettings())
    expect(r2.current.settings.targetBodyFat).toBe(18)
  })
})

describe('useBodySettings — 目標筋肉量と baseline', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('既定値は targetMuscleMass=0（未設定）, goalBaselines={}', () => {
    expect(DEFAULT_BODY_SETTINGS.targetMuscleMass).toBe(0)
    expect(DEFAULT_BODY_SETTINGS.goalBaselines).toEqual({})
  })

  it('何も保存されていなければ新項目も既定値で読める', () => {
    const { result } = renderHook(() => useBodySettings())
    expect(result.current.settings.targetMuscleMass).toBe(0)
    expect(result.current.settings.goalBaselines).toEqual({})
  })

  it('新項目の無い旧データを読んでも、既存の値はそのままで新項目は既定値になる', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ height: 172, targetWeight: 70, muscleMassUnit: 'kg', targetBodyFat: 15 }),
    )
    const { result } = renderHook(() => useBodySettings())
    expect(result.current.settings).toEqual({
      height: 172,
      targetWeight: 70,
      muscleMassUnit: 'kg',
      targetBodyFat: 15,
      targetMuscleMass: 0,
      goalBaselines: {},
    })
  })

  it('updateSettings で targetMuscleMass と goalBaselines を更新・保存・復元できる', () => {
    const { result: r1 } = renderHook(() => useBodySettings())
    act(() => {
      r1.current.updateSettings({ targetMuscleMass: 42, goalBaselines: { weight: 70, muscleMass: 36 } })
    })
    const { result: r2 } = renderHook(() => useBodySettings())
    expect(r2.current.settings.targetMuscleMass).toBe(42)
    expect(r2.current.settings.goalBaselines).toEqual({ weight: 70, muscleMass: 36 })
  })

  it('他の項目を更新しても goalBaselines は保持される', () => {
    const { result } = renderHook(() => useBodySettings())
    act(() => { result.current.updateSettings({ goalBaselines: { weight: 70 } }) })
    act(() => { result.current.updateSettings({ height: 170 }) })
    expect(result.current.settings.goalBaselines).toEqual({ weight: 70 })
  })
})

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useSettings } from './useSettings'

const STORAGE_KEY = 'strength-log-settings'

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('初期値: defaultSets=3, trainingDefaultSets=3, weightUnit="kg" が返る', () => {
    const { result } = renderHook(() => useSettings())
    expect(result.current.settings.defaultSets).toBe(3)
    expect(result.current.settings.trainingDefaultSets).toBe(3)
    expect(result.current.settings.weightUnit).toBe('kg')
  })

  it('updateDefaultSets(5) で settings.defaultSets が 5 になる', () => {
    const { result } = renderHook(() => useSettings())
    act(() => {
      result.current.updateDefaultSets(5)
    })
    expect(result.current.settings.defaultSets).toBe(5)
  })

  it('updateDefaultSets で localStorage に保存される', () => {
    const { result } = renderHook(() => useSettings())
    act(() => {
      result.current.updateDefaultSets(7)
    })
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored.defaultSets).toBe(7)
  })

  it('updateTrainingDefaultSets(4) で settings.trainingDefaultSets が 4 になる', () => {
    const { result } = renderHook(() => useSettings())
    act(() => {
      result.current.updateTrainingDefaultSets(4)
    })
    expect(result.current.settings.trainingDefaultSets).toBe(4)
  })

  it('updateTrainingDefaultSets で localStorage に保存される', () => {
    const { result } = renderHook(() => useSettings())
    act(() => {
      result.current.updateTrainingDefaultSets(4)
    })
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored.trainingDefaultSets).toBe(4)
  })

  it('updateWeightUnit("lbs") で settings.weightUnit が "lbs" になる', () => {
    const { result } = renderHook(() => useSettings())
    act(() => {
      result.current.updateWeightUnit('lbs')
    })
    expect(result.current.settings.weightUnit).toBe('lbs')
  })

  it('updateWeightUnit で localStorage に保存される', () => {
    const { result } = renderHook(() => useSettings())
    act(() => {
      result.current.updateWeightUnit('lbs')
    })
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored.weightUnit).toBe('lbs')
  })

  it('localStorage に既存値があれば読み込む', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ defaultSets: 5, weightUnit: 'lbs' })
    )
    const { result } = renderHook(() => useSettings())
    expect(result.current.settings.defaultSets).toBe(5)
    expect(result.current.settings.weightUnit).toBe('lbs')
  })
})

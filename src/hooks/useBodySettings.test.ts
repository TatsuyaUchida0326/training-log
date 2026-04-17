import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useBodySettings } from './useBodySettings'

describe('useBodySettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('初期値は height=0, targetWeight=0, muscleMassUnit=%', () => {
    const { result } = renderHook(() => useBodySettings())
    expect(result.current.settings.height).toBe(0)
    expect(result.current.settings.targetWeight).toBe(0)
    expect(result.current.settings.muscleMassUnit).toBe('%')
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
})

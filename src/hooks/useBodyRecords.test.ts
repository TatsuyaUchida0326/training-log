import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useBodyRecords } from './useBodyRecords'

describe('useBodyRecords', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('初回ロードで空配列が返る', () => {
    const { result } = renderHook(() => useBodyRecords())
    expect(result.current.records).toEqual([])
  })

  it('getRecord: 存在しない日付はデフォルト値を返す', () => {
    const { result } = renderHook(() => useBodyRecords())
    const rec = result.current.getRecord('2026-04-17')
    expect(rec.date).toBe('2026-04-17')
    expect(rec.weight).toBeNull()
    expect(rec.bodyFat).toBeNull()
    expect(rec.memo).toBe('')
  })

  it('upsertRecord で新規レコードを保存できる', () => {
    const { result } = renderHook(() => useBodyRecords())
    act(() => {
      result.current.upsertRecord({
        date: '2026-04-17',
        weight: 75.0,
        bodyFat: 20.0,
        muscleMass: 40.0,
        waist: 80.0,
        memo: 'テスト',
      })
    })
    expect(result.current.records).toHaveLength(1)
    expect(result.current.getRecord('2026-04-17').weight).toBe(75.0)
  })

  it('upsertRecord で既存レコードを上書きできる', () => {
    const { result } = renderHook(() => useBodyRecords())
    act(() => {
      result.current.upsertRecord({ date: '2026-04-17', weight: 75.0, bodyFat: null, muscleMass: null, waist: null, memo: '' })
    })
    act(() => {
      result.current.upsertRecord({ date: '2026-04-17', weight: 74.5, bodyFat: null, muscleMass: null, waist: null, memo: '' })
    })
    expect(result.current.records).toHaveLength(1)
    expect(result.current.getRecord('2026-04-17').weight).toBe(74.5)
  })

  it('updateField で特定フィールドだけ更新できる', () => {
    const { result } = renderHook(() => useBodyRecords())
    act(() => {
      result.current.upsertRecord({ date: '2026-04-17', weight: 75.0, bodyFat: 20.0, muscleMass: null, waist: null, memo: '' })
    })
    act(() => {
      result.current.updateField('2026-04-17', 'weight', 74.8)
    })
    const rec = result.current.getRecord('2026-04-17')
    expect(rec.weight).toBe(74.8)
    expect(rec.bodyFat).toBe(20.0) // 他フィールドは変わらない
  })

  it('clearField でフィールドを null にできる', () => {
    const { result } = renderHook(() => useBodyRecords())
    act(() => {
      result.current.upsertRecord({ date: '2026-04-17', weight: 75.0, bodyFat: 20.0, muscleMass: null, waist: null, memo: '' })
    })
    act(() => {
      result.current.clearField('2026-04-17', 'weight')
    })
    expect(result.current.getRecord('2026-04-17').weight).toBeNull()
  })

  it('localStorage に保存・復元できる', () => {
    const { result: r1 } = renderHook(() => useBodyRecords())
    act(() => {
      r1.current.upsertRecord({ date: '2026-04-17', weight: 75.0, bodyFat: null, muscleMass: null, waist: null, memo: '' })
    })
    const { result: r2 } = renderHook(() => useBodyRecords())
    expect(r2.current.getRecord('2026-04-17').weight).toBe(75.0)
  })
})

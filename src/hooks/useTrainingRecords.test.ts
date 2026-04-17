import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useTrainingRecords } from './useTrainingRecords'
import type { TrainingRecord } from '../types'

const makeRecord = (overrides: Partial<TrainingRecord> = {}): TrainingRecord => ({
  id: 'rec-1',
  date: '2026-04-17',
  exerciseId: 'ex-bench',
  sets: [
    { id: 'set-1', weight: 80, reps: 10, memo: '' },
    { id: 'set-2', weight: 90, reps: 8, memo: '' },
  ],
  ...overrides,
})

describe('useTrainingRecords', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('初回ロードで空配列が返る', () => {
    const { result } = renderHook(() => useTrainingRecords())
    expect(result.current.records).toEqual([])
  })

  it('upsertRecord で新規レコードを追加できる', () => {
    const { result } = renderHook(() => useTrainingRecords())
    const rec = makeRecord()
    act(() => { result.current.upsertRecord(rec) })
    expect(result.current.records).toHaveLength(1)
    expect(result.current.records[0].id).toBe('rec-1')
  })

  it('upsertRecord で既存レコードを上書きできる', () => {
    const { result } = renderHook(() => useTrainingRecords())
    act(() => { result.current.upsertRecord(makeRecord()) })
    act(() => {
      result.current.upsertRecord(makeRecord({ sets: [] }))
    })
    expect(result.current.records).toHaveLength(1)
    expect(result.current.records[0].sets).toHaveLength(0)
  })

  it('getRecordsByDate で日付フィルタリングできる', () => {
    const { result } = renderHook(() => useTrainingRecords())
    act(() => {
      result.current.upsertRecord(makeRecord({ id: 'r1', date: '2026-04-17' }))
      result.current.upsertRecord(makeRecord({ id: 'r2', date: '2026-04-16' }))
    })
    const byDate = result.current.getRecordsByDate('2026-04-17')
    expect(byDate).toHaveLength(1)
    expect(byDate[0].id).toBe('r1')
  })

  it('getRecord で exerciseId + date で取得できる', () => {
    const { result } = renderHook(() => useTrainingRecords())
    act(() => { result.current.upsertRecord(makeRecord()) })
    const rec = result.current.getRecord('ex-bench', '2026-04-17')
    expect(rec?.id).toBe('rec-1')
  })

  it('getRecord が存在しない場合は null を返す', () => {
    const { result } = renderHook(() => useTrainingRecords())
    expect(result.current.getRecord('ex-bench', '2026-04-17')).toBeNull()
  })

  it('getLastRecord で指定日より前の最新レコードを返す', () => {
    const { result } = renderHook(() => useTrainingRecords())
    act(() => {
      result.current.upsertRecord(makeRecord({ id: 'old', date: '2026-04-10' }))
      result.current.upsertRecord(makeRecord({ id: 'newer', date: '2026-04-15' }))
    })
    const last = result.current.getLastRecord('ex-bench', '2026-04-17')
    expect(last?.id).toBe('newer')
  })

  it('getLastRecord で同日・未来は除外される', () => {
    const { result } = renderHook(() => useTrainingRecords())
    act(() => {
      result.current.upsertRecord(makeRecord({ id: 'same', date: '2026-04-17' }))
      result.current.upsertRecord(makeRecord({ id: 'future', date: '2026-04-18' }))
    })
    const last = result.current.getLastRecord('ex-bench', '2026-04-17')
    expect(last).toBeNull()
  })

  it('addSet でセットを追加できる', () => {
    const { result } = renderHook(() => useTrainingRecords())
    act(() => { result.current.upsertRecord(makeRecord()) })
    act(() => {
      result.current.addSet('rec-1', { id: 'set-3', weight: 100, reps: 5, memo: '' })
    })
    expect(result.current.records[0].sets).toHaveLength(3)
  })

  it('updateSet でセットを更新できる', () => {
    const { result } = renderHook(() => useTrainingRecords())
    act(() => { result.current.upsertRecord(makeRecord()) })
    act(() => {
      result.current.updateSet('rec-1', 'set-1', { weight: 85, reps: 12 })
    })
    const updated = result.current.records[0].sets.find((s) => s.id === 'set-1')
    expect(updated?.weight).toBe(85)
    expect(updated?.reps).toBe(12)
  })

  it('deleteSet でセットを削除できる', () => {
    const { result } = renderHook(() => useTrainingRecords())
    act(() => { result.current.upsertRecord(makeRecord()) })
    act(() => { result.current.deleteSet('rec-1', 'set-1') })
    expect(result.current.records[0].sets).toHaveLength(1)
    expect(result.current.records[0].sets[0].id).toBe('set-2')
  })

  it('removeRecord でレコードを削除できる', () => {
    const { result } = renderHook(() => useTrainingRecords())
    act(() => { result.current.upsertRecord(makeRecord()) })
    act(() => { result.current.removeRecord('rec-1') })
    expect(result.current.records).toHaveLength(0)
  })

  it('localStorage に保存・復元できる', () => {
    const { result: r1 } = renderHook(() => useTrainingRecords())
    act(() => { r1.current.upsertRecord(makeRecord()) })

    const { result: r2 } = renderHook(() => useTrainingRecords())
    expect(r2.current.records).toHaveLength(1)
    expect(r2.current.records[0].id).toBe('rec-1')
  })
})

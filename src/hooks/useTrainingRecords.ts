import { useState, useCallback } from 'react'
import type { TrainingRecord, TrainingSet } from '../types'
import { hasFilledSets } from '../utils/training'
import { isArrayOf, loadStoredValue, writeStoredValue } from '../utils/storage'

export const STORAGE_KEY = 'strength-log-records'

function loadRecords(): TrainingRecord[] {
  return loadStoredValue<TrainingRecord[]>(STORAGE_KEY, isArrayOf) ?? []
}

function persist(records: TrainingRecord[]): void {
  writeStoredValue(STORAGE_KEY, records)
}

export function useTrainingRecords() {
  const [records, setRecords] = useState<TrainingRecord[]>(loadRecords)

  function getRecordsByDate(date: string): TrainingRecord[] {
    return records.filter((r) => r.date === date)
  }

  function getRecord(exerciseId: string, date: string): TrainingRecord | null {
    return records.find((r) => r.exerciseId === exerciseId && r.date === date) ?? null
  }

  // 指定日より前で、中身のあるセットを持つ最新記録を返す
  function getLastRecord(exerciseId: string, beforeDate: string): TrainingRecord | null {
    const past = records
      .filter(
        (record) =>
          record.exerciseId === exerciseId &&
          record.date < beforeDate &&
          hasFilledSets(record),
      )
      .sort((a, b) => b.date.localeCompare(a.date))
    return past[0] ?? null
  }

  const upsertRecord = useCallback((record: TrainingRecord): void => {
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === record.id)
      const next =
        idx >= 0
          ? prev.map((r, i) => (i === idx ? record : r))
          : [...prev, record]
      persist(next)
      return next
    })
  }, [])

  function addSet(recordId: string, set: TrainingSet): void {
    setRecords((prev) => {
      const next = prev.map((r) =>
        r.id === recordId ? { ...r, sets: [...r.sets, set] } : r
      )
      persist(next)
      return next
    })
  }

  function updateSet(recordId: string, setId: string, updates: Partial<TrainingSet>): void {
    setRecords((prev) => {
      const next = prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              sets: r.sets.map((s) => (s.id === setId ? { ...s, ...updates } : s)),
            }
          : r
      )
      persist(next)
      return next
    })
  }

  function deleteSet(recordId: string, setId: string): void {
    setRecords((prev) => {
      const next = prev.map((r) =>
        r.id === recordId ? { ...r, sets: r.sets.filter((s) => s.id !== setId) } : r
      )
      persist(next)
      return next
    })
  }

  function removeRecord(id: string): void {
    setRecords((prev) => {
      const next = prev.filter((r) => r.id !== id)
      persist(next)
      return next
    })
  }

  return {
    records,
    getRecordsByDate,
    getRecord,
    getLastRecord,
    upsertRecord,
    addSet,
    updateSet,
    deleteSet,
    removeRecord,
  }
}

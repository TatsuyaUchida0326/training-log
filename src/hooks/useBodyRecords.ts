import { useState } from 'react'
import type { BodyRecord } from '../types'

const STORAGE_KEY = 'strength-log-body-records'

function load(): BodyRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as BodyRecord[]
  } catch {
    // ignore
  }
  return []
}

function persist(records: BodyRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

const EMPTY_RECORD = (date: string): BodyRecord => ({
  date,
  weight: null,
  bodyFat: null,
  muscleMass: null,
  waist: null,
  memo: '',
})

export function useBodyRecords() {
  const [records, setRecords] = useState<BodyRecord[]>(load)

  function getRecord(date: string): BodyRecord {
    return records.find((r) => r.date === date) ?? EMPTY_RECORD(date)
  }

  function upsertRecord(record: BodyRecord): void {
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.date === record.date)
      const next =
        idx >= 0
          ? prev.map((r, i) => (i === idx ? record : r))
          : [...prev, record]
      persist(next)
      return next
    })
  }

  function updateField<K extends keyof BodyRecord>(
    date: string,
    field: K,
    value: BodyRecord[K]
  ): void {
    const current = getRecord(date)
    upsertRecord({ ...current, [field]: value })
  }

  function clearField(date: string, field: keyof BodyRecord): void {
    updateField(date, field, null as BodyRecord[typeof field])
  }

  return { records, getRecord, upsertRecord, updateField, clearField }
}

import { format } from 'date-fns'
import type { BodyRecord, BodySettings, Exercise, Settings, TrainingRecord } from '../types'
import { DEFAULT_BODY_SETTINGS } from '../hooks/useBodySettings'
import { DEFAULT_SETTINGS } from '../hooks/useSettings'
import {
  BODY_RECORDS_KEY,
  BODY_SETTINGS_KEY,
  EXERCISES_KEY,
  RECORDS_KEY,
  SETTINGS_KEY,
} from './storageKeys'

/** 設定を localStorage に書き込む。指定した項目だけ既定値から差し替える */
export function seedSettings(overrides: Partial<Settings> = {}): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, ...overrides }))
}

/** 種目一覧を localStorage に書き込む */
export function seedExercises(exercises: Exercise[]): void {
  localStorage.setItem(EXERCISES_KEY, JSON.stringify(exercises))
}

/** トレーニング記録を localStorage に書き込む */
export function seedRecords(records: TrainingRecord[]): void {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
}

/** localStorage に保存されているトレーニング記録を読む */
export function readStoredRecords(): TrainingRecord[] {
  return JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '[]') as TrainingRecord[]
}

/** 画面が「今日」として扱う日付文字列 */
export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** 体組成の1日分の記録。指定しない項目は null（未入力） */
export function makeBodyRecord(date: string, overrides: Partial<BodyRecord> = {}): BodyRecord {
  return { date, weight: null, bodyFat: null, muscleMass: null, waist: null, memo: '', ...overrides }
}

/** 体組成の記録を localStorage に書き込む */
export function seedBodyRecords(records: BodyRecord[]): void {
  localStorage.setItem(BODY_RECORDS_KEY, JSON.stringify(records))
}

/** 体組成の設定を localStorage に書き込む。指定した項目だけ既定値から差し替える */
export function seedBodySettings(overrides: Partial<BodySettings> = {}): void {
  localStorage.setItem(BODY_SETTINGS_KEY, JSON.stringify({ ...DEFAULT_BODY_SETTINGS, ...overrides }))
}

/** localStorage に保存されている体組成の設定を読む */
export function readStoredBodySettings(): BodySettings {
  return JSON.parse(localStorage.getItem(BODY_SETTINGS_KEY) ?? '{}') as BodySettings
}

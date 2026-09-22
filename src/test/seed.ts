import { format } from 'date-fns'
import type { Exercise, Settings, TrainingRecord } from '../types'
import { DEFAULT_SETTINGS } from '../hooks/useSettings'
import { EXERCISES_KEY, RECORDS_KEY, SETTINGS_KEY } from './storageKeys'

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

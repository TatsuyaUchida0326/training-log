import { format } from 'date-fns'
import { DEFAULT_EXERCISES } from '../data/defaultExercises'
import { STORAGE_KEY as BODY_RECORDS_KEY } from '../hooks/useBodyRecords'
import { DEFAULT_BODY_SETTINGS, STORAGE_KEY as BODY_SETTINGS_KEY } from '../hooks/useBodySettings'
import { STORAGE_KEY as EXERCISES_KEY } from '../hooks/useExercises'
import { DEFAULT_SETTINGS, STORAGE_KEY as SETTINGS_KEY } from '../hooks/useSettings'
import { STORAGE_KEY as RECORDS_KEY } from '../hooks/useTrainingRecords'
import type { BodyRecord, BodySettings, Exercise, Settings, TrainingRecord } from '../types'
import { isArrayOf, isPlainObject, peekStoredValue, writeStoredValue } from './storage'

/** 他アプリの JSON を取り込んでしまわないための目印 */
export const BACKUP_APP_NAME = 'strength-log'

/** 書き出すバックアップの形式バージョン */
export const BACKUP_VERSION = 1

/**
 * 記録は種目 ID を参照しているので、種目一覧を含めないと復元しても種目名が出ない。
 * 5種類すべてをひとまとめにして書き出す。
 */
export interface BackupData {
  records: TrainingRecord[]
  exercises: Exercise[]
  settings: Settings
  bodyRecords: BodyRecord[]
  bodySettings: BodySettings
}

export interface Backup {
  app: string
  version: number
  exportedAt: string
  data: BackupData
}

/** 保存中のデータをバックアップの形にまとめる。壊れた値は既定値に置き換える（読むだけで消さない） */
export function buildBackup(now: Date = new Date()): Backup {
  return {
    app: BACKUP_APP_NAME,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: {
      records: peekStoredValue<TrainingRecord[]>(RECORDS_KEY, isArrayOf) ?? [],
      exercises: peekStoredValue<Exercise[]>(EXERCISES_KEY, isArrayOf) ?? DEFAULT_EXERCISES,
      settings: { ...DEFAULT_SETTINGS, ...(peekStoredValue(SETTINGS_KEY, isPlainObject) ?? {}) },
      bodyRecords: peekStoredValue<BodyRecord[]>(BODY_RECORDS_KEY, isArrayOf) ?? [],
      bodySettings: {
        ...DEFAULT_BODY_SETTINGS,
        ...(peekStoredValue(BODY_SETTINGS_KEY, isPlainObject) ?? {}),
      },
    },
  }
}

/**
 * ファイルの中身を検証してバックアップとして読む。
 * Strength Log のバックアップでなければ null。例外は投げない（利用者が選ぶのは任意のファイルなので）。
 */
export function parseBackup(text: string): Backup | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    return null
  }
  if (!isPlainObject(parsed)) return null
  if (parsed.app !== BACKUP_APP_NAME) return null
  if (typeof parsed.version !== 'number') return null

  const data = parsed.data
  if (!isPlainObject(data)) return null
  if (!isArrayOf<TrainingRecord>(data.records)) return null
  if (!isArrayOf<Exercise>(data.exercises)) return null
  if (!isArrayOf<BodyRecord>(data.bodyRecords)) return null
  if (!isPlainObject(data.settings)) return null
  if (!isPlainObject(data.bodySettings)) return null

  return {
    app: BACKUP_APP_NAME,
    // 将来のバージョンでも読めるところまでは読む（前方互換は保証しないが落とさない）
    version: parsed.version,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
    data: {
      records: data.records as TrainingRecord[],
      exercises: data.exercises as Exercise[],
      settings: data.settings as unknown as Settings,
      bodyRecords: data.bodyRecords as BodyRecord[],
      bodySettings: data.bodySettings as unknown as BodySettings,
    },
  }
}

/** バックアップの中身で保存データを置き換える */
export function restoreBackup(backup: Backup): void {
  writeStoredValue(RECORDS_KEY, backup.data.records)
  writeStoredValue(EXERCISES_KEY, backup.data.exercises)
  writeStoredValue(SETTINGS_KEY, backup.data.settings)
  writeStoredValue(BODY_RECORDS_KEY, backup.data.bodyRecords)
  writeStoredValue(BODY_SETTINGS_KEY, backup.data.bodySettings)
}

/** 書き出すファイル名。日付が入っていれば世代が分かる */
export function buildBackupFileName(now: Date = new Date()): string {
  return `${BACKUP_APP_NAME}-backup-${format(now, 'yyyy-MM-dd')}.json`
}

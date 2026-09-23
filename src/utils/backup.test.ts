import { describe, it, expect, beforeEach } from 'vitest'
import {
  BACKUP_APP_NAME,
  BACKUP_VERSION,
  buildBackup,
  buildBackupFileName,
  parseBackup,
  restoreBackup,
} from './backup'
import { DEFAULT_SETTINGS } from '../hooks/useSettings'
import { DEFAULT_BODY_SETTINGS } from '../hooks/useBodySettings'
import {
  BODY_RECORDS_KEY,
  BODY_SETTINGS_KEY,
  EXERCISES_KEY,
  RECORDS_KEY,
  SETTINGS_KEY,
} from '../test/storageKeys'
import type { BodyRecord, Exercise, TrainingRecord } from '../types'

const RECORD: TrainingRecord = {
  id: 'r1',
  date: '2026-09-20',
  exerciseId: 'custom-1',
  sets: [{ id: 's1', weight: 60, reps: 10, memo: '' }],
}

const CUSTOM_EXERCISE: Exercise = {
  id: 'custom-1',
  name: '自作種目',
  categoryId: 'その他',
  isCustom: true,
}

const BODY_RECORD: BodyRecord = {
  date: '2026-09-20',
  weight: 70,
  bodyFat: 18,
  muscleMass: 35,
  waist: 80,
  memo: '',
}

function seedAllData(): void {
  localStorage.setItem(RECORDS_KEY, JSON.stringify([RECORD]))
  localStorage.setItem(EXERCISES_KEY, JSON.stringify([CUSTOM_EXERCISE]))
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, weightUnit: 'lbs' }))
  localStorage.setItem(BODY_RECORDS_KEY, JSON.stringify([BODY_RECORD]))
  localStorage.setItem(
    BODY_SETTINGS_KEY,
    JSON.stringify({ ...DEFAULT_BODY_SETTINGS, height: 172 }),
  )
}

describe('buildBackup', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('5種類のデータをすべて含む', () => {
    seedAllData()
    const backup = buildBackup()
    expect(Object.keys(backup.data).sort()).toEqual(
      ['bodyRecords', 'bodySettings', 'exercises', 'records', 'settings'].sort(),
    )
  })

  it('アプリ名とバージョンが入る', () => {
    const backup = buildBackup()
    expect(backup.app).toBe(BACKUP_APP_NAME)
    expect(backup.version).toBe(BACKUP_VERSION)
  })

  it('exportedAt に書き出した時刻が ISO 文字列で入る', () => {
    const backup = buildBackup(new Date('2026-09-23T01:02:03.000Z'))
    expect(backup.exportedAt).toBe('2026-09-23T01:02:03.000Z')
  })

  it('カスタム種目を含む種目一覧が入る（記録が種目 ID を参照しているため）', () => {
    seedAllData()
    const backup = buildBackup()
    expect(backup.data.exercises).toEqual([CUSTOM_EXERCISE])
  })

  it('保存データが壊れていても既定値で書き出せる', () => {
    localStorage.setItem(RECORDS_KEY, 'INVALID_JSON{{{')
    const backup = buildBackup()
    expect(backup.data.records).toEqual([])
  })

  it('書き出しでは壊れた値を退避しない（読むだけ）', () => {
    localStorage.setItem(RECORDS_KEY, 'INVALID_JSON{{{')
    buildBackup()
    expect(localStorage.getItem(RECORDS_KEY)).toBe('INVALID_JSON{{{')
  })
})

describe('parseBackup', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('書き出した内容をそのまま取り込むと元に戻る（往復）', () => {
    seedAllData()
    const backup = buildBackup()
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup)
  })

  it('app が違う JSON は null', () => {
    const foreign = JSON.stringify({ ...buildBackup(), app: 'other-app' })
    expect(parseBackup(foreign)).toBeNull()
  })

  it('壊れた JSON は null（例外を投げない）', () => {
    expect(() => parseBackup('INVALID_JSON{{{')).not.toThrow()
    expect(parseBackup('INVALID_JSON{{{')).toBeNull()
  })

  it('JSON だがオブジェクトでないものは null', () => {
    expect(parseBackup('[]')).toBeNull()
    expect(parseBackup('"strength-log"')).toBeNull()
  })

  it('version が数値でなければ null', () => {
    const invalid = JSON.stringify({ ...buildBackup(), version: '1' })
    expect(parseBackup(invalid)).toBeNull()
  })

  it('version が将来の数値でも読める（例外を投げない）', () => {
    const future = { ...buildBackup(), version: 99 }
    expect(parseBackup(JSON.stringify(future))?.version).toBe(99)
  })

  it('data が欠けていれば null', () => {
    const noData = JSON.stringify({ app: BACKUP_APP_NAME, version: 1, exportedAt: '' })
    expect(parseBackup(noData)).toBeNull()
  })

  it('data のキーが1つでも欠けていれば null', () => {
    const backup = buildBackup()
    for (const missingKey of ['records', 'exercises', 'settings', 'bodyRecords', 'bodySettings']) {
      const data = { ...backup.data } as Record<string, unknown>
      delete data[missingKey]
      expect(parseBackup(JSON.stringify({ ...backup, data }))).toBeNull()
    }
  })

  it('配列であるべきキーにオブジェクトが入っていれば null', () => {
    const backup = buildBackup()
    const broken = { ...backup, data: { ...backup.data, records: {} } }
    expect(parseBackup(JSON.stringify(broken))).toBeNull()
  })

  it('オブジェクトであるべきキーに配列が入っていれば null', () => {
    const backup = buildBackup()
    const broken = { ...backup, data: { ...backup.data, settings: [] } }
    expect(parseBackup(JSON.stringify(broken))).toBeNull()
  })
})

describe('restoreBackup', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('5種類のデータが localStorage に書き戻される', () => {
    seedAllData()
    const backup = buildBackup()
    localStorage.clear()

    restoreBackup(backup)

    expect(JSON.parse(localStorage.getItem(RECORDS_KEY)!)).toEqual([RECORD])
    expect(JSON.parse(localStorage.getItem(EXERCISES_KEY)!)).toEqual([CUSTOM_EXERCISE])
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!).weightUnit).toBe('lbs')
    expect(JSON.parse(localStorage.getItem(BODY_RECORDS_KEY)!)).toEqual([BODY_RECORD])
    expect(JSON.parse(localStorage.getItem(BODY_SETTINGS_KEY)!).height).toBe(172)
  })

  it('書き出し → 取り込み → 書き出しで同じ中身になる', () => {
    seedAllData()
    const exported = buildBackup()
    localStorage.clear()

    restoreBackup(parseBackup(JSON.stringify(exported))!)

    expect(buildBackup().data).toEqual(exported.data)
  })
})

describe('buildBackupFileName', () => {
  it('日付入りのファイル名を返す', () => {
    expect(buildBackupFileName(new Date(2026, 8, 23))).toBe('strength-log-backup-2026-09-23.json')
  })
})

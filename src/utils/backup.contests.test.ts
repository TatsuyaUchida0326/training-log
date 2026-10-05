import { beforeEach, describe, expect, it } from 'vitest'
import { buildBackup, parseBackup, restoreBackup } from './backup'
import { CONTESTS_KEY, makeContest, readStoredContests, seedContests } from '../test/contests'
import { RECORDS_KEY, SETTINGS_KEY } from '../test/storageKeys'
import type { TrainingRecord } from '../types'

const BODYBUILDING = makeContest('ボディコンテスト', '2026-10-17', 'c1')
const AUTUMN = makeContest('秋の大会', '2026-11-03', 'c2')

const RECORD: TrainingRecord = {
  id: 'r1',
  date: '2026-09-20',
  exerciseId: 'custom-1',
  sets: [{ id: 's1', weight: 60, reps: 10, memo: '' }],
}

/** バックアップの data から contests を取り除いた、大会機能より前の形式 */
function legacyBackupText(): string {
  const backup = buildBackup()
  const data = { ...backup.data } as Record<string, unknown>
  delete data.contests
  return JSON.stringify({ ...backup, data })
}

/** バックアップの data.contests を任意の値に差し替えたファイルの中身 */
function backupTextWithContests(contests: unknown): string {
  const backup = buildBackup()
  return JSON.stringify({ ...backup, data: { ...backup.data, contests } })
}

function storedContestsOrEmpty(): unknown {
  const raw = localStorage.getItem(CONTESTS_KEY)
  return raw === null ? [] : JSON.parse(raw)
}

beforeEach(() => {
  localStorage.clear()
})

describe('バックアップ — 大会（書き出し）', () => {
  it('保存している大会が data.contests に入る', () => {
    seedContests([BODYBUILDING, AUTUMN])
    expect(buildBackup().data.contests).toEqual([BODYBUILDING, AUTUMN])
  })

  it('大会を1件も保存していなければ data.contests は空配列', () => {
    expect(buildBackup().data.contests).toEqual([])
  })

  it('保存データが壊れていても書き出せる（空配列）', () => {
    localStorage.setItem(CONTESTS_KEY, 'INVALID_JSON{{{')
    expect(() => buildBackup()).not.toThrow()
    expect(buildBackup().data.contests).toEqual([])
  })

  it('配列でない値が保存されていても書き出せる（空配列）', () => {
    localStorage.setItem(CONTESTS_KEY, '{"not":"an array"}')
    expect(buildBackup().data.contests).toEqual([])
  })

  it('書き出しでは壊れた値を退避しない（読むだけ）', () => {
    localStorage.setItem(CONTESTS_KEY, 'INVALID_JSON{{{')
    buildBackup()
    expect(localStorage.getItem(CONTESTS_KEY)).toBe('INVALID_JSON{{{')
  })
})

describe('バックアップ — 大会（往復）', () => {
  it('書き出した内容をそのまま取り込むと元に戻る', () => {
    seedContests([BODYBUILDING, AUTUMN])
    const backup = buildBackup()
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup)
    expect(parseBackup(JSON.stringify(backup))?.data.contests).toEqual([BODYBUILDING, AUTUMN])
  })

  it('書き出し → 取り込み → 復元で、大会が localStorage に戻る', () => {
    seedContests([BODYBUILDING, AUTUMN])
    const exported = buildBackup()
    localStorage.clear()

    restoreBackup(parseBackup(JSON.stringify(exported))!)

    expect(readStoredContests()).toEqual([BODYBUILDING, AUTUMN])
  })

  it('書き出し → 復元 → 書き出しで同じ中身になる', () => {
    seedContests([BODYBUILDING, AUTUMN])
    const exported = buildBackup()
    localStorage.clear()

    restoreBackup(parseBackup(JSON.stringify(exported))!)

    expect(buildBackup().data).toEqual(exported.data)
  })

  it('復元は現在の大会を置き換える（追記しない）', () => {
    seedContests([BODYBUILDING])
    const exported = buildBackup()
    seedContests([AUTUMN])

    restoreBackup(parseBackup(JSON.stringify(exported))!)

    expect(readStoredContests()).toEqual([BODYBUILDING])
  })
})

describe('バックアップ — 大会（contests の無い古いバックアップ）', () => {
  it('contests の無いバックアップも読め、大会は空になる', () => {
    const parsed = parseBackup(legacyBackupText())
    expect(parsed).not.toBeNull()
    expect(parsed?.data.contests).toEqual([])
  })

  it('他のデータは古いバックアップのまま読める', () => {
    localStorage.setItem(RECORDS_KEY, JSON.stringify([RECORD]))
    const parsed = parseBackup(legacyBackupText())
    expect(parsed?.data.records).toEqual([RECORD])
  })

  it('復元すると大会は空になる（今ある大会は消える）', () => {
    seedContests([BODYBUILDING])
    const legacy = legacyBackupText()

    restoreBackup(parseBackup(legacy)!)

    expect(storedContestsOrEmpty()).toEqual([])
  })

  it('復元したあとに書き出し直しても、大会は空配列', () => {
    restoreBackup(parseBackup(legacyBackupText())!)
    expect(buildBackup().data.contests).toEqual([])
  })
})

describe('バックアップ — 大会（contests が壊れているバックアップ）', () => {
  it.each([
    ['オブジェクト', {}],
    ['文字列', 'contests'],
    ['数値', 42],
    ['null', null],
    ['真偽値', true],
  ])('contests が配列でない（%s）なら、null ではなく大会を空として読む', (_label, broken) => {
    const parsed = parseBackup(backupTextWithContests(broken))
    expect(parsed).not.toBeNull()
    expect(parsed?.data.contests).toEqual([])
  })

  it('contests が壊れていても、他のデータを道連れにしない（記録・設定はそのまま）', () => {
    localStorage.setItem(RECORDS_KEY, JSON.stringify([RECORD]))
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ weightUnit: 'lbs' }))
    const exported = buildBackup()
    const brokenText = backupTextWithContests('broken') // 保存データを消す前にバックアップの中身を作る
    localStorage.clear()

    const parsed = parseBackup(brokenText)!
    restoreBackup(parsed)

    expect(parsed.data.records).toEqual(exported.data.records)
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!).weightUnit).toBe('lbs')
    expect(readStoredRecordsRaw()).toEqual([RECORD])
    expect(storedContestsOrEmpty()).toEqual([])
  })

  it('他の項目が壊れているときは今まで通り null（contests だけが特別扱い）', () => {
    const backup = buildBackup()
    const broken = JSON.stringify({ ...backup, data: { ...backup.data, records: {} } })
    expect(parseBackup(broken)).toBeNull()
  })
})

describe('バックアップ — 大会（復元時は sanitize した値を書く）', () => {
  it('壊れた要素は書かれず、正しい大会だけが保存される', () => {
    const text = backupTextWithContests([
      null,
      BODYBUILDING,
      'broken',
      { id: '', name: '空の id', date: '2026-10-17' },
      { id: 'x', name: '   ', date: '2026-10-17' },
      { id: 'y', name: '存在しない日', date: '2026-02-30' },
      AUTUMN,
    ])

    restoreBackup(parseBackup(text)!)

    expect(readStoredContests()).toEqual([BODYBUILDING, AUTUMN])
  })

  it('同じ id が重なっていれば先の1つだけが保存される', () => {
    const duplicate = { ...AUTUMN, id: BODYBUILDING.id }
    restoreBackup(parseBackup(backupTextWithContests([BODYBUILDING, duplicate]))!)
    expect(readStoredContests()).toEqual([BODYBUILDING])
  })

  it('正しい要素が1つも無ければ、保存される大会は空', () => {
    restoreBackup(parseBackup(backupTextWithContests([null, 'x', {}]))!)
    expect(storedContestsOrEmpty()).toEqual([])
  })
})

function readStoredRecordsRaw(): unknown {
  return JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '[]')
}

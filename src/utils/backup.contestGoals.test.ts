import { beforeEach, describe, expect, it } from 'vitest'
import { buildBackup, parseBackup, restoreBackup } from './backup'
import { makeContest, readStoredContests, seedContests, withTargets } from '../test/contests'
import { CONTESTS_KEY } from '../test/storageKeys'

/** 大会の目標（targets・targetOrigins）のバックアップ。目標の無い大会の往復は backup.contests.test.ts が見ている */

const WITH_TARGETS = withTargets(
  makeContest('ボディコンテスト', '2026-10-17', 'c1'),
  { weight: 65, bodyFat: 12, muscleMass: 40 },
  {
    weight: { date: '2026-10-01', value: 68.2 },
    bodyFat: { date: '2026-10-02', value: 20 },
    muscleMass: { date: '2026-10-03' }, // 記録より先に目標を入れた（value 無し）
  },
)
const PARTIAL = withTargets(
  makeContest('秋の大会', '2026-11-03', 'c2'),
  { weight: 60 },
  { weight: { date: '2026-10-05', value: 64 } },
)
const PLAIN = makeContest('目標なしの大会', '2026-12-24', 'c3')

/** バックアップの data.contests を任意の値に差し替えたファイルの中身 */
function backupTextWithContests(contests: unknown): string {
  const backup = buildBackup()
  return JSON.stringify({ ...backup, data: { ...backup.data, contests } })
}

function storedRaw(): unknown {
  return JSON.parse(localStorage.getItem(CONTESTS_KEY) ?? '[]')
}

beforeEach(() => {
  localStorage.clear()
})

describe('バックアップ — 大会の目標（書き出し → 復元の往復）', () => {
  it('書き出しの data.contests に targets・targetOrigins が入る', () => {
    seedContests([WITH_TARGETS, PARTIAL, PLAIN])
    expect(buildBackup().data.contests).toEqual([WITH_TARGETS, PARTIAL, PLAIN])
  })

  it('取り込み（parseBackup）でも targets・targetOrigins が残る', () => {
    seedContests([WITH_TARGETS])
    const backup = buildBackup()
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup)
    expect(parseBackup(JSON.stringify(backup))?.data.contests[0].targets).toEqual({
      weight: 65,
      bodyFat: 12,
      muscleMass: 40,
    })
  })

  it('書き出し → 全消去 → 復元で、目標つきの大会がそのまま戻る', () => {
    seedContests([WITH_TARGETS, PARTIAL, PLAIN])
    const exported = buildBackup()
    localStorage.clear()

    restoreBackup(parseBackup(JSON.stringify(exported))!)

    expect(readStoredContests()).toEqual([WITH_TARGETS, PARTIAL, PLAIN])
  })

  it('書き出し → 復元 → 書き出しで同じ中身になる', () => {
    seedContests([WITH_TARGETS, PARTIAL, PLAIN])
    const exported = buildBackup()
    localStorage.clear()

    restoreBackup(parseBackup(JSON.stringify(exported))!)

    expect(buildBackup().data).toEqual(exported.data)
  })

  it('目標の無い大会に、復元で targets・targetOrigins のキーは付かない', () => {
    seedContests([PLAIN])
    const exported = buildBackup()
    localStorage.clear()

    restoreBackup(parseBackup(JSON.stringify(exported))!)

    expect(readStoredContests()[0]).not.toHaveProperty('targets')
    expect(readStoredContests()[0]).not.toHaveProperty('targetOrigins')
  })

  it('復元は現在の大会（と目標）を置き換える（追記しない）', () => {
    seedContests([PLAIN])
    const exported = buildBackup()
    seedContests([WITH_TARGETS])

    restoreBackup(parseBackup(JSON.stringify(exported))!)

    expect(readStoredContests()).toEqual([PLAIN])
  })
})

describe('バックアップ — 大会の目標（復元時は sanitize した値を書く）', () => {
  it('壊れた targets は落ち、大会（id・名前・日付）は残る', () => {
    const text = backupTextWithContests([{ ...WITH_TARGETS, targets: 'broken' }, PLAIN])
    restoreBackup(parseBackup(text)!)
    const stored = readStoredContests()
    expect(stored).toHaveLength(2)
    expect(stored[0]).toMatchObject({ id: 'c1', name: 'ボディコンテスト', date: '2026-10-17' })
    expect(stored[0]).not.toHaveProperty('targets')
    expect(stored[0]).not.toHaveProperty('targetOrigins')
  })

  it('正の数でない項目・未知のキーは書かれない。正しい項目だけ残る', () => {
    const text = backupTextWithContests([
      {
        ...WITH_TARGETS,
        targets: { weight: 65, bodyFat: 0, muscleMass: -3, waist: 70 },
      },
    ])
    restoreBackup(parseBackup(text)!)
    expect(readStoredContests()[0].targets).toEqual({ weight: 65 })
    expect(readStoredContests()[0].targetOrigins).toEqual({ weight: { date: '2026-10-01', value: 68.2 } })
  })

  it('実在しない日付の origin・対応する targets が無い origin は書かれない', () => {
    const text = backupTextWithContests([
      {
        ...WITH_TARGETS,
        targets: { weight: 65, bodyFat: 12 },
        targetOrigins: {
          weight: { date: '2026-02-30', value: 68.2 },
          bodyFat: { date: '2026-10-02', value: 20 },
          muscleMass: { date: '2026-10-03', value: 36 },
        },
      },
    ])
    restoreBackup(parseBackup(text)!)
    expect(readStoredContests()[0].targets).toEqual({ weight: 65, bodyFat: 12 })
    expect(readStoredContests()[0].targetOrigins).toEqual({ bodyFat: { date: '2026-10-02', value: 20 } })
  })

  it('origin の value が数値でなければ value だけ落ち、{ date } の起点は残る', () => {
    const text = backupTextWithContests([
      { ...WITH_TARGETS, targets: { weight: 65 }, targetOrigins: { weight: { date: '2026-10-01', value: 'x' } } },
    ])
    restoreBackup(parseBackup(text)!)
    expect(readStoredContests()[0].targetOrigins).toEqual({ weight: { date: '2026-10-01' } })
  })

  it('旧形式の targetsSetOn は書かれない（targets は残る）', () => {
    const text = backupTextWithContests([
      { ...PLAIN, targets: { weight: 65 }, targetsSetOn: { weight: '2026-10-01' } },
    ])
    restoreBackup(parseBackup(text)!)
    expect(storedRaw()).toEqual([{ ...PLAIN, targets: { weight: 65 } }])
  })

  it('targets が全部壊れていたら、保存データに targets・targetOrigins のキーが無い', () => {
    const text = backupTextWithContests([{ ...WITH_TARGETS, targets: { weight: 0 } }])
    restoreBackup(parseBackup(text)!)
    expect(storedRaw()).toEqual([{ id: 'c1', name: 'ボディコンテスト', date: '2026-10-17' }])
  })

  it('壊れた targets を含むバックアップでも取り込み自体は失敗しない（null にならない）', () => {
    expect(parseBackup(backupTextWithContests([{ ...WITH_TARGETS, targets: 42 }]))).not.toBeNull()
  })

  it('壊れた大会と目標つきの大会が混ざっていても、目標つきの大会は正しく残る', () => {
    const text = backupTextWithContests([null, WITH_TARGETS, { id: '', name: 'x', date: '2026-10-17' }, PARTIAL])
    restoreBackup(parseBackup(text)!)
    expect(readStoredContests()).toEqual([WITH_TARGETS, PARTIAL])
  })
})

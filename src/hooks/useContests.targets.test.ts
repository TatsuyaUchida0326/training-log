import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useContests } from './useContests'
import { makeContest, readStoredContests, seedContests, withTargets } from '../test/contests'
import { CONTESTS_KEY } from '../test/storageKeys'

/** 大会の目標（targets・targetsSetOn）の保存と更新。名前・日付の更新は useContests.test.ts が見ている */

beforeEach(() => {
  localStorage.clear()
})

const PLAIN = makeContest('ボディコンテスト', '2026-10-17', 'a')
const OTHER = makeContest('秋の大会', '2026-11-03', 'b')

function setup(contests = [PLAIN, OTHER]) {
  seedContests(contests)
  return renderHook(() => useContests())
}

describe('useContests — 目標の読み込み', () => {
  it('保存済みの targets・targetsSetOn をそのまま読む', () => {
    const saved = withTargets(PLAIN, { weight: 65, bodyFat: 12 }, { weight: '2026-10-01' })
    const { result } = setup([saved])
    expect(result.current.contests).toEqual([saved])
  })

  it('壊れた targets は捨てて読み、大会は残る', () => {
    const { result } = setup([{ ...PLAIN, targets: { weight: 0, bodyFat: 'x' } }] as never)
    expect(result.current.contests).toEqual([PLAIN])
  })

  it('読み込むだけでは保存データを書き換えない', () => {
    const saved = withTargets(PLAIN, { weight: 65 }, { weight: '2026-10-01' })
    setup([saved])
    expect(readStoredContests()).toEqual([saved])
  })
})

describe('useContests — updateContest で目標を保存する', () => {
  it('targets と targetsSetOn を渡すと、状態と localStorage の両方に入る', () => {
    const { result } = setup()
    act(() => {
      result.current.updateContest('a', {
        targets: { weight: 65 },
        targetsSetOn: { weight: '2026-10-05' },
      })
    })
    const expected = withTargets(PLAIN, { weight: 65 }, { weight: '2026-10-05' })
    expect(result.current.contests[0]).toEqual(expected)
    expect(readStoredContests()[0]).toEqual(expected)
  })

  it('目標を入れても、大会の id・名前・日付・並びは変わらない', () => {
    const { result } = setup()
    act(() => {
      result.current.updateContest('a', { targets: { weight: 65 }, targetsSetOn: { weight: '2026-10-05' } })
    })
    expect(result.current.contests.map((contest) => contest.id)).toEqual(['a', 'b'])
    expect(result.current.contests[0]).toMatchObject({ name: 'ボディコンテスト', date: '2026-10-17' })
  })

  it('ほかの大会には影響しない', () => {
    const { result } = setup()
    act(() => {
      result.current.updateContest('a', { targets: { weight: 65 }, targetsSetOn: { weight: '2026-10-05' } })
    })
    expect(result.current.contests[1]).toEqual(OTHER)
    expect(readStoredContests()[1]).toEqual(OTHER)
  })

  it('名前だけを更新しても、すでにある targets・targetsSetOn は残る', () => {
    const saved = withTargets(PLAIN, { weight: 65 }, { weight: '2026-10-05' })
    const { result } = setup([saved, OTHER])
    act(() => {
      result.current.updateContest('a', { name: '全日本大会' })
    })
    expect(result.current.contests[0]).toEqual({ ...saved, name: '全日本大会' })
  })

  it('日付だけを更新しても、targets・targetsSetOn は残る', () => {
    const saved = withTargets(PLAIN, { weight: 65 }, { weight: '2026-10-05' })
    const { result } = setup([saved, OTHER])
    act(() => {
      result.current.updateContest('a', { date: '2026-12-24' })
    })
    expect(result.current.contests[0]).toEqual({ ...saved, date: '2026-12-24' })
  })

  it('名前と目標を同時に更新できる', () => {
    const { result } = setup()
    act(() => {
      result.current.updateContest('a', {
        name: '  全日本大会  ',
        targets: { bodyFat: 12 },
        targetsSetOn: { bodyFat: '2026-10-05' },
      })
    })
    expect(result.current.contests[0]).toMatchObject({
      name: '全日本大会',
      targets: { bodyFat: 12 },
      targetsSetOn: { bodyFat: '2026-10-05' },
    })
  })

  it('存在しない id なら何も変わらず、保存もしない', () => {
    const { result } = setup()
    const before = localStorage.getItem(CONTESTS_KEY)
    act(() => {
      result.current.updateContest('missing', { targets: { weight: 65 } })
    })
    expect(result.current.contests).toEqual([PLAIN, OTHER])
    expect(localStorage.getItem(CONTESTS_KEY)).toBe(before)
  })

  it('追加した大会には targets が付いていない（今までと同じ）', () => {
    const { result } = renderHook(() => useContests())
    act(() => {
      result.current.addContest('ボディコンテスト', '2026-10-17')
    })
    expect(result.current.contests[0]).not.toHaveProperty('targets')
    expect(result.current.contests[0]).not.toHaveProperty('targetsSetOn')
    expect(readStoredContests()[0]).not.toHaveProperty('targets')
  })

  it('目標を入れた大会を削除すると、目標も一緒に消える', () => {
    const { result } = setup()
    act(() => {
      result.current.updateContest('a', { targets: { weight: 65 }, targetsSetOn: { weight: '2026-10-05' } })
    })
    act(() => {
      result.current.removeContest('a')
    })
    expect(result.current.contests).toEqual([OTHER])
    expect(JSON.stringify(readStoredContests())).not.toContain('"targets"')
  })
})

describe('useContests — 保存前に sanitizeContests と同じ基準で整える', () => {
  it('0・負数・NaN・数値でない項目は保存しない（正しい項目だけ残る）', () => {
    const { result } = setup()
    act(() => {
      result.current.updateContest('a', {
        targets: { weight: 0, bodyFat: -1, muscleMass: 40 },
        targetsSetOn: { muscleMass: '2026-10-05' },
      })
    })
    expect(result.current.contests[0].targets).toEqual({ muscleMass: 40 })
    expect(readStoredContests()[0].targets).toEqual({ muscleMass: 40 })

    act(() => {
      result.current.updateContest('b', {
        targets: { weight: Number.NaN, bodyFat: '12' as unknown as number },
      })
    })
    expect(result.current.contests[1].targets).toBeUndefined()
    expect(readStoredContests()[1]).not.toHaveProperty('targets')
  })

  it('対応する targets が無い setOn、実在しない日付の setOn は保存しない', () => {
    const { result } = setup()
    act(() => {
      result.current.updateContest('a', {
        targets: { weight: 65, bodyFat: 12 },
        targetsSetOn: { weight: '2026-02-30', bodyFat: '2026-10-05', muscleMass: '2026-10-05' },
      })
    })
    expect(result.current.contests[0].targetsSetOn).toEqual({ bodyFat: '2026-10-05' })
    expect(readStoredContests()[0].targetsSetOn).toEqual({ bodyFat: '2026-10-05' })
  })

  it('未知のキーは保存しない', () => {
    const { result } = setup()
    act(() => {
      result.current.updateContest('a', {
        targets: { weight: 65, waist: 70 } as never,
        targetsSetOn: { weight: '2026-10-05', waist: '2026-10-05' } as never,
      })
    })
    expect(result.current.contests[0].targets).toEqual({ weight: 65 })
    expect(result.current.contests[0].targetsSetOn).toEqual({ weight: '2026-10-05' })
  })

  it('1つも残らなければ targets・targetsSetOn のキー自体が保存データに無い', () => {
    const { result } = setup()
    act(() => {
      result.current.updateContest('a', { targets: { weight: 0 }, targetsSetOn: { weight: '2026-10-05' } })
    })
    expect(readStoredContests()[0]).toEqual(PLAIN)
    expect(readStoredContests()[0]).not.toHaveProperty('targets')
    expect(readStoredContests()[0]).not.toHaveProperty('targetsSetOn')
  })
})

describe('useContests — 目標を消す（withContestTarget が返す undefined を渡す）', () => {
  const WITH_TWO = withTargets(
    PLAIN,
    { weight: 65, bodyFat: 12 },
    { weight: '2026-10-01', bodyFat: '2026-10-02' },
  )

  it('1つの項目を取り除いた targets を渡すと、その項目だけ消える', () => {
    const { result } = setup([WITH_TWO, OTHER])
    act(() => {
      result.current.updateContest('a', { targets: { bodyFat: 12 }, targetsSetOn: { bodyFat: '2026-10-02' } })
    })
    expect(result.current.contests[0].targets).toEqual({ bodyFat: 12 })
    expect(result.current.contests[0].targetsSetOn).toEqual({ bodyFat: '2026-10-02' })
  })

  it('targets・targetsSetOn に undefined を渡すと、保存してあった目標が消える（前の値が残らない）', () => {
    const { result } = setup([WITH_TWO, OTHER])
    act(() => {
      result.current.updateContest('a', { targets: undefined, targetsSetOn: undefined })
    })
    expect(result.current.contests[0]).toEqual(PLAIN)
    expect(readStoredContests()[0]).toEqual(PLAIN)
    expect(readStoredContests()[0]).not.toHaveProperty('targets')
  })

  it('空オブジェクトを渡しても、目標が消える（整えた結果「1つも残らない」ため）', () => {
    const { result } = setup([WITH_TWO, OTHER])
    act(() => {
      result.current.updateContest('a', { targets: {}, targetsSetOn: {} })
    })
    expect(readStoredContests()[0]).toEqual(PLAIN)
  })

  it('消したあとで再び入れられる', () => {
    const { result } = setup([WITH_TWO, OTHER])
    act(() => {
      result.current.updateContest('a', { targets: undefined, targetsSetOn: undefined })
    })
    act(() => {
      result.current.updateContest('a', { targets: { weight: 60 }, targetsSetOn: { weight: '2026-10-06' } })
    })
    expect(readStoredContests()[0]).toEqual(withTargets(PLAIN, { weight: 60 }, { weight: '2026-10-06' }))
  })
})

import { renderHook, act } from '@testing-library/react'
import { afterEach, describe, it, expect, beforeEach, vi } from 'vitest'
import { useContests } from './useContests'
import { makeContest, readStoredContests, seedContests, withTargets } from '../test/contests'
import { localDate } from '../test/dates'
import { makeBodyRecord } from '../test/seed'
import { CONTESTS_KEY } from '../test/storageKeys'
import type { BodySettings } from '../types'

/**
 * 大会の目標（targets・targetOrigins）の保存・更新・補完・削除時の引き継ぎ。
 * 名前・日付の更新は useContests.test.ts が見ている。
 */

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const PLAIN = makeContest('ボディコンテスト', '2026-10-17', 'a')
const OTHER = makeContest('秋の大会', '2026-11-03', 'b')
const TODAY = localDate(2026, 10, 5)

const SETTINGS: BodySettings = {
  height: 0,
  targetWeight: 0,
  muscleMassUnit: 'kg',
  targetBodyFat: 0,
  targetMuscleMassKg: 0,
  goalBaselines: {},
}

function setup(contests = [PLAIN, OTHER]) {
  seedContests(contests)
  return renderHook(() => useContests())
}

describe('useContests — 目標の読み込み', () => {
  it('保存済みの targets・targetOrigins をそのまま読む', () => {
    const saved = withTargets(PLAIN, { weight: 65, bodyFat: 12 }, { weight: { date: '2026-10-01', value: 68.2 } })
    const { result } = setup([saved])
    expect(result.current.contests).toEqual([saved])
  })

  it('壊れた targets は捨てて読み、大会は残る', () => {
    const { result } = setup([{ ...PLAIN, targets: { weight: 0, bodyFat: 'x' } }] as never)
    expect(result.current.contests).toEqual([PLAIN])
  })

  it('旧形式の targetsSetOn は読まない（targets は残る）', () => {
    const { result } = setup([{ ...PLAIN, targets: { weight: 65 }, targetsSetOn: { weight: '2026-10-01' } }] as never)
    expect(result.current.contests).toEqual([{ ...PLAIN, targets: { weight: 65 } }])
  })

  it('読み込むだけでは保存データを書き換えない', () => {
    const saved = withTargets(PLAIN, { weight: 65 }, { weight: { date: '2026-10-01', value: 68.2 } })
    setup([saved])
    expect(readStoredContests()).toEqual([saved])
  })
})

describe('useContests — setContestTarget（目標を入れる・変える・消す）', () => {
  it('目標と起点（今日・いまの値）が、状態と localStorage の両方に入る', () => {
    const { result } = setup()
    act(() => {
      result.current.setContestTarget('a', 'weight', 65, { today: TODAY, current: 68.2 })
    })
    const expected = withTargets(PLAIN, { weight: 65 }, { weight: { date: '2026-10-05', value: 68.2 } })
    expect(result.current.contests[0]).toEqual(expected)
    expect(readStoredContests()[0]).toEqual(expected)
  })

  it('いまの値が無ければ、起点は date だけ', () => {
    const { result } = setup()
    act(() => {
      result.current.setContestTarget('a', 'weight', 65, { today: TODAY, current: undefined })
    })
    expect(readStoredContests()[0].targetOrigins).toEqual({ weight: { date: '2026-10-05' } })
  })

  it('目標を入れても、大会の id・名前・日付・並びは変わらない', () => {
    const { result } = setup()
    act(() => {
      result.current.setContestTarget('a', 'weight', 65, { today: TODAY, current: 68.2 })
    })
    expect(result.current.contests.map((contest) => contest.id)).toEqual(['a', 'b'])
    expect(result.current.contests[0]).toMatchObject({ name: 'ボディコンテスト', date: '2026-10-17' })
  })

  it('ほかの大会には影響しない', () => {
    const { result } = setup()
    act(() => {
      result.current.setContestTarget('a', 'weight', 65, { today: TODAY, current: 68.2 })
    })
    expect(result.current.contests[1]).toEqual(OTHER)
    expect(readStoredContests()[1]).toEqual(OTHER)
  })

  it('別の項目を入れると、すでにある項目の目標・起点は残る', () => {
    const saved = withTargets(PLAIN, { weight: 65 }, { weight: { date: '2026-10-01', value: 68.2 } })
    const { result } = setup([saved, OTHER])
    act(() => {
      result.current.setContestTarget('a', 'bodyFat', 12, { today: TODAY, current: 20 })
    })
    expect(readStoredContests()[0]).toEqual({
      ...saved,
      targets: { weight: 65, bodyFat: 12 },
      targetOrigins: {
        weight: { date: '2026-10-01', value: 68.2 },
        bodyFat: { date: '2026-10-05', value: 20 },
      },
    })
  })

  it('値を変えると、その項目の起点が今日・いまの値に更新される', () => {
    const saved = withTargets(PLAIN, { weight: 65 }, { weight: { date: '2026-10-01', value: 68.2 } })
    const { result } = setup([saved])
    act(() => {
      result.current.setContestTarget('a', 'weight', 60, { today: TODAY, current: 64.5 })
    })
    expect(readStoredContests()[0].targetOrigins).toEqual({ weight: { date: '2026-10-05', value: 64.5 } })
  })

  it('0 を渡すと、その項目が targets と targetOrigins から消える。最後の1項目なら保存データにキーが無い', () => {
    const saved = withTargets(
      PLAIN,
      { weight: 65, bodyFat: 12 },
      { weight: { date: '2026-10-01', value: 68.2 }, bodyFat: { date: '2026-10-02', value: 20 } },
    )
    const { result } = setup([saved, OTHER])
    act(() => {
      result.current.setContestTarget('a', 'weight', 0, { today: TODAY, current: 68 })
    })
    expect(readStoredContests()[0].targets).toEqual({ bodyFat: 12 })
    expect(readStoredContests()[0].targetOrigins).toEqual({ bodyFat: { date: '2026-10-02', value: 20 } })

    act(() => {
      result.current.setContestTarget('a', 'bodyFat', 0, { today: TODAY, current: 20 })
    })
    expect(result.current.contests[0].targets).toBeUndefined()
    expect(result.current.contests[0].targetOrigins).toBeUndefined()
    expect(readStoredContests()[0]).toEqual(PLAIN)
    expect(readStoredContests()[0]).not.toHaveProperty('targets')
    expect(readStoredContests()[0]).not.toHaveProperty('targetOrigins')
  })

  it('消したあとで再び入れられる', () => {
    const saved = withTargets(PLAIN, { weight: 65 }, { weight: { date: '2026-10-01', value: 68.2 } })
    const { result } = setup([saved])
    act(() => {
      result.current.setContestTarget('a', 'weight', 0, { today: TODAY, current: 68 })
    })
    act(() => {
      result.current.setContestTarget('a', 'weight', 60, { today: localDate(2026, 10, 6), current: 67 })
    })
    expect(readStoredContests()[0]).toEqual(withTargets(PLAIN, { weight: 60 }, { weight: { date: '2026-10-06', value: 67 } }))
  })

  it('存在しない id なら何も変わらず、保存もしない', () => {
    const { result } = setup()
    const before = localStorage.getItem(CONTESTS_KEY)
    act(() => {
      result.current.setContestTarget('missing', 'weight', 65, { today: TODAY, current: 68.2 })
    })
    expect(result.current.contests).toEqual([PLAIN, OTHER])
    expect(localStorage.getItem(CONTESTS_KEY)).toBe(before)
  })
})

describe('useContests — 名前・日付の更新は目標に触れない', () => {
  const saved = withTargets(PLAIN, { weight: 65 }, { weight: { date: '2026-10-01', value: 68.2 } })

  it('名前だけを更新しても、targets・targetOrigins は残る', () => {
    const { result } = setup([saved, OTHER])
    act(() => {
      result.current.updateContest('a', { name: '全日本大会' })
    })
    expect(result.current.contests[0]).toEqual({ ...saved, name: '全日本大会' })
    expect(readStoredContests()[0]).toEqual({ ...saved, name: '全日本大会' })
  })

  it('日付だけを更新しても、targets・targetOrigins は残る', () => {
    const { result } = setup([saved, OTHER])
    act(() => {
      result.current.updateContest('a', { date: '2026-12-24' })
    })
    expect(result.current.contests[0]).toEqual({ ...saved, date: '2026-12-24' })
  })

  it('追加した大会には targets・targetOrigins が付いていない（今までと同じ）', () => {
    const { result } = renderHook(() => useContests())
    act(() => {
      result.current.addContest('ボディコンテスト', '2026-10-17')
    })
    expect(result.current.contests[0]).not.toHaveProperty('targets')
    expect(result.current.contests[0]).not.toHaveProperty('targetOrigins')
    expect(readStoredContests()[0]).not.toHaveProperty('targets')
  })
})

describe('useContests — removeContest', () => {
  const records = [
    makeBodyRecord('2026-09-01', { weight: 68 }),
    makeBodyRecord('2026-10-01', { weight: 62 }),
    makeBodyRecord('2026-10-05', { weight: 62.5 }),
  ]
  const autumn = withTargets(makeContest('秋の大会', '2026-10-01', 'autumn'), { weight: 62 })
  const winter = withTargets(
    makeContest('冬の大会', '2026-12-01', 'winter'),
    { weight: 66 },
    { weight: { date: '2026-09-01', value: 68 } },
  )

  it('context を渡さなければ、単純に消す（起点は引き継がない）', () => {
    const { result } = setup([autumn, winter])
    act(() => {
      result.current.removeContest('autumn')
    })
    expect(result.current.contests).toEqual([winter])
    expect(readStoredContests()).toEqual([winter])
  })

  it('context を渡して過ぎた大会を消すと、あとの大会へ起点が引き継がれる（再現2）', () => {
    const { result } = setup([autumn, winter])
    act(() => {
      result.current.removeContest('autumn', { records, settings: SETTINGS, today: TODAY })
    })
    const expected = { ...winter, targetOrigins: { weight: { date: '2026-10-01', value: 62 } } }
    expect(result.current.contests).toEqual([expected])
    expect(readStoredContests()).toEqual([expected])
  })

  it('context を渡してもこれからの大会を消すときは、あとの大会を変えない', () => {
    const upcoming = withTargets(makeContest('これからの大会', '2026-10-20', 'upcoming'), { weight: 62 })
    const { result } = setup([upcoming, winter])
    act(() => {
      result.current.removeContest('upcoming', { records, settings: SETTINGS, today: TODAY })
    })
    expect(readStoredContests()).toEqual([winter])
  })

  it('目標を持つ大会を消すと、その大会の目標も一緒に消える', () => {
    const { result } = setup([autumn, OTHER])
    act(() => {
      result.current.removeContest('autumn', { records, settings: SETTINGS, today: TODAY })
    })
    expect(result.current.contests).toEqual([OTHER])
    expect(JSON.stringify(readStoredContests())).not.toContain('"targets"')
  })

  it('存在しない id なら何も変わらず、保存もしない', () => {
    const { result } = setup([autumn, winter])
    const before = localStorage.getItem(CONTESTS_KEY)
    act(() => {
      result.current.removeContest('missing', { records, settings: SETTINGS, today: TODAY })
    })
    expect(result.current.contests).toEqual([autumn, winter])
    expect(localStorage.getItem(CONTESTS_KEY)).toBe(before)
  })
})

describe('useContests — fillMissingOrigins（起点の値を、あとから入った記録で埋める）', () => {
  it('目標はあるのに起点の値が無い項目を埋めて、状態と localStorage に保存する（date は変えない）', () => {
    const saved = withTargets(PLAIN, { weight: 65 }, { weight: { date: '2026-10-01' } })
    const { result } = setup([saved, OTHER])
    act(() => {
      result.current.fillMissingOrigins({ weight: 68.2 }, TODAY)
    })
    const expected = { ...saved, targetOrigins: { weight: { date: '2026-10-01', value: 68.2 } } }
    expect(result.current.contests[0]).toEqual(expected)
    expect(readStoredContests()[0]).toEqual(expected)
  })

  it('起点そのものが無い項目は {date: 今日, value} を作る', () => {
    const saved = withTargets(PLAIN, { weight: 65 })
    const { result } = setup([saved])
    act(() => {
      result.current.fillMissingOrigins({ weight: 68.2 }, TODAY)
    })
    expect(readStoredContests()[0].targetOrigins).toEqual({ weight: { date: '2026-10-05', value: 68.2 } })
  })

  it('埋めるものが無ければ保存しない（localStorage への書き込みが起きない）', () => {
    const saved = withTargets(PLAIN, { weight: 65 }, { weight: { date: '2026-10-01', value: 70 } })
    const { result } = setup([saved, OTHER])
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    act(() => {
      result.current.fillMissingOrigins({ weight: 68.2 }, TODAY)
      result.current.fillMissingOrigins({}, TODAY)
    })
    expect(setItem).not.toHaveBeenCalled()
    expect(readStoredContests()).toEqual([saved, OTHER])
  })

  it('一度埋めたあとに同じ値でもう一度呼んでも、2回目は保存しない', () => {
    const saved = withTargets(PLAIN, { weight: 65 })
    const { result } = setup([saved])
    act(() => {
      result.current.fillMissingOrigins({ weight: 68.2 }, TODAY)
    })
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    act(() => {
      result.current.fillMissingOrigins({ weight: 68.2 }, TODAY)
    })
    expect(setItem).not.toHaveBeenCalled()
  })
})

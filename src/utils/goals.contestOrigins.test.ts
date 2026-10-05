import { describe, it, expect } from 'vitest'
import {
  calcGoalProgress,
  contestTargetChanges,
  fillMissingContestOrigins,
  removeContestCarryingOrigins,
} from './goals'
import { makeContest, withTargets } from '../test/contests'
import { localDate } from '../test/dates'
import { deepFreeze } from '../test/deepFreeze'
import { makeBodyRecord } from '../test/seed'
import type { BodySettings, Contest, GoalMetric } from '../types'

/**
 * 大会の目標の「起点」（targetOrigins）を作る・補う・引き継ぐ関数。規則の番号は goals.contests.test.ts の冒頭と同じ。
 *
 *  8. contestTargetChanges: 大会に目標を入れた・変えた・消したときの変更分。
 *     target > 0 なら targets と origin（{ date: 今日, value: 現在値 }。現在値が無ければ value 無し）を入れ、0 ならその項目を両方から取り除く
 *  9. fillMissingContestOrigins: 目標はあるのに起点の値が無い項目を、いまの値で埋める。埋めるものが無ければ null
 * 10. removeContestCarryingOrigins: 過ぎた大会を消すとき、あとの大会へ起点を引き継ぐ
 */

function makeSettings(overrides: Partial<BodySettings> = {}): BodySettings {
  return {
    height: 0,
    targetWeight: 0,
    muscleMassUnit: 'kg',
    targetBodyFat: 0,
    targetMuscleMassKg: 0,
    goalBaselines: {},
    ...overrides,
  }
}

const TODAY = localDate(2026, 10, 5)

describe('規則8 — contestTargetChanges', () => {
  const noon = localDate(2026, 10, 5)

  it('目標を入れる: targets[項目] = 目標、targetOrigins[項目] = { date: 今日, value: 現在値 }', () => {
    const contest = makeContest('大会', '2026-10-20')
    expect(contestTargetChanges(contest, 'weight', 65, noon, 68.2)).toEqual({
      targets: { weight: 65 },
      targetOrigins: { weight: { date: '2026-10-05', value: 68.2 } },
    })
  })

  it('現在値が無ければ、origin は date だけ（value を持たない）', () => {
    const contest = makeContest('大会', '2026-10-20')
    const result = contestTargetChanges(contest, 'weight', 65, noon, undefined)
    expect(result.targets).toEqual({ weight: 65 })
    expect(result.targetOrigins).toEqual({ weight: { date: '2026-10-05' } })
    expect(result.targetOrigins?.weight?.value).toBeUndefined()
  })

  it.each<GoalMetric>(['weight', 'bodyFat', 'muscleMass'])('%s でも同じ', (metric) => {
    const result = contestTargetChanges(makeContest('大会', '2026-10-20'), metric, 12.5, noon, 20)
    expect(result).toEqual({
      targets: { [metric]: 12.5 },
      targetOrigins: { [metric]: { date: '2026-10-05', value: 20 } },
    })
  })

  it('戻り値は targets と targetOrigins だけ（id・名前・日付・旧形式の targetsSetOn は含まない）', () => {
    const result = contestTargetChanges(makeContest('大会', '2026-10-20', 'c1'), 'weight', 65, noon, 68.2)
    expect(Object.keys(result).sort()).toEqual(['targetOrigins', 'targets'])
  })

  it('他の項目は変えない（targets も targetOrigins も）', () => {
    const contest = withTargets(
      makeContest('大会', '2026-10-20'),
      { weight: 65, bodyFat: 12 },
      { weight: { date: '2026-09-01', value: 70 }, bodyFat: { date: '2026-09-02', value: 18 } },
    )
    expect(contestTargetChanges(contest, 'muscleMass', 40, noon, 36)).toEqual({
      targets: { weight: 65, bodyFat: 12, muscleMass: 40 },
      targetOrigins: {
        weight: { date: '2026-09-01', value: 70 },
        bodyFat: { date: '2026-09-02', value: 18 },
        muscleMass: { date: '2026-10-05', value: 36 },
      },
    })
  })

  it('値を変えると、その項目の目標と origin（今日・今の値）を更新し、ほかの項目の origin は残す', () => {
    const contest = withTargets(
      makeContest('大会', '2026-10-20'),
      { weight: 65, bodyFat: 12 },
      { weight: { date: '2026-09-01', value: 70 }, bodyFat: { date: '2026-09-02', value: 18 } },
    )
    expect(contestTargetChanges(contest, 'weight', 63, noon, 64.5)).toEqual({
      targets: { weight: 63, bodyFat: 12 },
      targetOrigins: {
        weight: { date: '2026-10-05', value: 64.5 },
        bodyFat: { date: '2026-09-02', value: 18 },
      },
    })
  })

  it('以前の origin に value があっても、現在値が無ければ value は引き継がない（古い向きを引きずらない）', () => {
    const contest = withTargets(makeContest('大会', '2026-10-20'), { weight: 65 }, { weight: { date: '2026-09-01', value: 70 } })
    const result = contestTargetChanges(contest, 'weight', 63, noon, undefined)
    expect(result.targetOrigins?.weight).toEqual({ date: '2026-10-05' })
    expect(result.targetOrigins?.weight?.value).toBeUndefined()
  })

  it('target が 0（空にした）なら、その項目を targets と targetOrigins の両方から取り除く', () => {
    const contest = withTargets(
      makeContest('大会', '2026-10-20'),
      { weight: 65, bodyFat: 12 },
      { weight: { date: '2026-09-01', value: 70 }, bodyFat: { date: '2026-09-02', value: 18 } },
    )
    const result = contestTargetChanges(contest, 'weight', 0, noon, 68)
    expect(result).toEqual({
      targets: { bodyFat: 12 },
      targetOrigins: { bodyFat: { date: '2026-09-02', value: 18 } },
    })
    expect(result.targets).not.toHaveProperty('weight')
    expect(result.targetOrigins).not.toHaveProperty('weight')
  })

  it('最後の1項目を 0 にすると、targets も targetOrigins も undefined（空オブジェクトを残さない）', () => {
    const contest = withTargets(makeContest('大会', '2026-10-20'), { weight: 65 }, { weight: { date: '2026-09-01', value: 70 } })
    const result = contestTargetChanges(contest, 'weight', 0, noon, 68)
    expect(result.targets).toBeUndefined()
    expect(result.targetOrigins).toBeUndefined()
  })

  it('目標の無い大会に 0 を渡しても落ちず、両方 undefined', () => {
    const result = contestTargetChanges(makeContest('大会', '2026-10-20'), 'weight', 0, noon, 68)
    expect(result.targets).toBeUndefined()
    expect(result.targetOrigins).toBeUndefined()
  })

  it('targets はあるが targetOrigins が無い大会（旧データ）に値を入れると、その項目の origin だけ付く', () => {
    const contest = withTargets(makeContest('大会', '2026-10-20'), { weight: 65 })
    expect(contestTargetChanges(contest, 'bodyFat', 12, noon, 20)).toEqual({
      targets: { weight: 65, bodyFat: 12 },
      targetOrigins: { bodyFat: { date: '2026-10-05', value: 20 } },
    })
  })

  it('今日の日付は現地の暦日: 23:59 でも 00:00:10 でも同じ日（UTC にずらさない）', () => {
    const contest = makeContest('大会', '2026-12-31')
    expect(contestTargetChanges(contest, 'weight', 65, localDate(2026, 10, 5, 23, 59, 59), 68).targetOrigins?.weight?.date).toBe('2026-10-05')
    expect(contestTargetChanges(contest, 'weight', 65, localDate(2026, 10, 5, 0, 0, 10), 68).targetOrigins?.weight?.date).toBe('2026-10-05')
  })

  it('月・日が1桁でもゼロ埋め（2026-01-05）、年末（2026-12-31）、うるう日（2028-02-29）', () => {
    const contest = makeContest('大会', '2029-01-01')
    const originDate = (today: Date) => contestTargetChanges(contest, 'weight', 65, today, 68).targetOrigins?.weight?.date
    expect(originDate(localDate(2026, 1, 5))).toBe('2026-01-05')
    expect(originDate(localDate(2026, 12, 31))).toBe('2026-12-31')
    expect(originDate(localDate(2028, 2, 29))).toBe('2028-02-29')
  })

  it('元の大会を書き換えない（凍結した大会でも例外にならず、元の targets・origins は変わらない）', () => {
    const contest = deepFreeze(
      withTargets(makeContest('大会', '2026-10-20'), { weight: 65 }, { weight: { date: '2026-09-01', value: 70 } }),
    )
    expect(() => contestTargetChanges(contest, 'weight', 63, noon, 64)).not.toThrow()
    expect(() => contestTargetChanges(contest, 'weight', 0, noon, 64)).not.toThrow()
    expect(contest.targets).toEqual({ weight: 65 })
    expect(contest.targetOrigins).toEqual({ weight: { date: '2026-09-01', value: 70 } })
  })

  it('戻り値の targets・targetOrigins は元と別のオブジェクト（あとから書き換えても元に影響しない）', () => {
    const contest = withTargets(makeContest('大会', '2026-10-20'), { weight: 65 }, { weight: { date: '2026-09-01', value: 70 } })
    const result = contestTargetChanges(contest, 'bodyFat', 12, noon, 20)
    expect(result.targets).not.toBe(contest.targets)
    expect(result.targetOrigins).not.toBe(contest.targetOrigins)
  })

  it('入れた直後の大会で計算すると、入れたときの値が向きの基準になる（再現1: 68.3 で目標 68 → 同じ日に 67.9 に直しても達成）', () => {
    const base = makeContest('大会', '2026-10-20')
    const contest = { ...base, ...contestTargetChanges(base, 'weight', 68, noon, 68.3) }
    const sameDay = [makeBodyRecord('2026-10-05', { weight: 67.9 })]
    expect(calcGoalProgress(sameDay, makeSettings(), { contests: [contest], today: TODAY })[0]).toMatchObject({
      status: 'achieved',
      source: 'contest',
    })
  })

  it('目標を消した大会で計算すると、ふだんの目標に戻る', () => {
    const base = withTargets(makeContest('大会', '2026-10-20'), { weight: 60 }, { weight: { date: '2026-10-01', value: 68 } })
    const contest = { ...base, ...contestTargetChanges(base, 'weight', 0, TODAY, 68) }
    const records = [makeBodyRecord('2026-10-04', { weight: 68.2 })]
    expect(
      calcGoalProgress(records, makeSettings({ targetWeight: 65 }), { contests: [contest], today: TODAY })[0],
    ).toMatchObject({ target: 65, source: 'base' })
  })
})

describe('規則9 — fillMissingContestOrigins', () => {
  const today = localDate(2026, 10, 5)

  it('目標はあるのに origin に value が無い項目を、いまの値で埋める（date は変えない）', () => {
    const contest = withTargets(makeContest('大会', '2026-10-20', 'c1'), { weight: 65 }, { weight: { date: '2026-10-01' } })
    expect(fillMissingContestOrigins([contest], { weight: 68.2 }, today)).toEqual([
      { ...contest, targetOrigins: { weight: { date: '2026-10-01', value: 68.2 } } },
    ])
  })

  it('目標はあるのに origin 自体が無い項目は、{ date: 今日, value: いまの値 } を作る', () => {
    const contest = withTargets(makeContest('大会', '2026-10-20'), { weight: 65 })
    const filled = fillMissingContestOrigins([contest], { weight: 68.2 }, today)
    expect(filled?.[0].targetOrigins).toEqual({ weight: { date: '2026-10-05', value: 68.2 } })
  })

  it('今日の日付は現地の暦日（23:59 でも同じ日）', () => {
    const contest = withTargets(makeContest('大会', '2026-10-20'), { weight: 65 })
    const filled = fillMissingContestOrigins([contest], { weight: 68.2 }, localDate(2026, 10, 5, 23, 59, 59))
    expect(filled?.[0].targetOrigins?.weight?.date).toBe('2026-10-05')
  })

  it('すでに value がある origin は変えない（埋めるものが無ければ null）', () => {
    const contest = withTargets(makeContest('大会', '2026-10-20'), { weight: 65 }, { weight: { date: '2026-10-01', value: 70 } })
    expect(fillMissingContestOrigins([contest], { weight: 68.2 }, today)).toBeNull()
  })

  it('いまの値が無い項目は埋めない（埋めるものが無ければ null）', () => {
    const contest = withTargets(makeContest('大会', '2026-10-20'), { weight: 65 }, { weight: { date: '2026-10-01' } })
    expect(fillMissingContestOrigins([contest], {}, today)).toBeNull()
    expect(fillMissingContestOrigins([contest], { bodyFat: 20 }, today)).toBeNull()
  })

  it('いまの値が数値として使えなければ（NaN・Infinity）埋めない', () => {
    const contest = withTargets(makeContest('大会', '2026-10-20'), { weight: 65 }, { weight: { date: '2026-10-01' } })
    expect(fillMissingContestOrigins([contest], { weight: Number.NaN }, today)).toBeNull()
    expect(fillMissingContestOrigins([contest], { weight: Number.POSITIVE_INFINITY }, today)).toBeNull()
  })

  it('目標の無い項目には origin を作らない（目標の無い大会・別の項目だけの大会）', () => {
    const noTargets = makeContest('目標なし', '2026-10-20')
    const weightOnly = withTargets(makeContest('体重だけ', '2026-11-20'), { weight: 65 }, { weight: { date: '2026-10-01', value: 70 } })
    expect(fillMissingContestOrigins([noTargets, weightOnly], { weight: 68.2, bodyFat: 20 }, today)).toBeNull()
  })

  it('埋めた大会だけが変わり、ほかの大会・並び順はそのまま（大会の一覧全体を返す）', () => {
    const first = makeContest('目標なし', '2026-10-10', 'a')
    const second = withTargets(makeContest('埋める', '2026-10-20', 'b'), { weight: 65, bodyFat: 12 }, { weight: { date: '2026-10-01' } })
    const third = withTargets(makeContest('埋めない', '2026-11-20', 'c'), { weight: 66 }, { weight: { date: '2026-10-01', value: 70 } })
    const filled = fillMissingContestOrigins([first, second, third], { weight: 68.2, bodyFat: 20 }, today)
    expect(filled).toEqual([
      first,
      {
        ...second,
        targetOrigins: {
          weight: { date: '2026-10-01', value: 68.2 },
          bodyFat: { date: '2026-10-05', value: 20 },
        },
      },
      third,
    ])
  })

  it('複数の大会・複数の項目を一度に埋める', () => {
    const a = withTargets(makeContest('大会A', '2026-10-20'), { weight: 65 })
    const b = withTargets(makeContest('大会B', '2026-11-20'), { muscleMass: 40 }, { muscleMass: { date: '2026-10-02' } })
    const filled = fillMissingContestOrigins([a, b], { weight: 68.2, muscleMass: 36 }, today)
    expect(filled?.[0].targetOrigins).toEqual({ weight: { date: '2026-10-05', value: 68.2 } })
    expect(filled?.[1].targetOrigins).toEqual({ muscleMass: { date: '2026-10-02', value: 36 } })
  })

  it('一度埋めた結果にもう一度かけると null（繰り返し保存しない）', () => {
    const contest = withTargets(makeContest('大会', '2026-10-20'), { weight: 65 })
    const filled = fillMissingContestOrigins([contest], { weight: 68.2 }, today)
    expect(filled).not.toBeNull()
    expect(fillMissingContestOrigins(filled as Contest[], { weight: 68.2 }, today)).toBeNull()
  })

  it('大会が1件も無ければ null', () => {
    expect(fillMissingContestOrigins([], { weight: 68.2 }, today)).toBeNull()
  })

  it('元の大会の一覧を書き換えない（凍結しても例外にならない）', () => {
    const contests = deepFreeze([
      withTargets(makeContest('大会', '2026-10-20'), { weight: 65 }, { weight: { date: '2026-10-01' } }),
    ])
    expect(() => fillMissingContestOrigins(contests, { weight: 68.2 }, today)).not.toThrow()
    expect(contests[0].targetOrigins).toEqual({ weight: { date: '2026-10-01' } })
  })
})

describe('規則10 — removeContestCarryingOrigins', () => {
  const settings = makeSettings()
  const records = [
    makeBodyRecord('2026-09-01', { weight: 68 }),
    makeBodyRecord('2026-10-01', { weight: 62 }),
    makeBodyRecord('2026-10-05', { weight: 62.5 }),
  ]

  /** 終わった秋の大会（10/01・目標 62）と、冬の大会（12/01・目標 66・起点 9/01 に 68） */
  function autumnAndWinter() {
    const autumn = weightTarget(makeContest('秋の大会', '2026-10-01', 'autumn'), 62)
    const winter = withTargets(
      makeContest('冬の大会', '2026-12-01', 'winter'),
      { weight: 66 },
      { weight: { date: '2026-09-01', value: 68 } },
    )
    return { autumn, winter }
  }

  function weightTarget(contest: Contest, target: number): Contest {
    return withTargets(contest, { weight: target })
  }

  it('再現2: 秋の大会を消しても、冬の大会の向きは変わらない（あと 3.5 kg 増のまま）', () => {
    const { autumn, winter } = autumnAndWinter()
    const before = calcGoalProgress(records, settings, { contests: [autumn, winter], today: TODAY })
    expect(before[0]).toMatchObject({ source: 'contest', contestId: 'winter', status: 'increase', remaining: 3.5 })

    const after = removeContestCarryingOrigins([autumn, winter], 'autumn', records, settings, TODAY)
    expect(calcGoalProgress(records, settings, { contests: after, today: TODAY })).toEqual(before)
  })

  it('単純に消すだけだと、冬の大会は origin（9/01 に 68）で減らす目標になり「達成」と変わってしまう（引き継ぎが要る理由）', () => {
    const { winter } = autumnAndWinter()
    const simplyRemoved = [winter]
    expect(calcGoalProgress(records, settings, { contests: simplyRemoved, today: TODAY })[0].status).toBe('achieved')
  })

  it('消した大会を除いた一覧を返し、冬の大会の origin は { date: 消した大会の日, value: その日以前の最新値 } になる', () => {
    const { autumn, winter } = autumnAndWinter()
    const result = removeContestCarryingOrigins([autumn, winter], 'autumn', records, settings, TODAY)
    expect(result).toEqual([
      { ...winter, targetOrigins: { weight: { date: '2026-10-01', value: 62 } } },
    ])
  })

  it('値は消した大会の日以前で一番新しい記録（配列の並びに依存しない）', () => {
    const { autumn, winter } = autumnAndWinter()
    const shuffled = [records[2], records[0], records[1]]
    const result = removeContestCarryingOrigins([autumn, winter], 'autumn', shuffled, settings, TODAY)
    expect(result[0].targetOrigins?.weight).toEqual({ date: '2026-10-01', value: 62 })
  })

  it('消した大会の日以前に記録が無ければ、後で一番古い値になる', () => {
    const { autumn, winter } = autumnAndWinter()
    const laterOnly = [
      makeBodyRecord('2026-10-05', { weight: 62.5 }),
      makeBodyRecord('2026-10-03', { weight: 63 }),
    ]
    const result = removeContestCarryingOrigins([autumn, winter], 'autumn', laterOnly, settings, TODAY)
    expect(result[0].targetOrigins?.weight).toEqual({ date: '2026-10-01', value: 63 })
  })

  it('記録が1件も無ければ、{ date } だけ（value 無し）', () => {
    const { autumn, winter } = autumnAndWinter()
    const result = removeContestCarryingOrigins([autumn, winter], 'autumn', [], settings, TODAY)
    expect(result[0].targetOrigins?.weight).toEqual({ date: '2026-10-01' })
    expect(result[0].targetOrigins?.weight?.value).toBeUndefined()
  })

  it('消した大会の日にその項目が入っていなければ、さらに前の入っている日の値', () => {
    const { autumn, winter } = autumnAndWinter()
    const gap = [
      makeBodyRecord('2026-09-28', { weight: 64 }),
      makeBodyRecord('2026-10-01', { weight: null, bodyFat: 20 }),
    ]
    const result = removeContestCarryingOrigins([autumn, winter], 'autumn', gap, settings, TODAY)
    expect(result[0].targetOrigins?.weight).toEqual({ date: '2026-10-01', value: 64 })
  })

  it('筋肉量（単位 %）は kg に換算した値を引き継ぐ（体重 × 筋肉量% / 100）', () => {
    const percentSettings = makeSettings({ muscleMassUnit: '%' })
    const ended = withTargets(makeContest('終わった大会', '2026-10-01', 'ended'), { muscleMass: 29 })
    const next = withTargets(makeContest('次の大会', '2026-12-01', 'next'), { muscleMass: 30 })
    const muscleRecords = [makeBodyRecord('2026-10-01', { weight: 70, muscleMass: 40 })]
    const result = removeContestCarryingOrigins([ended, next], 'ended', muscleRecords, percentSettings, TODAY)
    expect(result[0].targetOrigins?.muscleMass).toEqual({ date: '2026-10-01', value: 28 })
  })

  describe('引き継ぐ項目・大会の条件', () => {
    it('消した大会が目標を持つ項目だけ引き継ぐ（ほかの項目の origin は変えない）', () => {
      const ended = withTargets(makeContest('終わった大会', '2026-10-01', 'ended'), { weight: 62 })
      const next = withTargets(
        makeContest('次の大会', '2026-12-01', 'next'),
        { weight: 66, bodyFat: 18 },
        { weight: { date: '2026-09-01', value: 68 }, bodyFat: { date: '2026-09-01', value: 17 } },
      )
      const bodyRecords = [makeBodyRecord('2026-10-01', { weight: 62, bodyFat: 21 })]
      const [result] = removeContestCarryingOrigins([ended, next], 'ended', bodyRecords, settings, TODAY)
      expect(result.targetOrigins).toEqual({
        weight: { date: '2026-10-01', value: 62 },
        bodyFat: { date: '2026-09-01', value: 17 },
      })
    })

    it('消した大会が複数の項目の目標を持てば、それぞれ引き継ぐ', () => {
      const ended = withTargets(makeContest('終わった大会', '2026-10-01', 'ended'), { weight: 62, bodyFat: 15 })
      const next = withTargets(makeContest('次の大会', '2026-12-01', 'next'), { weight: 66, bodyFat: 18 })
      const bodyRecords = [makeBodyRecord('2026-10-01', { weight: 62, bodyFat: 21 })]
      const [result] = removeContestCarryingOrigins([ended, next], 'ended', bodyRecords, settings, TODAY)
      expect(result.targetOrigins).toEqual({
        weight: { date: '2026-10-01', value: 62 },
        bodyFat: { date: '2026-10-01', value: 21 },
      })
    })

    it('あとの大会が、その項目の目標を持たなければ、origin を作らない', () => {
      const ended = withTargets(makeContest('終わった大会', '2026-10-01', 'ended'), { weight: 62 })
      const bodyFatOnly = withTargets(makeContest('体脂肪率だけ', '2026-12-01', 'next'), { bodyFat: 18 })
      const noTargets = makeContest('目標なし', '2026-12-10', 'plain')
      const result = removeContestCarryingOrigins([ended, bodyFatOnly, noTargets], 'ended', records, settings, TODAY)
      expect(result).toEqual([bodyFatOnly, noTargets])
    })

    it('origin が無い大会にも引き継ぐ（{ date: 消した大会の日, value }）', () => {
      const ended = withTargets(makeContest('終わった大会', '2026-10-01', 'ended'), { weight: 62 })
      const next = withTargets(makeContest('次の大会', '2026-12-01', 'next'), { weight: 66 })
      const [result] = removeContestCarryingOrigins([ended, next], 'ended', records, settings, TODAY)
      expect(result.targetOrigins?.weight).toEqual({ date: '2026-10-01', value: 62 })
    })

    it.each([
      ['消した大会の日より前（9/30）', '2026-09-30', true],
      ['消した大会の日と同じ（10/01）', '2026-10-01', false],
      ['消した大会の日より後（10/02）', '2026-10-02', false],
    ])('origin.date が %s のとき、引き継ぎ（上書き）は %s', (_label, originDate, carried) => {
      const ended = withTargets(makeContest('終わった大会', '2026-10-01', 'ended'), { weight: 62 })
      const next = withTargets(
        makeContest('次の大会', '2026-12-01', 'next'),
        { weight: 66 },
        { weight: { date: originDate, value: 70 } },
      )
      const [result] = removeContestCarryingOrigins([ended, next], 'ended', records, settings, TODAY)
      expect(result.targetOrigins?.weight).toEqual(
        carried ? { date: '2026-10-01', value: 62 } : { date: originDate, value: 70 },
      )
    })

    it('消した大会より日付が後の大会すべてに引き継ぐ（2件目の大会にも）', () => {
      const ended = withTargets(makeContest('終わった大会', '2026-10-01', 'ended'), { weight: 62 })
      const second = withTargets(makeContest('二つ目', '2026-12-01', 'second'), { weight: 66 })
      const third = withTargets(makeContest('三つ目', '2027-02-01', 'third'), { weight: 64 })
      const result = removeContestCarryingOrigins([ended, second, third], 'ended', records, settings, TODAY)
      expect(result.map((contest) => contest.targetOrigins?.weight)).toEqual([
        { date: '2026-10-01', value: 62 },
        { date: '2026-10-01', value: 62 },
      ])
    })

    it('消した大会より日付が前の大会・同じ日の大会には引き継がない', () => {
      const earlier = withTargets(makeContest('前の大会', '2026-09-10', 'earlier'), { weight: 70 })
      const ended = withTargets(makeContest('終わった大会', '2026-10-01', 'ended'), { weight: 62 })
      const sameDay = withTargets(makeContest('同じ日', '2026-10-01', 'same'), { weight: 61 })
      const result = removeContestCarryingOrigins([earlier, ended, sameDay], 'ended', records, settings, TODAY)
      expect(result).toEqual([earlier, sameDay])
    })

    it('消した大会が目標を持たなければ、引き継ぐものは無い（消すだけ）', () => {
      const ended = makeContest('終わった予定', '2026-10-01', 'ended')
      const next = withTargets(makeContest('次の大会', '2026-12-01', 'next'), { weight: 66 }, { weight: { date: '2026-09-01', value: 68 } })
      expect(removeContestCarryingOrigins([ended, next], 'ended', records, settings, TODAY)).toEqual([next])
    })
  })

  describe('これからの大会を消すとき・消す大会が無いとき', () => {
    it('これからの大会（今日より後）を消しても、あとの大会の origin は変えない', () => {
      const upcoming = weightTarget(makeContest('これからの大会', '2026-10-20', 'upcoming'), 62)
      const next = withTargets(makeContest('次の大会', '2026-12-01', 'next'), { weight: 66 }, { weight: { date: '2026-09-01', value: 68 } })
      expect(removeContestCarryingOrigins([upcoming, next], 'upcoming', records, settings, TODAY)).toEqual([next])
    })

    it('今日が当日の大会は「過ぎた」ではないので、引き継がない', () => {
      const today = weightTarget(makeContest('今日の大会', '2026-10-05', 'today'), 62)
      const next = withTargets(makeContest('次の大会', '2026-12-01', 'next'), { weight: 66 }, { weight: { date: '2026-09-01', value: 68 } })
      expect(removeContestCarryingOrigins([today, next], 'today', records, settings, TODAY)).toEqual([next])
    })

    it('昨日の大会は過ぎているので引き継ぐ', () => {
      const yesterday = weightTarget(makeContest('昨日の大会', '2026-10-04', 'yesterday'), 62)
      const next = withTargets(makeContest('次の大会', '2026-12-01', 'next'), { weight: 66 })
      const [result] = removeContestCarryingOrigins([yesterday, next], 'yesterday', records, settings, TODAY)
      expect(result.targetOrigins?.weight).toEqual({ date: '2026-10-04', value: 62 })
    })

    it('存在しない id なら何も消えず、一覧はそのまま', () => {
      const { autumn, winter } = autumnAndWinter()
      expect(removeContestCarryingOrigins([autumn, winter], 'missing', records, settings, TODAY)).toEqual([autumn, winter])
    })

    it('大会が1件だけで、それを消すと空', () => {
      const { autumn } = autumnAndWinter()
      expect(removeContestCarryingOrigins([autumn], 'autumn', records, settings, TODAY)).toEqual([])
    })
  })

  describe('入力を書き換えない・並びを保つ', () => {
    it('凍結した入力でも例外にならず、元の大会は変わらない', () => {
      const { autumn, winter } = autumnAndWinter()
      const frozen = deepFreeze([autumn, winter])
      const frozenRecords = deepFreeze([...records])
      expect(() => removeContestCarryingOrigins(frozen, 'autumn', frozenRecords, deepFreeze(makeSettings()), TODAY)).not.toThrow()
      expect(frozen[1].targetOrigins).toEqual({ weight: { date: '2026-09-01', value: 68 } })
    })

    it('残った大会の並び順は元のまま（引き継ぎで大会の順を入れ替えない）', () => {
      const first = makeContest('先頭', '2026-12-10', 'first')
      const ended = weightTarget(makeContest('終わった大会', '2026-10-01', 'ended'), 62)
      const last = weightTarget(makeContest('末尾', '2026-12-01', 'last'), 66)
      const result = removeContestCarryingOrigins([first, ended, last], 'ended', records, settings, TODAY)
      expect(result.map((contest) => contest.id)).toEqual(['first', 'last'])
    })
  })
})

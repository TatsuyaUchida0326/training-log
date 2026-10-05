import { describe, it, expect } from 'vitest'
import { sanitizeContests } from './contests'

/**
 * 保存値の検査（sanitizeContests）のうち、大会の目標（targets・targetsSetOn）に関するもの。
 * 既存の contests.test.ts は targets の無い大会だけを見ている。
 */

/** 保存データは型どおりとは限らない。検査前の値として任意の形を書けるようにする */
function raw(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { id: 'c1', name: 'ボディコンテスト', date: '2026-10-17', ...extra }
}

/** 渡した値を書き換えようとすると例外になる凍結コピー（入力を書き換えないことの確認用） */
function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

function sanitizeOne(extra: Record<string, unknown>) {
  const [contest] = sanitizeContests([raw(extra)])
  return contest
}

describe('sanitizeContests — targets', () => {
  it('3項目とも正の数なら、そのまま残る', () => {
    expect(sanitizeOne({ targets: { weight: 65, bodyFat: 12, muscleMass: 40 } }).targets).toEqual({
      weight: 65,
      bodyFat: 12,
      muscleMass: 40,
    })
  })

  it('一部の項目だけでも残る', () => {
    expect(sanitizeOne({ targets: { bodyFat: 12.5 } }).targets).toEqual({ bodyFat: 12.5 })
  })

  it('小数・小さい正の数・大きい正の数も残る（有限で 0 より大きければよい）', () => {
    expect(sanitizeOne({ targets: { weight: 0.1, bodyFat: 0.0001, muscleMass: 1e6 } }).targets).toEqual({
      weight: 0.1,
      bodyFat: 0.0001,
      muscleMass: 1e6,
    })
  })

  it('targets の無い既存の大会はそのまま通る（targets・targetsSetOn のキーも付かない）', () => {
    const contest = sanitizeOne({})
    expect(contest).toEqual({ id: 'c1', name: 'ボディコンテスト', date: '2026-10-17' })
    expect(contest).not.toHaveProperty('targets')
    expect(contest).not.toHaveProperty('targetsSetOn')
  })

  it.each([
    ['0', 0],
    ['負の数', -65],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['-Infinity', -Infinity],
    ['数値の文字列', '65'],
    ['null', null],
    ['undefined', undefined],
    ['真偽値', true],
    ['配列', [65]],
    ['オブジェクト', { value: 65 }],
  ])('値が %s の項目は捨てる（ほかの正しい項目は残る）', (_label, broken) => {
    const contest = sanitizeOne({ targets: { weight: broken, bodyFat: 12 } })
    expect(contest.targets).toEqual({ bodyFat: 12 })
  })

  it('1つも残らなければ targets 自体を付けない（空オブジェクトにしない）', () => {
    const contest = sanitizeOne({ targets: { weight: 0, bodyFat: -1, muscleMass: 'x' } })
    expect(contest).not.toHaveProperty('targets')
    expect(contest.targets).toBeUndefined()
  })

  it('targets が空オブジェクトなら targets を付けない', () => {
    expect(sanitizeOne({ targets: {} })).not.toHaveProperty('targets')
  })

  it('未知のキーは捨てる（waist・任意の名前・プロトタイプ汚染のキー）', () => {
    const contest = sanitizeOne({
      targets: { weight: 65, waist: 70, memo: 'x', ['__proto__']: { polluted: 1 } },
    })
    expect(contest.targets).toEqual({ weight: 65 })
    expect(Object.keys(contest.targets ?? {})).toEqual(['weight'])
  })

  it('未知のキーしか無ければ targets を付けない', () => {
    expect(sanitizeOne({ targets: { waist: 70 } })).not.toHaveProperty('targets')
  })

  it.each([
    ['null', null],
    ['文字列', 'broken'],
    ['数値', 42],
    ['真偽値', true],
    ['配列', [65]],
  ])('targets がオブジェクトでない（%s）なら、targets は付かず、大会そのものは残る', (_label, broken) => {
    const contests = sanitizeContests([raw({ targets: broken })])
    expect(contests).toEqual([{ id: 'c1', name: 'ボディコンテスト', date: '2026-10-17' }])
    expect(contests[0]).not.toHaveProperty('targets')
  })

  it('大会の id・name・date は、targets の有無・中身に影響されない', () => {
    const [contest] = sanitizeContests([raw({ targets: { weight: 65 }, targetsSetOn: { weight: '2026-10-01' } })])
    expect(contest).toMatchObject({ id: 'c1', name: 'ボディコンテスト', date: '2026-10-17' })
  })
})

describe('sanitizeContests — targetsSetOn', () => {
  it('対応する targets の項目があり、実在する日付なら残る', () => {
    const contest = sanitizeOne({
      targets: { weight: 65, bodyFat: 12 },
      targetsSetOn: { weight: '2026-10-01', bodyFat: '2026-10-03' },
    })
    expect(contest.targetsSetOn).toEqual({ weight: '2026-10-01', bodyFat: '2026-10-03' })
  })

  it('一部の項目だけ setOn があってもよい（targets の項目に setOn が無いのは許す）', () => {
    const contest = sanitizeOne({
      targets: { weight: 65, bodyFat: 12 },
      targetsSetOn: { weight: '2026-10-01' },
    })
    expect(contest.targets).toEqual({ weight: 65, bodyFat: 12 })
    expect(contest.targetsSetOn).toEqual({ weight: '2026-10-01' })
  })

  it('対応する targets の項目が無い setOn は捨てる', () => {
    const contest = sanitizeOne({
      targets: { weight: 65 },
      targetsSetOn: { weight: '2026-10-01', bodyFat: '2026-10-03' },
    })
    expect(contest.targetsSetOn).toEqual({ weight: '2026-10-01' })
  })

  it('targets の項目が壊れて捨てられたら、その項目の setOn も捨てる', () => {
    const contest = sanitizeOne({
      targets: { weight: 0, bodyFat: 12 },
      targetsSetOn: { weight: '2026-10-01', bodyFat: '2026-10-03' },
    })
    expect(contest.targets).toEqual({ bodyFat: 12 })
    expect(contest.targetsSetOn).toEqual({ bodyFat: '2026-10-03' })
  })

  it('targets が1つも残らなければ、setOn だけあっても付けない', () => {
    const contest = sanitizeOne({ targets: {}, targetsSetOn: { weight: '2026-10-01' } })
    expect(contest).not.toHaveProperty('targets')
    expect(contest).not.toHaveProperty('targetsSetOn')
  })

  it('targets が無く setOn だけの大会は、setOn を付けない', () => {
    const contest = sanitizeOne({ targetsSetOn: { weight: '2026-10-01' } })
    expect(contest).toEqual({ id: 'c1', name: 'ボディコンテスト', date: '2026-10-17' })
  })

  it.each([
    ['存在しない日（2月30日）', '2026-02-30'],
    ['平年の2月29日', '2026-02-29'],
    ['月がゼロ埋めなし', '2026-1-05'],
    ['日がゼロ埋めなし', '2026-01-5'],
    ['スラッシュ区切り', '2026/10/01'],
    ['時刻つき', '2026-10-01T00:00:00'],
    ['前に空白', ' 2026-10-01'],
    ['空文字', ''],
    ['日付でない文字', 'あした'],
    ['年が範囲外（1999 年）', '1999-12-31'],
    ['年が範囲外（3000 年）', '3000-01-01'],
    ['年が途中の値', '0002-10-01'],
    ['数値', 20261001],
    ['null', null],
    ['真偽値', true],
    ['オブジェクト', {}],
  ])('値が壊れている（%s）なら、その項目の setOn は捨て、targets は残る', (_label, broken) => {
    const contest = sanitizeOne({
      targets: { weight: 65, bodyFat: 12 },
      targetsSetOn: { weight: broken, bodyFat: '2026-10-03' },
    })
    expect(contest.targets).toEqual({ weight: 65, bodyFat: 12 })
    expect(contest.targetsSetOn).toEqual({ bodyFat: '2026-10-03' })
  })

  it('範囲の端（2000-01-01・2999-12-31・うるう日）は残る', () => {
    const contest = sanitizeOne({
      targets: { weight: 65, bodyFat: 12, muscleMass: 40 },
      targetsSetOn: { weight: '2000-01-01', bodyFat: '2999-12-31', muscleMass: '2028-02-29' },
    })
    expect(contest.targetsSetOn).toEqual({
      weight: '2000-01-01',
      bodyFat: '2999-12-31',
      muscleMass: '2028-02-29',
    })
  })

  it('1つも残らなければ targetsSetOn 自体を付けない（targets は残る）', () => {
    const contest = sanitizeOne({
      targets: { weight: 65 },
      targetsSetOn: { weight: '2026-02-30' },
    })
    expect(contest.targets).toEqual({ weight: 65 })
    expect(contest).not.toHaveProperty('targetsSetOn')
  })

  it('未知のキーの setOn は捨てる', () => {
    const contest = sanitizeOne({
      targets: { weight: 65 },
      targetsSetOn: { weight: '2026-10-01', waist: '2026-10-01' },
    })
    expect(Object.keys(contest.targetsSetOn ?? {})).toEqual(['weight'])
  })

  it.each([
    ['null', null],
    ['文字列', '2026-10-01'],
    ['数値', 42],
    ['真偽値', true],
    ['配列', ['2026-10-01']],
  ])('targetsSetOn がオブジェクトでない（%s）なら付けず、targets と大会は残る', (_label, broken) => {
    const contest = sanitizeOne({ targets: { weight: 65 }, targetsSetOn: broken })
    expect(contest).toEqual({
      id: 'c1',
      name: 'ボディコンテスト',
      date: '2026-10-17',
      targets: { weight: 65 },
    })
    expect(contest).not.toHaveProperty('targetsSetOn')
  })
})

describe('sanitizeContests — 目標があっても、これまでの規則は変わらない', () => {
  it('大会ごとに独立して検査する（壊れた targets の大会の隣の大会に影響しない）', () => {
    const contests = sanitizeContests([
      raw({ id: 'a', targets: 'broken' }),
      raw({ id: 'b', targets: { weight: 65 }, targetsSetOn: { weight: '2026-10-01' } }),
      raw({ id: 'c' }),
    ])
    expect(contests.map((contest) => contest.id)).toEqual(['a', 'b', 'c'])
    expect(contests[0]).not.toHaveProperty('targets')
    expect(contests[1].targets).toEqual({ weight: 65 })
    expect(contests[2]).not.toHaveProperty('targets')
  })

  it('壊れた大会（name 空・日付が不正・id 重複）は、targets があっても今までどおり捨てる', () => {
    const contests = sanitizeContests([
      raw({ id: 'a', name: '   ', targets: { weight: 65 } }),
      raw({ id: 'b', date: '2026-02-30', targets: { weight: 65 } }),
      raw({ id: 'c', targets: { weight: 65 } }),
      raw({ id: 'c', targets: { weight: 50 } }),
    ])
    expect(contests).toHaveLength(1)
    expect(contests[0]).toMatchObject({ id: 'c', targets: { weight: 65 } })
  })

  it('並びは保存された順のまま', () => {
    const contests = sanitizeContests([
      raw({ id: 'z', date: '2026-12-01', targets: { weight: 60 } }),
      raw({ id: 'a', date: '2026-10-01', targets: { weight: 65 } }),
    ])
    expect(contests.map((contest) => contest.id)).toEqual(['z', 'a'])
  })

  it('sanitize 済みの値をもう一度通しても変わらない（冪等）', () => {
    const once = sanitizeContests([
      raw({
        targets: { weight: 65, bodyFat: 0, waist: 70 },
        targetsSetOn: { weight: '2026-10-01', bodyFat: '2026-10-01' },
      }),
    ])
    expect(sanitizeContests(once)).toEqual(once)
    expect(once[0].targets).toEqual({ weight: 65 })
    expect(once[0].targetsSetOn).toEqual({ weight: '2026-10-01' })
  })

  it('渡した配列・大会・targets を書き換えない', () => {
    const input = deepFreeze([
      raw({ targets: { weight: 65, bodyFat: 0 }, targetsSetOn: { weight: '2026-10-01', bodyFat: 'x' } }),
    ])
    expect(() => sanitizeContests(input)).not.toThrow()
    expect(input[0].targets).toEqual({ weight: 65, bodyFat: 0 })
  })

  it('戻り値の targets は入力と別のオブジェクト（あとから書き換えても元に影響しない）', () => {
    const targets = { weight: 65 }
    const [contest] = sanitizeContests([raw({ targets })])
    expect(contest.targets).not.toBe(targets)
  })
})

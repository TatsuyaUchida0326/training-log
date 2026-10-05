import { describe, it, expect } from 'vitest'
import {
  MAX_CONTEST_NAME_LENGTH,
  daysUntil,
  groupContestsByDate,
  isValidContestDate,
  isValidContestName,
  sanitizeContests,
  upcomingContests,
} from './contests'
import { makeContest } from '../test/contests'

/** 渡した値を書き換えようとすると例外になる凍結コピー（入力を書き換えないことの確認用） */
function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

// 現地時刻の Date（month は 1 始まりで書く）
function local(year: number, month: number, day: number, h = 12, m = 0, s = 0, ms = 0): Date {
  return new Date(year, month - 1, day, h, m, s, ms)
}

describe('isValidContestDate', () => {
  it.each(['2026-10-17', '2026-01-01', '2026-12-31', '2028-02-29', '2000-02-29'])(
    '実在する日付 %s は true',
    (date) => {
      expect(isValidContestDate(date)).toBe(true)
    },
  )

  it.each([
    ['存在しない日（2月30日）', '2026-02-30'],
    ['平年の2月29日', '2026-02-29'],
    ['100年に1度の平年の2月29日', '2100-02-29'],
    ['30日までの月の31日', '2026-04-31'],
    ['13月', '2026-13-01'],
    ['0月', '2026-00-10'],
    ['0日', '2026-10-00'],
    ['32日', '2026-10-32'],
    ['月が1桁（ゼロ埋めなし）', '2026-1-05'],
    ['日が1桁（ゼロ埋めなし）', '2026-01-5'],
    ['年が2桁', '26-01-05'],
    ['スラッシュ区切り', '2026/10/17'],
    ['空文字', ''],
    ['前に空白', ' 2026-10-17'],
    ['後ろに空白', '2026-10-17 '],
    ['時刻つき', '2026-10-17T00:00:00'],
    ['日付ではない文字', 'あした'],
  ])('%s（%j）は false', (_label, date) => {
    expect(isValidContestDate(date)).toBe(false)
  })
})

describe('isValidContestDate — 年は 2000〜2999 だけ（入力途中の値を保存させない）', () => {
  it.each(['2000-01-01', '2999-12-31', '2027-10-17'])('範囲内の %s は true', (date) => {
    expect(isValidContestDate(date)).toBe(true)
  })

  it.each([
    ['年が 1 桁相当（キーボードで 1 文字目だけ打った途中の値）', '0002-10-17'],
    ['年が 2 桁相当', '0020-10-17'],
    ['年が 3 桁相当', '0202-10-17'],
    ['2000 年より前', '1999-12-31'],
    ['2999 年より後', '3000-01-01'],
    ['年 0000', '0000-10-17'],
    ['5 桁の年', '20271-10-17'],
  ])('%s（%s）は false', (_label, date) => {
    expect(isValidContestDate(date)).toBe(false)
  })

  it('範囲の端でも暦に実在しなければ false（2000-02-30 / 2999-02-29）', () => {
    expect(isValidContestDate('2000-02-30')).toBe(false)
    expect(isValidContestDate('2999-02-29')).toBe(false)
  })

  it('年が範囲外の大会は sanitizeContests で捨てる', () => {
    const valid = makeContest('正しい大会', '2027-10-17', 'ok')
    const result = sanitizeContests([
      makeContest('途中の値', '0002-10-17', 'a'),
      makeContest('古すぎる', '1999-12-31', 'b'),
      makeContest('先すぎる', '3000-01-01', 'c'),
      valid,
    ])
    expect(result).toEqual([valid])
  })
})

describe('isValidContestName / MAX_CONTEST_NAME_LENGTH', () => {
  it('空白以外を含めば true（前後の空白があってもよい）', () => {
    expect(isValidContestName('ボディコンテスト')).toBe(true)
    expect(isValidContestName('  ボディコンテスト  ')).toBe(true)
    expect(isValidContestName('a')).toBe(true)
    expect(isValidContestName('全日本 ボディ')).toBe(true)
  })

  it.each([
    ['空文字', ''],
    ['半角空白だけ', '   '],
    ['全角空白だけ', '　　'],
    ['タブ・改行だけ', '\t\n'],
    ['半角と全角の空白だけ', ' 　 '],
  ])('%s は false', (_label, name) => {
    expect(isValidContestName(name)).toBe(false)
  })

  it('名前の最大文字数は 30', () => {
    expect(MAX_CONTEST_NAME_LENGTH).toBe(30)
  })
})

describe('daysUntil', () => {
  it('同じ日なら 0（今日）', () => {
    expect(daysUntil('2026-10-05', local(2026, 10, 5))).toBe(0)
  })

  it('明日なら 1', () => {
    expect(daysUntil('2026-10-06', local(2026, 10, 5))).toBe(1)
  })

  it('昨日なら -1（過ぎている）', () => {
    expect(daysUntil('2026-10-04', local(2026, 10, 5))).toBe(-1)
  })

  it('12日後なら 12', () => {
    expect(daysUntil('2026-10-17', local(2026, 10, 5))).toBe(12)
  })

  it('今日の時刻に関係なく、同じ日は 0・翌日は 1（UTC 解釈に引きずられない）', () => {
    const times: [number, number, number, number][] = [
      [0, 0, 0, 0],
      [0, 0, 1, 0],
      [0, 1, 0, 0],
      [9, 0, 0, 0], // JST の 9:00 は UTC の 0:00
      [12, 0, 0, 0],
      [15, 0, 0, 0], // JST の 15:00 は UTC の 6:00
      [23, 59, 59, 999],
    ]
    for (const [h, m, s, ms] of times) {
      const today = local(2026, 10, 16, h, m, s, ms)
      expect(daysUntil('2026-10-16', today), `当日 ${h}:${m}:${s}.${ms}`).toBe(0)
      expect(daysUntil('2026-10-17', today), `翌日 ${h}:${m}:${s}.${ms}`).toBe(1)
      expect(daysUntil('2026-10-15', today), `前日 ${h}:${m}:${s}.${ms}`).toBe(-1)
      expect(daysUntil('2026-10-18', today), `2日後 ${h}:${m}:${s}.${ms}`).toBe(2)
    }
  })

  it('23:59 でも 00:01 でも、翌日の大会は 1', () => {
    expect(daysUntil('2026-10-17', local(2026, 10, 16, 23, 59, 0))).toBe(1)
    expect(daysUntil('2026-10-17', local(2026, 10, 16, 0, 1, 0))).toBe(1)
  })

  it('月またぎ: 1月31日 → 2月1日 は 1、9月30日 → 10月1日 は 1', () => {
    expect(daysUntil('2027-02-01', local(2027, 1, 31))).toBe(1)
    expect(daysUntil('2026-10-01', local(2026, 9, 30))).toBe(1)
  })

  it('月またぎ: 9月25日 → 10月5日 は 10', () => {
    expect(daysUntil('2026-10-05', local(2026, 9, 25))).toBe(10)
  })

  it('年またぎ: 12月31日 → 1月1日 は 1、12月25日 → 1月10日 は 16', () => {
    expect(daysUntil('2027-01-01', local(2026, 12, 31))).toBe(1)
    expect(daysUntil('2027-01-10', local(2026, 12, 25))).toBe(16)
  })

  it('年またぎで過去: 1月1日 → 前年12月31日 は -1', () => {
    expect(daysUntil('2026-12-31', local(2027, 1, 1))).toBe(-1)
  })

  it('うるう日: 2028-02-28 → 02-29 は 1、02-29 → 03-01 は 1、02-28 → 03-01 は 2', () => {
    expect(daysUntil('2028-02-29', local(2028, 2, 28))).toBe(1)
    expect(daysUntil('2028-03-01', local(2028, 2, 29))).toBe(1)
    expect(daysUntil('2028-03-01', local(2028, 2, 28))).toBe(2)
  })

  it('平年は 2月28日 → 3月1日 が 1', () => {
    expect(daysUntil('2027-03-01', local(2027, 2, 28))).toBe(1)
  })

  it('1年後: 平年をまたぐと 365、うるう日をまたぐと 366', () => {
    expect(daysUntil('2027-10-05', local(2026, 10, 5))).toBe(365)
    expect(daysUntil('2028-10-05', local(2027, 10, 5))).toBe(366)
  })

  it('夏時間の切り替えのある月をまたいでも、暦日で数える（時刻が 23:59 でも 0:00 でも）', () => {
    // 端末のタイムゾーンに夏時間があっても、ない JST でも同じ結果になる（3月と11月の月初〜月末）
    expect(daysUntil('2026-04-01', local(2026, 3, 1, 23, 59, 59))).toBe(31)
    expect(daysUntil('2026-04-01', local(2026, 3, 1, 0, 0, 0))).toBe(31)
    expect(daysUntil('2026-12-01', local(2026, 11, 1, 23, 59, 59))).toBe(30)
    expect(daysUntil('2026-12-01', local(2026, 11, 1, 0, 0, 0))).toBe(30)
  })

  it('渡した today を書き換えない', () => {
    const today = local(2026, 10, 5, 13, 45, 12, 345)
    const before = today.getTime()
    daysUntil('2026-10-17', today)
    expect(today.getTime()).toBe(before)
  })
})

describe('upcomingContests', () => {
  const TODAY = local(2026, 10, 5)

  it('空配列なら空', () => {
    expect(upcomingContests([], TODAY)).toEqual([])
  })

  it('当日の大会は daysLeft 0 で含む', () => {
    const today = makeContest('大会a', '2026-10-05', 'a')
    expect(upcomingContests([today], TODAY)).toEqual([{ contest: today, daysLeft: 0 }])
  })

  it('昨日の大会は含まない', () => {
    expect(upcomingContests([makeContest('大会a', '2026-10-04', 'a')], TODAY)).toEqual([])
  })

  it('明日の大会は daysLeft 1', () => {
    const tomorrow = makeContest('大会a', '2026-10-06', 'a')
    expect(upcomingContests([tomorrow], TODAY)).toEqual([{ contest: tomorrow, daysLeft: 1 }])
  })

  it('過ぎた大会だけなら空', () => {
    expect(
      upcomingContests([makeContest('大会a', '2026-01-01', 'a'), makeContest('大会b', '2026-10-04', 'b')], TODAY),
    ).toEqual([])
  })

  it('過ぎた大会は除き、これからの大会だけを近い順に並べる', () => {
    const past = makeContest('大会past', '2026-09-01', 'past')
    const near = makeContest('大会near', '2026-10-17', 'near')
    const far = makeContest('大会far', '2027-01-10', 'far')
    const mid = makeContest('大会mid', '2026-11-03', 'mid')
    expect(upcomingContests([far, past, near, mid], TODAY)).toEqual([
      { contest: near, daysLeft: 12 },
      { contest: mid, daysLeft: 29 },
      { contest: far, daysLeft: 97 },
    ])
  })

  it('同じ日の大会は配列の順（登録順）のまま', () => {
    const first = makeContest('大会first', '2026-10-17', 'first')
    const second = makeContest('大会second', '2026-10-17', 'second')
    const third = makeContest('大会third', '2026-10-17', 'third')
    const earlier = makeContest('大会earlier', '2026-10-10', 'earlier')
    const result = upcomingContests([first, second, earlier, third], TODAY)
    expect(result.map((item) => item.contest.id)).toEqual(['earlier', 'first', 'second', 'third'])
  })

  it('同じ日が何件あっても登録順が崩れない（件数を増やして並べ替えの不安定さを出す）', () => {
    const many = Array.from({ length: 30 }, (_, index) => makeContest(`大会c${index}`, '2026-10-17', `c${index}`))
    const result = upcomingContests(many, TODAY)
    expect(result.map((item) => item.contest.id)).toEqual(many.map((item) => item.id))
  })

  it('入力の配列を書き換えない（並べ替えない・凍結されていても例外にならない）', () => {
    const input = deepFreeze([makeContest('大会b', '2026-12-01', 'b'), makeContest('大会a', '2026-10-17', 'a')])
    const snapshot = input.map((item) => item.id)
    expect(() => upcomingContests(input, TODAY)).not.toThrow()
    expect(input.map((item) => item.id)).toEqual(snapshot)
  })

  it('今日の時刻が 23:59:59 でも 00:00:01 でも同じ結果', () => {
    const tomorrow = makeContest('大会a', '2026-10-06', 'a')
    const today = makeContest('大会b', '2026-10-05', 'b')
    const yesterday = makeContest('大会c', '2026-10-04', 'c')
    for (const time of [local(2026, 10, 5, 0, 0, 1), local(2026, 10, 5, 12), local(2026, 10, 5, 23, 59, 59)]) {
      expect(upcomingContests([yesterday, tomorrow, today], time)).toEqual([
        { contest: today, daysLeft: 0 },
        { contest: tomorrow, daysLeft: 1 },
      ])
    }
  })

  it('年またぎ・うるう日をまたぐ大会の日数も正しい', () => {
    const newYear = makeContest('大会a', '2027-01-01', 'a')
    const leapDay = makeContest('大会b', '2028-02-29', 'b')
    const result = upcomingContests([leapDay, newYear], local(2026, 12, 31))
    expect(result).toEqual([
      { contest: newYear, daysLeft: 1 },
      { contest: leapDay, daysLeft: 425 },
    ])
  })
})

describe('groupContestsByDate', () => {
  it('空配列なら空の Map', () => {
    const grouped = groupContestsByDate([])
    expect(grouped).toBeInstanceOf(Map)
    expect(grouped.size).toBe(0)
  })

  it('日付ごとに大会をまとめる', () => {
    const a = makeContest('大会a', '2026-10-17', 'a')
    const b = makeContest('大会b', '2026-11-03', 'b')
    const grouped = groupContestsByDate([a, b])
    expect(grouped.size).toBe(2)
    expect(grouped.get('2026-10-17')).toEqual([a])
    expect(grouped.get('2026-11-03')).toEqual([b])
  })

  it('同じ日の大会は配列の順（登録順）で並ぶ', () => {
    const a = makeContest('大会a', '2026-10-17', 'a')
    const b = makeContest('大会b', '2026-11-03', 'b')
    const c = makeContest('大会c', '2026-10-17', 'c')
    expect(groupContestsByDate([a, b, c]).get('2026-10-17')).toEqual([a, c])
  })

  it('過ぎた大会も含む（カレンダーの印に使うため）', () => {
    const past = makeContest('大会past', '2020-01-01', 'past')
    expect(groupContestsByDate([past]).get('2020-01-01')).toEqual([past])
  })

  it('大会のない日は undefined', () => {
    expect(groupContestsByDate([makeContest('大会a', '2026-10-17', 'a')]).get('2026-10-18')).toBeUndefined()
  })

  it('入力を書き換えない', () => {
    const input = deepFreeze([makeContest('大会a', '2026-10-17', 'a'), makeContest('大会b', '2026-10-17', 'b')])
    expect(() => groupContestsByDate(input)).not.toThrow()
    expect(input).toHaveLength(2)
  })
})

describe('sanitizeContests', () => {
  const VALID = makeContest('ボディコンテスト', '2026-10-17', 'a')

  it('正しい大会はそのまま残す', () => {
    expect(sanitizeContests([VALID])).toEqual([VALID])
  })

  it('空配列は空配列', () => {
    expect(sanitizeContests([])).toEqual([])
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['文字列', 'contests'],
    ['数値', 42],
    ['真偽値', true],
    ['オブジェクト', { id: 'a', name: 'x', date: '2026-10-17' }],
    ['配列風のオブジェクト', { 0: { id: 'a', name: 'x', date: '2026-10-17' }, length: 1 }],
  ])('配列でない値（%s）は例外を投げず空配列', (_label, value) => {
    expect(() => sanitizeContests(value)).not.toThrow()
    expect(sanitizeContests(value)).toEqual([])
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['数値', 1],
    ['文字列', 'a'],
    ['配列', ['a', 'b', '2026-10-17']],
    ['空オブジェクト', {}],
    ['id が無い', { name: 'x', date: '2026-10-17' }],
    ['id が空文字', { id: '', name: 'x', date: '2026-10-17' }],
    ['id が数値', { id: 1, name: 'x', date: '2026-10-17' }],
    ['id が null', { id: null, name: 'x', date: '2026-10-17' }],
    ['name が無い', { id: 'a', date: '2026-10-17' }],
    ['name が空文字', { id: 'a', name: '', date: '2026-10-17' }],
    ['name が空白だけ', { id: 'a', name: '   ', date: '2026-10-17' }],
    ['name が全角空白だけ', { id: 'a', name: '　　', date: '2026-10-17' }],
    ['name が数値', { id: 'a', name: 5, date: '2026-10-17' }],
    ['name が null', { id: 'a', name: null, date: '2026-10-17' }],
    ['date が無い', { id: 'a', name: 'x' }],
    ['date が空文字', { id: 'a', name: 'x', date: '' }],
    ['date が数値', { id: 'a', name: 'x', date: 20261017 }],
    ['date が存在しない日', { id: 'a', name: 'x', date: '2026-02-30' }],
    ['date がゼロ埋めなし', { id: 'a', name: 'x', date: '2026-1-5' }],
    ['date がスラッシュ区切り', { id: 'a', name: 'x', date: '2026/10/17' }],
  ])('壊れた要素（%s）は捨てる', (_label, broken) => {
    expect(() => sanitizeContests([broken])).not.toThrow()
    expect(sanitizeContests([broken])).toEqual([])
  })

  it('壊れた要素が混ざっていても、正しい要素だけを元の順で残す', () => {
    const first = makeContest('一つ目', '2026-10-17', 'a')
    const second = makeContest('二つ目', '2026-11-03', 'b')
    const result = sanitizeContests([
      null,
      first,
      { id: '', name: 'x', date: '2026-10-17' },
      'broken',
      second,
      { id: 'c', name: '   ', date: '2026-10-17' },
      { id: 'd', name: 'x', date: '2026-02-30' },
    ])
    expect(result).toEqual([first, second])
  })

  it('同じ id が2つあれば先の1つだけ残す', () => {
    const first = makeContest('先', '2026-10-17', 'same')
    const second = makeContest('後', '2026-11-03', 'same')
    const other = makeContest('別', '2026-12-01', 'other')
    expect(sanitizeContests([first, other, second])).toEqual([first, other])
  })

  it('同じ id が3つあっても先の1つだけ', () => {
    const items = [makeContest('大会x', '2026-10-01', 'x'), makeContest('大会x', '2026-10-02', 'x'), makeContest('大会x', '2026-10-03', 'x')]
    expect(sanitizeContests(items)).toEqual([items[0]])
  })

  it('同じ名前・同じ日付でも id が違えば両方残す', () => {
    const a = makeContest('同じ', '2026-10-17', 'a')
    const b = makeContest('同じ', '2026-10-17', 'b')
    expect(sanitizeContests([a, b])).toEqual([a, b])
  })

  it('並びは日付順に直さない（保存された順のまま）', () => {
    const later = makeContest('大会a', '2026-12-01', 'a')
    const earlier = makeContest('大会b', '2026-10-01', 'b')
    expect(sanitizeContests([later, earlier]).map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('入力を書き換えない（凍結されていても例外にならない）', () => {
    const input = deepFreeze([makeContest('大会a', '2026-10-17', 'a'), null, makeContest('大会a', '2026-10-18', 'a')])
    expect(() => sanitizeContests(input)).not.toThrow()
    expect(input).toHaveLength(3)
  })
})

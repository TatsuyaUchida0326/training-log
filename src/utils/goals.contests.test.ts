import { describe, it, expect } from 'vitest'
import { calcGoalProgress, withContestTarget } from './goals'
import type { GoalProgress } from './goals'
import { makeContest, withTargets } from '../test/contests'
import { makeBodyRecord } from '../test/seed'
import type { BodyRecord, BodySettings, Contest, GoalMetric } from '../types'

/**
 * 「大会ごとの目標」の計算。仕様の規則 1〜7 と例 A〜D を 1 行ずつテストにしている。
 * 既存の goals.test.ts は options を渡さない呼び出しだけを見ているので、ここでは options ありを見る。
 */

/** 既定値に頼らず全項目を明示する。目標はすべて未設定（= ふだんの目標なし） */
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

/** 渡した値を書き換えようとすると例外になる凍結コピー（純粋関数であることの確認用） */
function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

// 現地時刻の Date（month は 1 始まり）
function local(year: number, month: number, day: number, h = 12, m = 0, s = 0): Date {
  return new Date(year, month - 1, day, h, m, s)
}

/** 今日。2026-10-05（月）12:00 */
const TODAY = local(2026, 10, 5)

function contestAt(name: string, date: string, id?: string): Contest {
  return makeContest(name, date, id)
}

/** options ありで計算する。today の既定は TODAY */
function progress(
  records: BodyRecord[],
  settings: BodySettings,
  contests: Contest[],
  today: Date = TODAY,
): GoalProgress[] {
  return calcGoalProgress(records, settings, { contests, today })
}

function metricsOf(goals: GoalProgress[]): GoalMetric[] {
  return goals.map((goal) => goal.metric)
}

function sourcesOf(goals: GoalProgress[]): string[] {
  return goals.map((goal) => goal.source)
}

describe('規則3 — options を渡さない・対象が無いときは今までと同じ結果（全部 base）', () => {
  const settings = makeSettings({
    targetWeight: 65,
    targetBodyFat: 15,
    goalBaselines: { weight: 70, bodyFat: 20 },
  })
  const records = [makeBodyRecord('2026-10-01', { weight: 68.2, bodyFat: 18 })]
  const EXPECTED_BASE: GoalProgress[] = [
    { metric: 'weight', current: 68.2, target: 65, remaining: 3.2, status: 'decrease', source: 'base' },
    { metric: 'bodyFat', current: 18, target: 15, remaining: 3, status: 'decrease', source: 'base' },
  ]

  it('第3引数なし: 今までの結果に source: base が付くだけ', () => {
    expect(calcGoalProgress(records, settings)).toEqual(EXPECTED_BASE)
  })

  it('第3引数が undefined でも同じ', () => {
    expect(calcGoalProgress(records, settings, undefined)).toEqual(EXPECTED_BASE)
  })

  it('大会が1件も無ければ、第3引数なしと完全に同じ', () => {
    expect(progress(records, settings, [])).toEqual(calcGoalProgress(records, settings))
  })

  it('大会はあるが目標が1つも無ければ、第3引数なしと完全に同じ', () => {
    const contests = [contestAt('目標なしの大会', '2026-10-20')]
    expect(progress(records, settings, contests)).toEqual(EXPECTED_BASE)
  })

  it('一番近い大会の targets が空オブジェクトでも、第3引数なしと同じ', () => {
    const contests = [withTargets(contestAt('空の目標', '2026-10-20'), {})]
    expect(progress(records, settings, contests)).toEqual(EXPECTED_BASE)
  })

  it('これからの大会が1件も無ければ（全部過ぎている）、過ぎた大会に目標があっても base', () => {
    const contests = [withTargets(contestAt('終わった大会', '2026-10-04'), { weight: 60, bodyFat: 10 })]
    expect(progress(records, settings, contests)).toEqual(EXPECTED_BASE)
  })

  it('ふだんの目標も大会の目標も無ければ空', () => {
    const contests = [contestAt('目標なしの大会', '2026-10-20')]
    expect(progress(records, makeSettings(), contests)).toEqual([])
  })

  it('大会の目標だけあって記録が1件も無ければ空（現在値が無い項目は返さない）', () => {
    const contests = [withTargets(contestAt('大会', '2026-10-20'), { weight: 60 })]
    expect(progress([], makeSettings(), contests)).toEqual([])
  })
})

describe('規則1 — 対象は「一番近いこれからの大会」だけ', () => {
  const records = [makeBodyRecord('2026-10-01', { weight: 68.2 })]
  const settings = makeSettings({ targetWeight: 65 })

  it('今日が大会当日なら、その大会の目標を使う（今日を含む）', () => {
    const contests = [withTargets(contestAt('今日の大会', '2026-10-05'), { weight: 60 })]
    const [goal] = progress(records, settings, contests)
    expect(goal).toMatchObject({ target: 60, source: 'contest' })
  })

  it('昨日の大会は過ぎているので使わない（base の目標になる）', () => {
    const contests = [withTargets(contestAt('昨日の大会', '2026-10-04'), { weight: 60 })]
    const [goal] = progress(records, settings, contests)
    expect(goal).toMatchObject({ target: 65, source: 'base' })
  })

  it('明日の大会は使う', () => {
    const contests = [withTargets(contestAt('明日の大会', '2026-10-06'), { weight: 60 })]
    expect(progress(records, settings, contests)[0]).toMatchObject({ target: 60, source: 'contest' })
  })

  it('今日の時刻が 23:59 でも、当日の大会は「これから」に入る', () => {
    const contests = [withTargets(contestAt('今日の大会', '2026-10-05'), { weight: 60 })]
    expect(progress(records, settings, contests, local(2026, 10, 5, 23, 59, 59))[0]).toMatchObject({
      target: 60,
      source: 'contest',
    })
  })

  it('同じ日の大会が2件なら、登録順で先の1件の目標を使う', () => {
    const contests = [
      withTargets(contestAt('先に登録', '2026-10-20'), { weight: 60 }),
      withTargets(contestAt('後に登録', '2026-10-20'), { weight: 50 }),
    ]
    expect(progress(records, settings, contests)[0]).toMatchObject({ target: 60, source: 'contest' })
  })

  it('同じ日の2件で、登録順を入れ替えると使う目標も入れ替わる', () => {
    const contests = [
      withTargets(contestAt('後に登録', '2026-10-20'), { weight: 50 }),
      withTargets(contestAt('先に登録', '2026-10-20'), { weight: 60 }),
    ]
    expect(progress(records, settings, contests)[0]).toMatchObject({ target: 50, source: 'contest' })
  })

  it('同じ日の先の1件に目標が無ければ、後の1件に目標があっても使わない（base）', () => {
    const contests = [
      contestAt('先に登録（目標なし）', '2026-10-20'),
      withTargets(contestAt('後に登録', '2026-10-20'), { weight: 50 }),
    ]
    expect(progress(records, settings, contests)[0]).toMatchObject({ target: 65, source: 'base' })
  })

  it('配列の並びが遠い順でも、一番近い大会を対象にする', () => {
    const contests = [
      withTargets(contestAt('遠い大会', '2026-12-24'), { weight: 50 }),
      withTargets(contestAt('近い大会', '2026-10-17'), { weight: 60 }),
    ]
    expect(progress(records, settings, contests)[0]).toMatchObject({ target: 60, source: 'contest' })
  })

  it('2件目以降の大会の目標は使わない（一番近い大会に目標が無ければ base）', () => {
    const contests = [
      contestAt('近い大会（目標なし）', '2026-10-17'),
      withTargets(contestAt('次の大会', '2026-11-03'), { weight: 60 }),
    ]
    const goals = progress(records, settings, contests)
    expect(goals).toHaveLength(1)
    expect(goals[0]).toMatchObject({ target: 65, source: 'base' })
  })

  it('一番近い大会に無い項目を、2件目の大会から借りない', () => {
    const contests = [
      withTargets(contestAt('近い大会', '2026-10-17'), { weight: 60 }),
      withTargets(contestAt('次の大会', '2026-11-03'), { bodyFat: 10 }),
    ]
    const withBodyFatRecord = [makeBodyRecord('2026-10-01', { weight: 68.2, bodyFat: 18 })]
    const goals = progress(withBodyFatRecord, makeSettings(), contests)
    expect(metricsOf(goals)).toEqual(['weight'])
  })

  it('過ぎた大会の目標は使わない。これからの大会に目標が無ければ base', () => {
    const contests = [
      withTargets(contestAt('終わった大会', '2026-09-01'), { weight: 50 }),
      contestAt('次の大会（目標なし）', '2026-10-17'),
    ]
    expect(progress(records, settings, contests)[0]).toMatchObject({ target: 65, source: 'base' })
  })

  it('過ぎた大会と、これからの大会の両方に目標があれば、これからの大会の目標を使う', () => {
    const contests = [
      withTargets(contestAt('終わった大会', '2026-09-01'), { weight: 50 }),
      withTargets(contestAt('次の大会', '2026-10-17'), { weight: 60 }),
    ]
    expect(progress(records, settings, contests)[0]).toMatchObject({ target: 60, source: 'contest' })
  })
})

describe('規則2 — 項目ごとに「大会の目標があれば大会、無ければふだん」', () => {
  const records = [makeBodyRecord('2026-10-01', { weight: 68.2, bodyFat: 18, muscleMass: 35 })]

  it('体重は大会・体脂肪率はふだん: source が項目ごとに分かれ、順は weight → bodyFat', () => {
    const settings = makeSettings({ targetWeight: 65, targetBodyFat: 15 })
    const contests = [withTargets(contestAt('大会', '2026-10-20'), { weight: 60 })]
    expect(progress(records, settings, contests)).toEqual([
      { metric: 'weight', current: 68.2, target: 60, remaining: 8.2, status: 'decrease', source: 'contest' },
      { metric: 'bodyFat', current: 18, target: 15, remaining: 3, status: 'decrease', source: 'base' },
    ])
  })

  it('3項目すべてが大会の目標なら、すべて contest（ふだんの目標が無くても返る）', () => {
    const contests = [
      withTargets(contestAt('大会', '2026-10-20'), { weight: 60, bodyFat: 12, muscleMass: 40 }),
    ]
    const goals = progress(records, makeSettings(), contests)
    expect(metricsOf(goals)).toEqual(['weight', 'bodyFat', 'muscleMass'])
    expect(sourcesOf(goals)).toEqual(['contest', 'contest', 'contest'])
    expect(goals.map((goal) => goal.target)).toEqual([60, 12, 40])
  })

  it('大会に目標のある項目はふだんの目標より優先する（65 → 60）', () => {
    const settings = makeSettings({ targetWeight: 65 })
    const contests = [withTargets(contestAt('大会', '2026-10-20'), { weight: 60 })]
    const goals = progress(records, settings, contests)
    expect(goals).toHaveLength(1)
    expect(goals[0].target).toBe(60)
  })

  it('大会は筋肉量だけ・ふだんは体重だけ: weight(base) → muscleMass(contest) の順で返る', () => {
    const settings = makeSettings({ targetWeight: 65 })
    const contests = [withTargets(contestAt('大会', '2026-10-20'), { muscleMass: 40 })]
    const goals = progress(records, settings, contests)
    expect(metricsOf(goals)).toEqual(['weight', 'muscleMass'])
    expect(sourcesOf(goals)).toEqual(['base', 'contest'])
  })

  it('targets の書かれた順が逆でも、返す順は weight → bodyFat → muscleMass', () => {
    const contests = [
      withTargets(contestAt('大会', '2026-10-20'), { muscleMass: 40, bodyFat: 12, weight: 60 }),
    ]
    expect(metricsOf(progress(records, makeSettings(), contests))).toEqual([
      'weight',
      'bodyFat',
      'muscleMass',
    ])
  })

  it('どちらにも目標が無い項目は返さない', () => {
    const settings = makeSettings({ targetBodyFat: 15 })
    const contests = [withTargets(contestAt('大会', '2026-10-20'), { weight: 60 })]
    expect(metricsOf(progress(records, settings, contests))).toEqual(['weight', 'bodyFat'])
  })

  it('大会の目標がある項目でも、その項目の現在値が無ければ返さない', () => {
    const onlyWeight = [makeBodyRecord('2026-10-01', { weight: 68.2 })]
    const contests = [withTargets(contestAt('大会', '2026-10-20'), { weight: 60, bodyFat: 12 })]
    expect(metricsOf(progress(onlyWeight, makeSettings(), contests))).toEqual(['weight'])
  })

  it('ふだんの目標の項目も、現在値が無ければ返さない', () => {
    const onlyWeight = [makeBodyRecord('2026-10-01', { weight: 68.2 })]
    const settings = makeSettings({ targetBodyFat: 15 })
    const contests = [withTargets(contestAt('大会', '2026-10-20'), { weight: 60 })]
    expect(metricsOf(progress(onlyWeight, settings, contests))).toEqual(['weight'])
  })

  it('大会の目標を使っても、現在値は今までと同じ（その項目が入っている一番新しい日）', () => {
    const rs = [
      makeBodyRecord('2026-10-01', { weight: 70 }),
      makeBodyRecord('2026-10-03', { weight: null, bodyFat: 19 }),
    ]
    const contests = [withTargets(contestAt('大会', '2026-10-20'), { weight: 60 })]
    expect(progress(rs, makeSettings(), contests)[0].current).toBe(70)
  })
})

describe('規則4 — 現在値・丸め・達成・remaining は今までと同じ', () => {
  /** 起点を 10/01 にして、減らす目標にしたい（70 → 目標）形をつくる */
  function decreasing(target: number, current: number): GoalProgress {
    const rs = [
      makeBodyRecord('2026-10-01', { weight: 70 }),
      makeBodyRecord('2026-10-04', { weight: current }),
    ]
    const contests = [
      withTargets(contestAt('大会', '2026-10-20'), { weight: target }, { weight: '2026-10-01' }),
    ]
    return progress(rs, makeSettings(), contests)[0]
  }

  it('残りは 小数1桁（68.24 → 65 は 3.2）で、浮動小数点の誤差を出さない', () => {
    expect(decreasing(65, 68.24)).toEqual({
      metric: 'weight',
      current: 68.2,
      target: 65,
      remaining: 3.2,
      status: 'decrease',
      source: 'contest',
    })
  })

  it('目標も小数1桁に丸める（65.04 → 65.0、65.06 → 65.1）', () => {
    expect(decreasing(65.04, 68.2).target).toBe(65)
    expect(decreasing(65.06, 68.2).target).toBe(65.1)
  })

  it('丸めた値どうしで達成を決める（65.04 は 65.0 に丸まるので、65.04 kg なら達成）', () => {
    expect(decreasing(65.04, 65.04)).toMatchObject({ current: 65, target: 65, status: 'achieved', remaining: 0 })
  })

  it('現在値が目標ちょうど（減らす目標）なら達成', () => {
    expect(decreasing(65, 65)).toMatchObject({ status: 'achieved', remaining: 0 })
  })

  it('目標を下回っても達成で、remaining は 0', () => {
    expect(decreasing(65, 64.5)).toMatchObject({ status: 'achieved', remaining: 0 })
  })

  it('目標の 0.1 上は達成にならず、あと 0.1', () => {
    expect(decreasing(65, 65.1)).toMatchObject({ status: 'decrease', remaining: 0.1 })
  })

  it('目標の 0.04 上は丸めると目標と同じなので達成', () => {
    expect(decreasing(65, 65.04)).toMatchObject({ status: 'achieved', remaining: 0 })
  })

  it('増やす目標でも同じ: 目標ちょうど・超えたら達成、足りなければ increase', () => {
    const contests = [
      withTargets(contestAt('大会', '2026-10-20'), { weight: 75 }, { weight: '2026-10-01' }),
    ]
    const at = (current: number) =>
      progress(
        [makeBodyRecord('2026-10-01', { weight: 70 }), makeBodyRecord('2026-10-04', { weight: current })],
        makeSettings(),
        contests,
      )[0]
    expect(at(72.4)).toMatchObject({ status: 'increase', remaining: 2.6 })
    expect(at(75)).toMatchObject({ status: 'achieved', remaining: 0 })
    expect(at(76)).toMatchObject({ status: 'achieved', remaining: 0 })
  })

  it('remaining は常に 0 以上（achieved のときも負にならない）', () => {
    expect(decreasing(65, 50).remaining).toBe(0)
  })
})

describe('規則5 — 向き（大会の目標のとき）: 起点の日と baseline', () => {
  describe('例A（目標が先・記録が後）', () => {
    const contests = [
      withTargets(contestAt('大会', '2026-10-20'), { weight: 65 }, { weight: '2026-10-01' }),
    ]

    it('10/01 に目標 65、記録は 10/03=68.2 が最初 → baseline 68.2、減らす目標「あと 3.2」', () => {
      const records = [makeBodyRecord('2026-10-03', { weight: 68.2 })]
      expect(progress(records, makeSettings(), contests)).toEqual([
        { metric: 'weight', current: 68.2, target: 65, remaining: 3.2, status: 'decrease', source: 'contest' },
      ])
    })

    it('その後 64.5 を記録すると achieved（baseline は最初の記録 68.2 のまま）', () => {
      const records = [
        makeBodyRecord('2026-10-03', { weight: 68.2 }),
        makeBodyRecord('2026-10-04', { weight: 64.5 }),
      ]
      expect(progress(records, makeSettings(), contests)[0]).toMatchObject({
        current: 64.5,
        status: 'achieved',
        remaining: 0,
      })
    })

    it('目標を入れたあとに体重が増えても減らす目標のまま（あと 5.0）', () => {
      const records = [
        makeBodyRecord('2026-10-03', { weight: 68.2 }),
        makeBodyRecord('2026-10-04', { weight: 70 }),
      ]
      expect(progress(records, makeSettings(), contests)[0]).toMatchObject({
        status: 'decrease',
        remaining: 5,
      })
    })

    it('起点より後にしか記録が無いとき、使うのは「後で一番古い」記録（配列が新しい順でも）', () => {
      const records = [
        makeBodyRecord('2026-10-04', { weight: 64.5 }),
        makeBodyRecord('2026-10-03', { weight: 68.2 }),
      ]
      expect(progress(records, makeSettings(), contests)[0]).toMatchObject({
        current: 64.5,
        status: 'achieved',
      })
    })

    it('起点より後で、その項目が入っている一番古い記録を使う（null の日は飛ばす）', () => {
      const records = [
        makeBodyRecord('2026-10-02', { weight: null, bodyFat: 20 }),
        makeBodyRecord('2026-10-03', { weight: 68.2 }),
        makeBodyRecord('2026-10-04', { weight: 64.5 }),
      ]
      expect(progress(records, makeSettings(), contests)[0]).toMatchObject({ status: 'achieved' })
    })
  })

  describe('例B（大会が切り替わる）', () => {
    const X = withTargets(contestAt('大会X', '2026-10-10'), { weight: 62 })
    const Y = withTargets(contestAt('大会Y', '2026-11-20'), { weight: 66 }, { weight: '2026-09-01' })
    const records = [
      makeBodyRecord('2026-09-01', { weight: 68 }),
      makeBodyRecord('2026-10-10', { weight: 62 }),
      makeBodyRecord('2026-10-15', { weight: 62.3 }),
    ]
    const today = local(2026, 10, 15)

    it('今日 10/15: 一番近いのは Y。起点の日は max(9/01, 10/10)=10/10、baseline 62 → 増やす目標「あと 3.7 増」', () => {
      expect(progress(records, makeSettings(), [X, Y], today)).toEqual([
        { metric: 'weight', current: 62.3, target: 66, remaining: 3.7, status: 'increase', source: 'contest' },
      ])
    })

    it('Y の setOn（9/01）だけで決めていたら 68→66 で減らす目標になる。それを避けて「達成」と誤らない', () => {
      const [goal] = progress(records, makeSettings(), [X, Y], today)
      expect(goal.status).not.toBe('achieved')
      expect(goal.status).toBe('increase')
    })

    it('配列の並びが Y → X でも同じ結果（前の大会は日付で決める）', () => {
      expect(progress(records, makeSettings(), [Y, X], today)).toEqual(
        progress(records, makeSettings(), [X, Y], today),
      )
    })

    it('Y の目標を超えたら achieved になる', () => {
      const reached = [...records, makeBodyRecord('2026-10-20', { weight: 66.4 })]
      expect(progress(reached, makeSettings(), [X, Y], local(2026, 10, 21))[0]).toMatchObject({
        status: 'achieved',
        remaining: 0,
      })
    })
  })

  describe('起点の日 = setOn と「前の大会の日」の遅いほう', () => {
    it('setOn のほうが遅いとき: 起点は setOn（前の大会の日ではない）', () => {
      // 前の大会 9/10、setOn 10/01。10/01 の値 67 が baseline なら、目標 65 は減らす目標。
      // 9/10 の値 60 が baseline だと増やす目標になってしまう。
      const prev = contestAt('前の大会', '2026-09-10')
      const next = withTargets(contestAt('次の大会', '2026-11-20'), { weight: 65 }, { weight: '2026-10-01' })
      const records = [
        makeBodyRecord('2026-09-10', { weight: 60 }),
        makeBodyRecord('2026-10-01', { weight: 67 }),
        makeBodyRecord('2026-10-12', { weight: 66.5 }),
      ]
      expect(progress(records, makeSettings(), [prev, next], local(2026, 10, 15))[0]).toMatchObject({
        current: 66.5,
        remaining: 1.5,
        status: 'decrease',
      })
    })

    it('前の大会の日のほうが遅いとき: 起点は前の大会の日（例B と同じ向きの規則）', () => {
      const prev = contestAt('前の大会', '2026-10-10')
      const next = withTargets(contestAt('次の大会', '2026-11-20'), { weight: 66 }, { weight: '2026-09-01' })
      const records = [
        makeBodyRecord('2026-09-01', { weight: 68 }),
        makeBodyRecord('2026-10-10', { weight: 62 }),
        makeBodyRecord('2026-10-12', { weight: 62.3 }),
      ]
      expect(progress(records, makeSettings(), [prev, next], local(2026, 10, 15))[0].status).toBe('increase')
    })

    it('前の大会の日と setOn が同じ日なら、その日が起点（その日ちょうどの記録が baseline）', () => {
      const prev = contestAt('前の大会', '2026-10-01')
      const next = withTargets(contestAt('次の大会', '2026-10-20'), { weight: 66.2 }, { weight: '2026-10-01' })
      const records = [
        makeBodyRecord('2026-09-20', { weight: 70 }),
        makeBodyRecord('2026-10-01', { weight: 66 }),
        makeBodyRecord('2026-10-03', { weight: 66.4 }),
      ]
      // baseline 66 < 66.2 なので増やす目標で、66.4 は達成。70 が baseline なら減らす目標で「あと 0.2」になる
      expect(progress(records, makeSettings(), [prev, next])[0]).toMatchObject({
        current: 66.4,
        status: 'achieved',
        remaining: 0,
      })
    })

    it('前の大会は「その大会より日付が前の大会のうち一番遅い日」（さらに前の大会は使わない）', () => {
      const first = contestAt('一番前', '2026-09-01')
      const second = contestAt('二番目', '2026-10-01')
      const target = withTargets(contestAt('今回の大会', '2026-10-20'), { weight: 64.2 })
      const records = [
        makeBodyRecord('2026-09-01', { weight: 70 }),
        makeBodyRecord('2026-10-01', { weight: 64 }),
        makeBodyRecord('2026-10-04', { weight: 64.3 }),
      ]
      // 起点 10/01 → baseline 64 < 64.2 の増やす目標で、64.3 は達成。9/01 の 70 を使うと「あと 0.1 減」になる
      expect(progress(records, makeSettings(), [first, second, target])[0]).toMatchObject({
        status: 'achieved',
      })
    })

    it('前の大会は、配列の並びではなく日付で決める（配列の先頭が一番新しい大会でも）', () => {
      const first = contestAt('一番前', '2026-09-01')
      const second = contestAt('二番目', '2026-10-01')
      const target = withTargets(contestAt('今回の大会', '2026-10-20'), { weight: 64.2 })
      const records = [
        makeBodyRecord('2026-09-01', { weight: 70 }),
        makeBodyRecord('2026-10-01', { weight: 64 }),
        makeBodyRecord('2026-10-04', { weight: 64.3 }),
      ]
      expect(progress(records, makeSettings(), [target, second, first])[0].status).toBe('achieved')
    })

    it('これより後ろの大会（日付が後）があっても結果は変わらない（前の大会に数えない）', () => {
      const target = withTargets(contestAt('今回の大会', '2026-10-20'), { weight: 65 })
      const later = contestAt('もっと先の大会', '2026-11-30')
      const records = [
        makeBodyRecord('2026-10-04', { weight: 68 }),
        makeBodyRecord('2026-10-05', { weight: 68 }),
      ]
      expect(progress(records, makeSettings(), [target, later])).toEqual(
        progress(records, makeSettings(), [target]),
      )
      expect(progress(records, makeSettings(), [target, later])[0]).toMatchObject({
        status: 'decrease',
        remaining: 3,
      })
    })

    it('同じ日の大会は前の大会に数えない（同日の別の大会を起点にしない）', () => {
      const earlier = contestAt('十日の大会', '2026-10-10')
      const sameDayFirst = withTargets(contestAt('同日・先', '2026-10-20'), { weight: 62.1 })
      const sameDaySecond = contestAt('同日・後', '2026-10-20')
      const records = [
        makeBodyRecord('2026-10-10', { weight: 62 }),
        makeBodyRecord('2026-10-14', { weight: 62.3 }),
      ]
      // 前の大会は 10/10（同日の 10/20 は数えない）→ baseline 62 < 62.1 の増やす目標で、62.3 は達成。
      // 同日を前の大会に数えると起点が 10/20 になり、baseline は最新の 62.3 > 62.1 で「あと 0.2 減」になる
      const today = local(2026, 10, 15) // 10/10 の大会は過ぎている
      expect(progress(records, makeSettings(), [earlier, sameDayFirst, sameDaySecond], today)[0]).toMatchObject({
        current: 62.3,
        status: 'achieved',
        remaining: 0,
      })
    })

    it('項目ごとに setOn が違えば、起点も項目ごとに別（体重は 10/01、体脂肪率は 10/03）', () => {
      const contest = withTargets(
        contestAt('大会', '2026-10-20'),
        { weight: 66, bodyFat: 18 },
        { weight: '2026-10-01', bodyFat: '2026-10-03' },
      )
      const records = [
        makeBodyRecord('2026-10-01', { weight: 68, bodyFat: 17 }),
        makeBodyRecord('2026-10-03', { weight: 67, bodyFat: 20 }),
        makeBodyRecord('2026-10-04', { weight: 66.5, bodyFat: 19 }),
      ]
      const [weight, bodyFat] = progress(records, makeSettings(), [contest])
      // 体重の baseline は 10/01 の 68 → 66 は減らす目標。体脂肪率の baseline は 10/03 の 20 → 18 は減らす目標
      expect(weight).toMatchObject({ metric: 'weight', status: 'decrease', remaining: 0.5 })
      expect(bodyFat).toMatchObject({ metric: 'bodyFat', status: 'decrease', remaining: 1 })
    })

    it('体脂肪率の setOn が無い項目だけ、前の大会の日で決める（項目ごとに独立）', () => {
      const prev = contestAt('前の大会', '2026-10-01')
      const contest = withTargets(
        contestAt('大会', '2026-10-20'),
        { weight: 66, bodyFat: 18 },
        { weight: '2026-10-03' },
      )
      const records = [
        makeBodyRecord('2026-10-01', { weight: 60, bodyFat: 17 }),
        makeBodyRecord('2026-10-03', { weight: 68, bodyFat: 20 }),
        makeBodyRecord('2026-10-04', { weight: 67, bodyFat: 17.5 }),
      ]
      const [weight, bodyFat] = progress(records, makeSettings(), [prev, contest])
      // 体重: 起点 10/03（setOn が遅い）→ baseline 68 → 減らす。体脂肪率: setOn 無し → 起点 10/01 → baseline 17 → 増やす
      expect(weight).toMatchObject({ status: 'decrease', remaining: 1 })
      expect(bodyFat).toMatchObject({ status: 'increase', remaining: 0.5 })
    })
  })

  describe('例C（前の大会が無い）: 起点は setOn', () => {
    const contests = [
      withTargets(contestAt('大会', '2026-10-20'), { weight: 67.5 }, { weight: '2026-10-01' }),
    ]

    it('起点の日ちょうどの記録が baseline（「以前」に含む）', () => {
      const records = [
        makeBodyRecord('2026-09-20', { weight: 70 }),
        makeBodyRecord('2026-10-01', { weight: 68 }),
        makeBodyRecord('2026-10-03', { weight: 67 }),
        makeBodyRecord('2026-10-04', { weight: 67.8 }),
      ]
      // baseline 68 > 67.5 の減らす目標。起点より後の最初の 67 を baseline にすると 67 < 67.5 で増やす目標になる
      expect(progress(records, makeSettings(), contests)[0]).toMatchObject({
        current: 67.8,
        status: 'decrease',
        remaining: 0.3,
      })
    })

    it('起点以前の記録が複数あれば、一番新しいもの（9/20 ではなく 9/30）が baseline', () => {
      const records = [
        makeBodyRecord('2026-09-20', { weight: 60 }),
        makeBodyRecord('2026-09-30', { weight: 70 }),
        makeBodyRecord('2026-10-04', { weight: 69 }),
      ]
      // baseline 70 > 67.5 の減らす目標。9/20 の 60 だと増やす目標になる
      expect(progress(records, makeSettings(), contests)[0]).toMatchObject({
        status: 'decrease',
        remaining: 1.5,
      })
    })

    it('起点の前と後の両方に記録があれば、前（以前）を使う。後ろの記録は使わない', () => {
      const records = [
        makeBodyRecord('2026-09-30', { weight: 70 }),
        makeBodyRecord('2026-10-03', { weight: 60 }),
      ]
      // baseline 70 → 減らす目標で、60 は達成。後ろの 60 を baseline にすると 60 < 67.5 → 増やす目標で「あと 7.5 増」
      expect(progress(records, makeSettings(), contests)[0]).toMatchObject({
        current: 60,
        status: 'achieved',
        remaining: 0,
      })
    })

    it('起点より前にしか記録が無いときも、その一番新しい記録が baseline', () => {
      const records = [
        makeBodyRecord('2026-09-20', { weight: 70 }),
        makeBodyRecord('2026-09-25', { weight: 69 }),
      ]
      expect(progress(records, makeSettings(), contests)[0]).toMatchObject({
        current: 69,
        status: 'decrease',
        remaining: 1.5,
      })
    })

    it('起点の日にその項目が入っていなければ、さらに前の入っている日が baseline', () => {
      const records = [
        makeBodyRecord('2026-09-28', { weight: 70 }),
        makeBodyRecord('2026-10-01', { weight: null, bodyFat: 20 }),
        makeBodyRecord('2026-10-04', { weight: 69 }),
      ]
      expect(progress(records, makeSettings(), contests)[0]).toMatchObject({ status: 'decrease', remaining: 1.5 })
    })

    it('記録が1件だけでも計算できる（起点より前・後・ちょうどのどれでも）', () => {
      for (const date of ['2026-09-01', '2026-10-01', '2026-10-04']) {
        const goals = progress([makeBodyRecord(date, { weight: 70 })], makeSettings(), contests)
        expect(goals).toHaveLength(1)
        expect(goals[0]).toMatchObject({ current: 70, status: 'decrease', remaining: 2.5 })
      }
    })

    it('増やす目標（バルクアップ）: baseline 60 → 目標 65、現在 60.5 は「あと 4.5 増」', () => {
      const bulk = [
        withTargets(contestAt('大会', '2026-10-20'), { weight: 65 }, { weight: '2026-10-01' }),
      ]
      const records = [
        makeBodyRecord('2026-10-01', { weight: 60 }),
        makeBodyRecord('2026-10-04', { weight: 60.5 }),
      ]
      expect(progress(records, makeSettings(), bulk)[0]).toMatchObject({ status: 'increase', remaining: 4.5 })
    })

    it('増やす目標で、目標を入れたあとに体重が減っても「増やす」のまま', () => {
      const bulk = [
        withTargets(contestAt('大会', '2026-10-20'), { weight: 65 }, { weight: '2026-10-01' }),
      ]
      const records = [
        makeBodyRecord('2026-10-01', { weight: 60 }),
        makeBodyRecord('2026-10-04', { weight: 58 }),
      ]
      expect(progress(records, makeSettings(), bulk)[0]).toMatchObject({ status: 'increase', remaining: 7 })
    })
  })

  describe('例D（setOn が無い・壊れている）: 前の大会の日だけで決める。それも無ければ baseline 無し', () => {
    const prev = contestAt('前の大会', '2026-10-01')
    const records = [
      makeBodyRecord('2026-09-25', { weight: 70 }),
      makeBodyRecord('2026-10-01', { weight: 65 }),
      makeBodyRecord('2026-10-03', { weight: 65.5 }),
    ]

    it('setOn が無ければ、前の大会の日が起点: baseline 65 < 65.2 の増やす目標で、65.5 は達成', () => {
      const next = withTargets(contestAt('次の大会', '2026-10-20'), { weight: 65.2 })
      // baseline 無し扱いだと現在値 65.5 > 65.2 で「あと 0.3 減」になる
      expect(progress(records, makeSettings(), [prev, next])[0]).toMatchObject({
        status: 'achieved',
        remaining: 0,
      })
    })

    describe('壊れた setOn を起点に使わない', () => {
      // 前の大会は 9/01。壊れた値のほうが文字列として後ろに並ぶものを選んでいる（起点に使うと baseline が 67 に変わる）
      const earlierContest = contestAt('前の大会', '2026-09-01')
      const brokenRecords = [
        makeBodyRecord('2026-08-25', { weight: 70 }),
        makeBodyRecord('2026-09-01', { weight: 65 }),
        makeBodyRecord('2026-09-20', { weight: 67 }),
        makeBodyRecord('2026-10-03', { weight: 65.5 }),
      ]

      it('基準: 壊れていない setOn が無ければ、前の大会の日 9/01 が起点（baseline 65 → 増やす目標で達成）', () => {
        const next = withTargets(contestAt('次の大会', '2026-10-20'), { weight: 65.2 })
        expect(progress(brokenRecords, makeSettings(), [earlierContest, next])[0]).toMatchObject({
          status: 'achieved',
        })
      })

      it.each([
        ['存在しない日', '2026-09-31'],
        ['ゼロ埋めなし（月）', '2026-9-30'],
        ['ゼロ埋めなし（日）', '2026-10-1'],
        ['月も日も範囲外', '9999-99-99'],
        ['年が範囲外（3000年）', '3000-01-01'],
        ['日付でない文字', 'あした'],
      ])('setOn が壊れている（%s）なら、無いのと同じ（前の大会の日で決める）', (_label, broken) => {
        const next = withTargets(contestAt('次の大会', '2026-10-20'), { weight: 65.2 }, {
          weight: broken,
        } as Contest['targetsSetOn'])
        expect(progress(brokenRecords, makeSettings(), [earlierContest, next])[0]).toMatchObject({
          status: 'achieved',
        })
      })

      it('setOn が文字列でない（数値・null・真偽値・オブジェクト）なら、無いのと同じ', () => {
        for (const broken of [20261001, null, true, {}]) {
          const next = withTargets(contestAt('次の大会', '2026-10-20'), { weight: 65.2 }, {
            weight: broken,
          } as unknown as Contest['targetsSetOn'])
          expect(progress(brokenRecords, makeSettings(), [earlierContest, next])[0]).toMatchObject({
            status: 'achieved',
          })
        }
      })
    })

    it('targetsSetOn 自体が壊れていても（null・文字列・配列）落ちず、無いのと同じ', () => {
      for (const broken of [null, 'broken', 42, ['2026-10-01']]) {
        const next = {
          ...withTargets(contestAt('次の大会', '2026-10-20'), { weight: 65.2 }),
          targetsSetOn: broken,
        } as unknown as Contest
        expect(() => progress(records, makeSettings(), [prev, next])).not.toThrow()
        expect(progress(records, makeSettings(), [prev, next])[0]).toMatchObject({ status: 'achieved' })
      }
    })

    it('setOn も前の大会も無ければ baseline 無し: 現在値と目標の差の符号（減らす）', () => {
      const only = withTargets(contestAt('大会', '2026-10-20'), { weight: 62 })
      expect(progress(records, makeSettings(), [only])[0]).toMatchObject({
        current: 65.5,
        status: 'decrease',
        remaining: 3.5,
      })
    })

    it('baseline 無しで現在値が目標より下なら、符号は増やす（あと ◯ 増）', () => {
      const only = withTargets(contestAt('大会', '2026-10-20'), { weight: 70 })
      expect(progress(records, makeSettings(), [only])[0]).toMatchObject({
        status: 'increase',
        remaining: 4.5,
      })
    })

    it('baseline 無しで現在値が目標と同じなら達成', () => {
      const only = withTargets(contestAt('大会', '2026-10-20'), { weight: 65.5 })
      expect(progress(records, makeSettings(), [only])[0]).toMatchObject({ status: 'achieved', remaining: 0 })
    })
  })

  describe('baseline が目標と同じ（小数1桁）とき: 向きを決められないので差の符号に従う', () => {
    const contests = [
      withTargets(contestAt('大会', '2026-10-20'), { weight: 65 }, { weight: '2026-10-01' }),
    ]

    it('baseline 65.04（丸めると 65.0）で現在値 66 → 減らす（あと 1.0）', () => {
      const records = [
        makeBodyRecord('2026-10-01', { weight: 65.04 }),
        makeBodyRecord('2026-10-04', { weight: 66 }),
      ]
      expect(progress(records, makeSettings(), contests)[0]).toMatchObject({ status: 'decrease', remaining: 1 })
    })

    it('baseline が目標と同じで現在値 64 → 増やす（あと 1.0）', () => {
      const records = [
        makeBodyRecord('2026-10-01', { weight: 65 }),
        makeBodyRecord('2026-10-04', { weight: 64 }),
      ]
      expect(progress(records, makeSettings(), contests)[0]).toMatchObject({ status: 'increase', remaining: 1 })
    })

    it('baseline が丸めて 0.1 違えば（65.1 vs 65）向きが決まる: 減らす', () => {
      const records = [
        makeBodyRecord('2026-10-01', { weight: 65.1 }),
        makeBodyRecord('2026-10-04', { weight: 64.5 }),
      ]
      // baseline 65.1 > 65 → 減らす目標。64.5 は達成（符号だけなら「あと 0.5 増」になる）
      expect(progress(records, makeSettings(), contests)[0]).toMatchObject({ status: 'achieved' })
    })
  })

  describe('筋肉量の baseline は kg（latestMeasuredValues と同じ換算）', () => {
    it('単位が % なら、起点の日の 体重 × 筋肉量% / 100 が baseline（40% は 28kg → 目標 30 は増やす）', () => {
      const settings = makeSettings({ muscleMassUnit: '%' })
      const contests = [
        withTargets(contestAt('大会', '2026-10-20'), { muscleMass: 30 }, { muscleMass: '2026-10-01' }),
      ]
      const records = [
        makeBodyRecord('2026-10-01', { weight: 70, muscleMass: 40 }),
        makeBodyRecord('2026-10-04', { weight: 70, muscleMass: 41 }),
      ]
      // % のまま（40）を baseline にすると 40 > 30 で減らす目標になってしまう
      expect(progress(records, settings, contests)[0]).toEqual({
        metric: 'muscleMass',
        current: 28.7,
        target: 30,
        remaining: 1.3,
        status: 'increase',
        source: 'contest',
      })
    })

    it('単位が % のとき、起点の日に体重が無ければその日は使えず、さらに前の日の換算値を使う', () => {
      const settings = makeSettings({ muscleMassUnit: '%' })
      const contests = [
        withTargets(contestAt('大会', '2026-10-20'), { muscleMass: 30 }, { muscleMass: '2026-10-01' }),
      ]
      const records = [
        makeBodyRecord('2026-09-28', { weight: 70, muscleMass: 40 }), // 28kg
        makeBodyRecord('2026-10-01', { weight: null, muscleMass: 50 }), // 体重が無いので換算できない
        makeBodyRecord('2026-10-04', { weight: 70, muscleMass: 41 }),
      ]
      expect(progress(records, settings, contests)[0]).toMatchObject({ status: 'increase', remaining: 1.3 })
    })

    it('単位が kg なら、記録の値がそのまま baseline', () => {
      const contests = [
        withTargets(contestAt('大会', '2026-10-20'), { muscleMass: 36 }, { muscleMass: '2026-10-01' }),
      ]
      const records = [
        makeBodyRecord('2026-10-01', { muscleMass: 34 }),
        makeBodyRecord('2026-10-04', { muscleMass: 35 }),
      ]
      expect(progress(records, makeSettings(), contests)[0]).toMatchObject({
        current: 35,
        status: 'increase',
        remaining: 1,
      })
    })

    it('筋肉量を kg で目標にしても、体重（%換算に必要）が無い単位 % の人には返さない', () => {
      const settings = makeSettings({ muscleMassUnit: '%' })
      const contests = [withTargets(contestAt('大会', '2026-10-20'), { muscleMass: 30 })]
      expect(progress([makeBodyRecord('2026-10-04', { muscleMass: 40 })], settings, contests)).toEqual([])
    })
  })

  describe('baseline は他の項目・ふだんの設定に左右されない', () => {
    it('大会の目標のときは settings.goalBaselines を使わない（goalBaselines が 70 でも、大会の baseline 60 で増やす目標）', () => {
      const settings = makeSettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
      const contests = [
        withTargets(contestAt('大会', '2026-10-20'), { weight: 64 }, { weight: '2026-10-01' }),
      ]
      const records = [
        makeBodyRecord('2026-10-01', { weight: 60 }),
        makeBodyRecord('2026-10-04', { weight: 61 }),
      ]
      expect(progress(records, settings, contests)[0]).toMatchObject({
        target: 64,
        status: 'increase',
        remaining: 3,
        source: 'contest',
      })
    })

    it('項目ごとに記録の入り方が違っても、その項目の記録だけで baseline を決める', () => {
      const contest = withTargets(
        contestAt('大会', '2026-10-20'),
        { weight: 66, bodyFat: 18 },
        { weight: '2026-10-01', bodyFat: '2026-10-01' },
      )
      const records = [
        makeBodyRecord('2026-09-28', { bodyFat: 17 }),
        makeBodyRecord('2026-10-02', { weight: 68 }),
        makeBodyRecord('2026-10-04', { weight: 67, bodyFat: 17.5 }),
      ]
      const [weight, bodyFat] = progress(records, makeSettings(), [contest])
      // 体重は起点以前に記録が無く、後で一番古い 68 が baseline → 減らす。体脂肪率は 9/28 の 17 が baseline → 増やす
      expect(weight).toMatchObject({ metric: 'weight', status: 'decrease', remaining: 1 })
      expect(bodyFat).toMatchObject({ metric: 'bodyFat', status: 'increase', remaining: 0.5 })
    })
  })
})

describe('規則6 — 向き（ふだんの目標のとき）は今までどおり settings.goalBaselines', () => {
  it('大会が体脂肪率だけ持つとき、体重（ふだん）は goalBaselines で向きを決める（70 → 65 の減らす目標で 64.5 は達成）', () => {
    const settings = makeSettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    const contests = [
      withTargets(contestAt('大会', '2026-10-20'), { bodyFat: 12 }, { bodyFat: '2026-10-01' }),
    ]
    const records = [makeBodyRecord('2026-10-04', { weight: 64.5, bodyFat: 18 })]
    const [weight] = progress(records, settings, contests)
    expect(weight).toMatchObject({ metric: 'weight', source: 'base', status: 'achieved', remaining: 0 })
  })

  it('goalBaselines が無ければ、ふだんの目標は現在値と目標の差の符号（大会の setOn は使わない）', () => {
    const settings = makeSettings({ targetWeight: 65 })
    const contests = [
      withTargets(contestAt('大会', '2026-10-20'), { bodyFat: 12 }, { bodyFat: '2026-10-01' }),
    ]
    const records = [makeBodyRecord('2026-10-04', { weight: 64.5, bodyFat: 18 })]
    expect(progress(records, settings, contests)[0]).toMatchObject({
      metric: 'weight',
      source: 'base',
      status: 'increase',
      remaining: 0.5,
    })
  })

  it('壊れた goalBaselines でも落ちない（ふだんの目標は差の符号に戻る）', () => {
    const settings = makeSettings({
      targetWeight: 65,
      goalBaselines: { weight: 'x' } as unknown as BodySettings['goalBaselines'],
    })
    const contests = [withTargets(contestAt('大会', '2026-10-20'), { bodyFat: 12 })]
    const records = [makeBodyRecord('2026-10-04', { weight: 68, bodyFat: 18 })]
    expect(() => progress(records, settings, contests)).not.toThrow()
    expect(progress(records, settings, contests)[0]).toMatchObject({ source: 'base', status: 'decrease' })
  })
})

describe('壊れた保存値・入力を書き換えない', () => {
  const records = [makeBodyRecord('2026-10-04', { weight: 68.2, bodyFat: 18 })]
  const settings = makeSettings({ targetWeight: 65 })

  it.each([
    ['null', null],
    ['文字列', 'broken'],
    ['数値', 42],
    ['配列', [60]],
    ['真偽値', true],
  ])('targets が %s でも落ちず、ふだんの目標になる', (_label, broken) => {
    const contest = { ...contestAt('大会', '2026-10-20'), targets: broken } as unknown as Contest
    expect(() => progress(records, settings, [contest])).not.toThrow()
    expect(progress(records, settings, [contest])).toEqual(calcGoalProgress(records, settings))
  })

  it.each([
    ['0', 0],
    ['負の数', -60],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['文字列', '60'],
    ['null', null],
    ['真偽値', true],
  ])('targets.weight が %s の項目は「目標なし」として、ふだんの目標を使う', (_label, broken) => {
    const contest = {
      ...contestAt('大会', '2026-10-20'),
      targets: { weight: broken },
    } as unknown as Contest
    expect(progress(records, settings, [contest])[0]).toMatchObject({ target: 65, source: 'base' })
  })

  it('1つの項目が壊れていても、ほかの項目の大会の目標は使う', () => {
    const contest = {
      ...contestAt('大会', '2026-10-20'),
      targets: { weight: 'x', bodyFat: 12 },
    } as unknown as Contest
    const goals = progress(records, settings, [contest])
    expect(goals).toEqual([
      expect.objectContaining({ metric: 'weight', source: 'base', target: 65 }),
      expect.objectContaining({ metric: 'bodyFat', source: 'contest', target: 12 }),
    ])
  })

  it('targets の未知のキーは無視する（waist など）', () => {
    const contest = {
      ...contestAt('大会', '2026-10-20'),
      targets: { waist: 70, weight: 60 },
    } as unknown as Contest
    const goals = progress(records, settings, [contest])
    expect(metricsOf(goals)).toEqual(['weight'])
    expect(goals[0]).toMatchObject({ target: 60, source: 'contest' })
  })

  it('渡した records・settings・contests を書き換えない（凍結しても例外にならない）', () => {
    const contests = deepFreeze([
      contestAt('前の大会', '2026-10-01'),
      withTargets(contestAt('大会', '2026-10-20'), { weight: 60 }, { weight: '2026-10-02' }),
    ])
    expect(() =>
      progress(deepFreeze([...records]), deepFreeze(makeSettings({ targetWeight: 65 })), contests),
    ).not.toThrow()
  })

  it('同じ入力なら何度呼んでも同じ結果（今日の時刻に依存せず、today だけに従う）', () => {
    const contests = [withTargets(contestAt('大会', '2026-10-20'), { weight: 60 })]
    expect(progress(records, settings, contests)).toEqual(progress(records, settings, contests))
  })
})

describe('withContestTarget — 規則7', () => {
  const NOON = local(2026, 10, 5)

  it('目標を入れる: targets[metric] = target、targetsSetOn[metric] = 今日（yyyy-MM-dd）', () => {
    const contest = contestAt('大会', '2026-10-20')
    expect(withContestTarget(contest, 'weight', 65, NOON)).toEqual({
      targets: { weight: 65 },
      targetsSetOn: { weight: '2026-10-05' },
    })
  })

  it.each<GoalMetric>(['weight', 'bodyFat', 'muscleMass'])('%s でも同じ', (metric) => {
    const result = withContestTarget(contestAt('大会', '2026-10-20'), metric, 12.5, NOON)
    expect(result).toEqual({
      targets: { [metric]: 12.5 },
      targetsSetOn: { [metric]: '2026-10-05' },
    })
  })

  it('戻り値は targets と targetsSetOn だけ（id・name・date は含まない）', () => {
    const result = withContestTarget(contestAt('大会', '2026-10-20', 'c1'), 'weight', 65, NOON)
    expect(Object.keys(result).sort()).toEqual(['targets', 'targetsSetOn'])
  })

  it('他の項目は変えない（targets も targetsSetOn も）', () => {
    const contest = withTargets(
      contestAt('大会', '2026-10-20'),
      { weight: 65, bodyFat: 12 },
      { weight: '2026-09-01', bodyFat: '2026-09-02' },
    )
    expect(withContestTarget(contest, 'muscleMass', 40, NOON)).toEqual({
      targets: { weight: 65, bodyFat: 12, muscleMass: 40 },
      targetsSetOn: { weight: '2026-09-01', bodyFat: '2026-09-02', muscleMass: '2026-10-05' },
    })
  })

  it('値を変えると、その項目の targets と setOn を更新し、ほかの項目の setOn は残す', () => {
    const contest = withTargets(
      contestAt('大会', '2026-10-20'),
      { weight: 65, bodyFat: 12 },
      { weight: '2026-09-01', bodyFat: '2026-09-02' },
    )
    expect(withContestTarget(contest, 'weight', 63, NOON)).toEqual({
      targets: { weight: 63, bodyFat: 12 },
      targetsSetOn: { weight: '2026-10-05', bodyFat: '2026-09-02' },
    })
  })

  it('同じ値を渡しても targets は同じ値のまま（setOn は今日に更新してよい）', () => {
    const contest = withTargets(contestAt('大会', '2026-10-20'), { weight: 65 }, { weight: '2026-09-01' })
    const result = withContestTarget(contest, 'weight', 65, NOON)
    expect(result.targets).toEqual({ weight: 65 })
    expect(result.targetsSetOn?.weight).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('target が 0（空にした）なら、その項目を targets と targetsSetOn の両方から取り除く', () => {
    const contest = withTargets(
      contestAt('大会', '2026-10-20'),
      { weight: 65, bodyFat: 12 },
      { weight: '2026-09-01', bodyFat: '2026-09-02' },
    )
    const result = withContestTarget(contest, 'weight', 0, NOON)
    expect(result).toEqual({ targets: { bodyFat: 12 }, targetsSetOn: { bodyFat: '2026-09-02' } })
    expect(result.targets).not.toHaveProperty('weight')
    expect(result.targetsSetOn).not.toHaveProperty('weight')
  })

  it('最後の1項目を 0 にすると、targets も targetsSetOn も undefined（空オブジェクトを残さない）', () => {
    const contest = withTargets(contestAt('大会', '2026-10-20'), { weight: 65 }, { weight: '2026-09-01' })
    const result = withContestTarget(contest, 'weight', 0, NOON)
    expect(result.targets).toBeUndefined()
    expect(result.targetsSetOn).toBeUndefined()
  })

  it('目標の無い大会に 0 を渡しても落ちず、両方 undefined', () => {
    const result = withContestTarget(contestAt('大会', '2026-10-20'), 'weight', 0, NOON)
    expect(result.targets).toBeUndefined()
    expect(result.targetsSetOn).toBeUndefined()
  })

  it('targets はあるが setOn が無い大会（旧データ）に値を入れると、その項目の setOn だけ付く', () => {
    const contest = withTargets(contestAt('大会', '2026-10-20'), { weight: 65 })
    expect(withContestTarget(contest, 'bodyFat', 12, NOON)).toEqual({
      targets: { weight: 65, bodyFat: 12 },
      targetsSetOn: { bodyFat: '2026-10-05' },
    })
  })

  it('今日の日付は現地の暦日: 23:59 でも 00:00:10 でも同じ日（UTC にずらさない）', () => {
    const contest = contestAt('大会', '2026-12-31')
    expect(withContestTarget(contest, 'weight', 65, local(2026, 10, 5, 23, 59, 59)).targetsSetOn).toEqual({
      weight: '2026-10-05',
    })
    expect(withContestTarget(contest, 'weight', 65, local(2026, 10, 5, 0, 0, 10)).targetsSetOn).toEqual({
      weight: '2026-10-05',
    })
  })

  it('月・日が1桁でもゼロ埋め（2026-01-05）、年末（2026-12-31）、うるう日（2028-02-29）', () => {
    const contest = contestAt('大会', '2029-01-01')
    const setOn = (today: Date) => withContestTarget(contest, 'weight', 65, today).targetsSetOn?.weight
    expect(setOn(local(2026, 1, 5))).toBe('2026-01-05')
    expect(setOn(local(2026, 12, 31))).toBe('2026-12-31')
    expect(setOn(local(2028, 2, 29))).toBe('2028-02-29')
  })

  it('元の大会を書き換えない（凍結した大会でも例外にならず、元の targets は変わらない）', () => {
    const contest = deepFreeze(
      withTargets(contestAt('大会', '2026-10-20'), { weight: 65 }, { weight: '2026-09-01' }),
    )
    expect(() => withContestTarget(contest, 'weight', 63, NOON)).not.toThrow()
    expect(() => withContestTarget(contest, 'weight', 0, NOON)).not.toThrow()
    expect(contest.targets).toEqual({ weight: 65 })
    expect(contest.targetsSetOn).toEqual({ weight: '2026-09-01' })
  })

  it('戻り値の targets・targetsSetOn は元と別のオブジェクト（あとから書き換えても元に影響しない）', () => {
    const contest = withTargets(contestAt('大会', '2026-10-20'), { weight: 65 }, { weight: '2026-09-01' })
    const result = withContestTarget(contest, 'bodyFat', 12, NOON)
    expect(result.targets).not.toBe(contest.targets)
    expect(result.targetsSetOn).not.toBe(contest.targetsSetOn)
  })
})

describe('withContestTarget と calcGoalProgress のつながり', () => {
  it('入れた直後の大会で計算すると、入れた日が起点になる（例A: 10/01 に 65 → 10/03 の 68.2 が baseline）', () => {
    const base = contestAt('大会', '2026-10-20')
    const contest = { ...base, ...withContestTarget(base, 'weight', 65, local(2026, 10, 1)) }
    const records = [
      makeBodyRecord('2026-10-03', { weight: 68.2 }),
      makeBodyRecord('2026-10-04', { weight: 64.5 }),
    ]
    expect(progress(records, makeSettings(), [contest])[0]).toMatchObject({
      target: 65,
      status: 'achieved',
      source: 'contest',
    })
  })

  it('目標を消した大会で計算すると、ふだんの目標に戻る', () => {
    const base = withTargets(contestAt('大会', '2026-10-20'), { weight: 60 }, { weight: '2026-10-01' })
    const contest = { ...base, ...withContestTarget(base, 'weight', 0, TODAY) }
    const records = [makeBodyRecord('2026-10-04', { weight: 68.2 })]
    expect(progress(records, makeSettings({ targetWeight: 65 }), [contest])[0]).toMatchObject({
      target: 65,
      source: 'base',
    })
  })
})

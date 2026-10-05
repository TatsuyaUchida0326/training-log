import { describe, it, expect } from 'vitest'
import { calcGoalProgress } from './goals'
import type { GoalProgress } from './goals'
import { makeContest, withTargets } from '../test/contests'
import { localDate } from '../test/dates'
import { deepFreeze } from '../test/deepFreeze'
import { makeBodyRecord } from '../test/seed'
import type { BodyRecord, BodySettings, Contest, GoalMetric, GoalOrigin } from '../types'

/**
 * 「大会ごとの目標」の計算。describe の見出しの番号は、次の規則の番号に対応している。
 * 規則 8〜10（目標の変更・起点の補完・過ぎた大会の削除での引き継ぎ）は goals.contestOrigins.test.ts にある。
 *
 *  1. 対象の大会は「一番近いこれからの大会」だけ（今日を含む。同じ日は登録順で先の1件）。過ぎた大会・2件目以降の目標は使わない
 *  2. 項目ごとに、その大会の目標があれば大会（source: 'contest'）、無ければふだんの目標（'base'）。どちらも無ければ返さない。順は weight → bodyFat → muscleMass
 *  3. これからの大会が無い・一番近い大会に目標が1つも無いときは、今までと同じ結果（全部 'base'）
 *  4. 現在値・丸め・達成の判定・remaining は今までと同じ（小数1桁に丸めてから計算）。現在値が無い項目は返さない
 *  5. 向き（大会の目標のとき）。起点 origin = targetOrigins[項目]（{ date, value? }）
 *     5-1. 前の大会 = その大会より日付が前の大会のうち、同じ項目の目標を持つもので一番遅い日（同じ日・目標を持たない予定は数えない）
 *     5-2. (a) 前の大会があり、origin が無い、または 前の大会の日 > origin.date: baseline は記録の履歴から引く
 *          （前の大会の日以前で一番新しい値。無ければ後で一番古い値。それも無ければ baseline 無し）
 *     5-3. (b) それ以外（前の大会が無い、または 前の大会の日 <= origin.date）: baseline = origin.value（無ければ baseline 無し。履歴は見ない）
 *     5-4. baseline があり、小数1桁で目標と違えば baseline と目標の大小で向きを決める。無い・同じなら current と target の差の符号
 *  6. 向き（ふだんの目標のとき）は今までどおり settings.goalBaselines
 *  7. GoalProgress.contestId は、source が 'contest' のとき、その大会の id
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

/** 今日。2026-10-05（月）12:00 */
const TODAY = localDate(2026, 10, 5)

function origin(date: string, value?: number): GoalOrigin {
  return value === undefined ? { date } : { date, value }
}

/** 体重の目標と起点を持つ大会 */
function weightContest(
  name: string,
  date: string,
  target: number,
  weightOrigin?: GoalOrigin,
  id?: string,
): Contest {
  const base = makeContest(name, date, id)
  return weightOrigin ? withTargets(base, { weight: target }, { weight: weightOrigin }) : withTargets(base, { weight: target })
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
    const contests = [makeContest('目標なしの大会', '2026-10-20')]
    expect(progress(records, settings, contests)).toEqual(EXPECTED_BASE)
  })

  it('一番近い大会の targets が空オブジェクトでも、第3引数なしと同じ', () => {
    const contests = [withTargets(makeContest('空の目標', '2026-10-20'), {})]
    expect(progress(records, settings, contests)).toEqual(EXPECTED_BASE)
  })

  it('これからの大会が1件も無ければ（全部過ぎている）、過ぎた大会に目標があっても base', () => {
    const contests = [withTargets(makeContest('終わった大会', '2026-10-04'), { weight: 60, bodyFat: 10 })]
    expect(progress(records, settings, contests)).toEqual(EXPECTED_BASE)
  })

  it('ふだんの目標も大会の目標も無ければ空', () => {
    const contests = [makeContest('目標なしの大会', '2026-10-20')]
    expect(progress(records, makeSettings(), contests)).toEqual([])
  })

  it('大会の目標だけあって記録が1件も無ければ空（現在値が無い項目は返さない）', () => {
    const contests = [withTargets(makeContest('大会', '2026-10-20'), { weight: 60 })]
    expect(progress([], makeSettings(), contests)).toEqual([])
  })

  it('旧形式の targetsSetOn は読まない（あっても無いのと同じ。起点の日にも使わない）', () => {
    const contest = {
      ...withTargets(makeContest('大会', '2026-10-20'), { weight: 65 }),
      targetsSetOn: { weight: '2026-10-01' },
    } as unknown as Contest
    const history = [
      makeBodyRecord('2026-09-30', { weight: 70 }),
      makeBodyRecord('2026-10-04', { weight: 64 }),
    ]
    // setOn を使うと baseline 70 で減らす目標（達成）になる。使わなければ baseline 無しで、差の符号（あと 1.0 増）
    expect(progress(history, makeSettings(), [contest])[0]).toMatchObject({
      status: 'increase',
      remaining: 1,
    })
  })
})

describe('規則1 — 対象は「一番近いこれからの大会」だけ', () => {
  const records = [makeBodyRecord('2026-10-01', { weight: 68.2 })]
  const settings = makeSettings({ targetWeight: 65 })

  it('今日が大会当日なら、その大会の目標を使う（今日を含む）', () => {
    const contests = [withTargets(makeContest('今日の大会', '2026-10-05'), { weight: 60 })]
    const [goal] = progress(records, settings, contests)
    expect(goal).toMatchObject({ target: 60, source: 'contest' })
  })

  it('昨日の大会は過ぎているので使わない（base の目標になる）', () => {
    const contests = [withTargets(makeContest('昨日の大会', '2026-10-04'), { weight: 60 })]
    const [goal] = progress(records, settings, contests)
    expect(goal).toMatchObject({ target: 65, source: 'base' })
  })

  it('明日の大会は使う', () => {
    const contests = [withTargets(makeContest('明日の大会', '2026-10-06'), { weight: 60 })]
    expect(progress(records, settings, contests)[0]).toMatchObject({ target: 60, source: 'contest' })
  })

  it('今日の時刻が 23:59 でも、当日の大会は「これから」に入る', () => {
    const contests = [withTargets(makeContest('今日の大会', '2026-10-05'), { weight: 60 })]
    expect(progress(records, settings, contests, localDate(2026, 10, 5, 23, 59, 59))[0]).toMatchObject({
      target: 60,
      source: 'contest',
    })
  })

  it('同じ日の大会が2件なら、登録順で先の1件の目標を使う', () => {
    const contests = [
      withTargets(makeContest('先に登録', '2026-10-20'), { weight: 60 }),
      withTargets(makeContest('後に登録', '2026-10-20'), { weight: 50 }),
    ]
    expect(progress(records, settings, contests)[0]).toMatchObject({ target: 60, source: 'contest' })
  })

  it('同じ日の2件で、登録順を入れ替えると使う目標も入れ替わる', () => {
    const contests = [
      withTargets(makeContest('後に登録', '2026-10-20'), { weight: 50 }),
      withTargets(makeContest('先に登録', '2026-10-20'), { weight: 60 }),
    ]
    expect(progress(records, settings, contests)[0]).toMatchObject({ target: 50, source: 'contest' })
  })

  it('同じ日の先の1件に目標が無ければ、後の1件に目標があっても使わない（base）', () => {
    const contests = [
      makeContest('先に登録（目標なし）', '2026-10-20'),
      withTargets(makeContest('後に登録', '2026-10-20'), { weight: 50 }),
    ]
    expect(progress(records, settings, contests)[0]).toMatchObject({ target: 65, source: 'base' })
  })

  it('配列の並びが遠い順でも、一番近い大会を対象にする', () => {
    const contests = [
      withTargets(makeContest('遠い大会', '2026-12-24'), { weight: 50 }),
      withTargets(makeContest('近い大会', '2026-10-17'), { weight: 60 }),
    ]
    expect(progress(records, settings, contests)[0]).toMatchObject({ target: 60, source: 'contest' })
  })

  it('2件目以降の大会の目標は使わない（一番近い大会に目標が無ければ base）', () => {
    const contests = [
      makeContest('近い大会（目標なし）', '2026-10-17'),
      withTargets(makeContest('次の大会', '2026-11-03'), { weight: 60 }),
    ]
    const goals = progress(records, settings, contests)
    expect(goals).toHaveLength(1)
    expect(goals[0]).toMatchObject({ target: 65, source: 'base' })
  })

  it('一番近い大会に無い項目を、2件目の大会から借りない', () => {
    const contests = [
      withTargets(makeContest('近い大会', '2026-10-17'), { weight: 60 }),
      withTargets(makeContest('次の大会', '2026-11-03'), { bodyFat: 10 }),
    ]
    const withBodyFatRecord = [makeBodyRecord('2026-10-01', { weight: 68.2, bodyFat: 18 })]
    const goals = progress(withBodyFatRecord, makeSettings(), contests)
    expect(metricsOf(goals)).toEqual(['weight'])
  })

  it('過ぎた大会の目標は使わない。これからの大会に目標が無ければ base', () => {
    const contests = [
      withTargets(makeContest('終わった大会', '2026-09-01'), { weight: 50 }),
      makeContest('次の大会（目標なし）', '2026-10-17'),
    ]
    expect(progress(records, settings, contests)[0]).toMatchObject({ target: 65, source: 'base' })
  })

  it('過ぎた大会と、これからの大会の両方に目標があれば、これからの大会の目標を使う', () => {
    const contests = [
      withTargets(makeContest('終わった大会', '2026-09-01'), { weight: 50 }),
      withTargets(makeContest('次の大会', '2026-10-17'), { weight: 60 }),
    ]
    expect(progress(records, settings, contests)[0]).toMatchObject({ target: 60, source: 'contest' })
  })
})

describe('規則2 — 項目ごとに「大会の目標があれば大会、無ければふだん」', () => {
  const records = [makeBodyRecord('2026-10-01', { weight: 68.2, bodyFat: 18, muscleMass: 35 })]

  it('体重は大会・体脂肪率はふだん: source が項目ごとに分かれ、順は weight → bodyFat', () => {
    const settings = makeSettings({ targetWeight: 65, targetBodyFat: 15 })
    const contests = [withTargets(makeContest('大会', '2026-10-20', 'c1'), { weight: 60 })]
    expect(progress(records, settings, contests)).toEqual([
      {
        metric: 'weight',
        current: 68.2,
        target: 60,
        remaining: 8.2,
        status: 'decrease',
        source: 'contest',
        contestId: 'c1',
      },
      { metric: 'bodyFat', current: 18, target: 15, remaining: 3, status: 'decrease', source: 'base' },
    ])
  })

  it('3項目すべてが大会の目標なら、すべて contest（ふだんの目標が無くても返る）', () => {
    const contests = [
      withTargets(makeContest('大会', '2026-10-20'), { weight: 60, bodyFat: 12, muscleMass: 40 }),
    ]
    const goals = progress(records, makeSettings(), contests)
    expect(metricsOf(goals)).toEqual(['weight', 'bodyFat', 'muscleMass'])
    expect(sourcesOf(goals)).toEqual(['contest', 'contest', 'contest'])
    expect(goals.map((goal) => goal.target)).toEqual([60, 12, 40])
  })

  it('大会に目標のある項目はふだんの目標より優先する（65 → 60）', () => {
    const settings = makeSettings({ targetWeight: 65 })
    const contests = [withTargets(makeContest('大会', '2026-10-20'), { weight: 60 })]
    const goals = progress(records, settings, contests)
    expect(goals).toHaveLength(1)
    expect(goals[0].target).toBe(60)
  })

  it('大会は筋肉量だけ・ふだんは体重だけ: weight(base) → muscleMass(contest) の順で返る', () => {
    const settings = makeSettings({ targetWeight: 65 })
    const contests = [withTargets(makeContest('大会', '2026-10-20'), { muscleMass: 40 })]
    const goals = progress(records, settings, contests)
    expect(metricsOf(goals)).toEqual(['weight', 'muscleMass'])
    expect(sourcesOf(goals)).toEqual(['base', 'contest'])
  })

  it('targets の書かれた順が逆でも、返す順は weight → bodyFat → muscleMass', () => {
    const contests = [
      withTargets(makeContest('大会', '2026-10-20'), { muscleMass: 40, bodyFat: 12, weight: 60 }),
    ]
    expect(metricsOf(progress(records, makeSettings(), contests))).toEqual([
      'weight',
      'bodyFat',
      'muscleMass',
    ])
  })

  it('どちらにも目標が無い項目は返さない', () => {
    const settings = makeSettings({ targetBodyFat: 15 })
    const contests = [withTargets(makeContest('大会', '2026-10-20'), { weight: 60 })]
    expect(metricsOf(progress(records, settings, contests))).toEqual(['weight', 'bodyFat'])
  })

  it('大会の目標がある項目でも、その項目の現在値が無ければ返さない', () => {
    const weightOnly = [makeBodyRecord('2026-10-01', { weight: 68.2 })]
    const contests = [withTargets(makeContest('大会', '2026-10-20'), { weight: 60, bodyFat: 12 })]
    expect(metricsOf(progress(weightOnly, makeSettings(), contests))).toEqual(['weight'])
  })

  it('ふだんの目標の項目も、現在値が無ければ返さない', () => {
    const weightOnly = [makeBodyRecord('2026-10-01', { weight: 68.2 })]
    const settings = makeSettings({ targetBodyFat: 15 })
    const contests = [withTargets(makeContest('大会', '2026-10-20'), { weight: 60 })]
    expect(metricsOf(progress(weightOnly, settings, contests))).toEqual(['weight'])
  })

  it('大会の目標を使っても、現在値は今までと同じ（その項目が入っている一番新しい日）', () => {
    const history = [
      makeBodyRecord('2026-10-01', { weight: 70 }),
      makeBodyRecord('2026-10-03', { weight: null, bodyFat: 19 }),
    ]
    const contests = [withTargets(makeContest('大会', '2026-10-20'), { weight: 60 })]
    expect(progress(history, makeSettings(), contests)[0].current).toBe(70)
  })
})

describe('規則4 — 現在値・丸め・達成・remaining は今までと同じ', () => {
  /** 起点を「10/01 に 70 kg」にして、減らす目標にしたい形をつくる */
  function decreasing(target: number, current: number): GoalProgress {
    const history = [
      makeBodyRecord('2026-10-01', { weight: 70 }),
      makeBodyRecord('2026-10-04', { weight: current }),
    ]
    const contests = [weightContest('大会', '2026-10-20', target, origin('2026-10-01', 70), 'c1')]
    return progress(history, makeSettings(), contests)[0]
  }

  it('残りは 小数1桁（68.24 → 65 は 3.2）で、浮動小数点の誤差を出さない', () => {
    expect(decreasing(65, 68.24)).toEqual({
      metric: 'weight',
      current: 68.2,
      target: 65,
      remaining: 3.2,
      status: 'decrease',
      source: 'contest',
      contestId: 'c1',
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
    const contests = [weightContest('大会', '2026-10-20', 75, origin('2026-10-01', 70))]
    const at = (current: number) =>
      progress([makeBodyRecord('2026-10-04', { weight: current })], makeSettings(), contests)[0]
    expect(at(72.4)).toMatchObject({ status: 'increase', remaining: 2.6 })
    expect(at(75)).toMatchObject({ status: 'achieved', remaining: 0 })
    expect(at(76)).toMatchObject({ status: 'achieved', remaining: 0 })
  })

  it('remaining は常に 0 以上（achieved のときも負にならない）', () => {
    expect(decreasing(65, 50).remaining).toBe(0)
  })
})

describe('規則5-3 — (b) 前の大会が無いとき: baseline は origin.value（履歴は見ない）', () => {
  const settings = makeSettings()

  describe('例A（目標が先・記録が後、または同じ日に記録し直す）', () => {
    it('10/01 に目標 65（そのときの値 68.2）→ 10/03 に 68.2 を記録: baseline 68.2 の減らす目標「あと 3.2」', () => {
      const contests = [weightContest('大会', '2026-10-20', 65, origin('2026-10-01', 68.2), 'c1')]
      const history = [makeBodyRecord('2026-10-03', { weight: 68.2 })]
      expect(progress(history, settings, contests)).toEqual([
        {
          metric: 'weight',
          current: 68.2,
          target: 65,
          remaining: 3.2,
          status: 'decrease',
          source: 'contest',
          contestId: 'c1',
        },
      ])
    })

    it('履歴は見ない: 起点の日の記録が 60 でも、origin.value の 68.2 で向きを決める', () => {
      const contests = [weightContest('大会', '2026-10-20', 65, origin('2026-10-01', 68.2))]
      const history = [
        makeBodyRecord('2026-10-01', { weight: 60 }),
        makeBodyRecord('2026-10-04', { weight: 68.2 }),
      ]
      // 履歴の 60 を baseline にすると増やす目標になる
      expect(progress(history, settings, contests)[0]).toMatchObject({ status: 'decrease', remaining: 3.2 })
    })

    it('再現1: 今日 68.3 kg で目標 68 を入れ、同じ日の記録を 67.9 に直す → achieved（その後 67.5 でも achieved）', () => {
      const contests = [weightContest('大会', '2026-10-20', 68, origin('2026-10-05', 68.3))]
      const sameDay = [makeBodyRecord('2026-10-05', { weight: 67.9 })]
      // 履歴から「起点の日以前の最新値」を引くと 67.9 < 68 で増やす目標になり、「あと 0.1 kg 増」と出てしまう
      expect(progress(sameDay, settings, contests, TODAY)[0]).toMatchObject({
        current: 67.9,
        status: 'achieved',
        remaining: 0,
      })

      const nextDay = [
        makeBodyRecord('2026-10-05', { weight: 67.9 }),
        makeBodyRecord('2026-10-06', { weight: 67.5 }),
      ]
      expect(progress(nextDay, settings, contests, localDate(2026, 10, 6))[0]).toMatchObject({
        current: 67.5,
        status: 'achieved',
        remaining: 0,
      })
    })

    it('目標を入れたあとに体重が増えても減らす目標のまま（あと 5.0）', () => {
      const contests = [weightContest('大会', '2026-10-20', 65, origin('2026-10-01', 68.2))]
      const history = [
        makeBodyRecord('2026-10-03', { weight: 68.2 }),
        makeBodyRecord('2026-10-04', { weight: 70 }),
      ]
      expect(progress(history, settings, contests)[0]).toMatchObject({ status: 'decrease', remaining: 5 })
    })

    it('目標を超えたら achieved（baseline は目標を入れたときの 68.2 のまま）', () => {
      const contests = [weightContest('大会', '2026-10-20', 65, origin('2026-10-01', 68.2))]
      const history = [
        makeBodyRecord('2026-10-03', { weight: 68.2 }),
        makeBodyRecord('2026-10-04', { weight: 64.5 }),
      ]
      expect(progress(history, settings, contests)[0]).toMatchObject({
        current: 64.5,
        status: 'achieved',
        remaining: 0,
      })
    })
  })

  describe('向きの決まり方', () => {
    const history = [makeBodyRecord('2026-10-04', { weight: 60.5 })]

    it('増やす目標（バルクアップ）: baseline 60 → 目標 65、現在 60.5 は「あと 4.5 増」', () => {
      const contests = [weightContest('大会', '2026-10-20', 65, origin('2026-10-01', 60))]
      expect(progress(history, settings, contests)[0]).toMatchObject({ status: 'increase', remaining: 4.5 })
    })

    it('増やす目標で、目標を入れたあとに体重が減っても「増やす」のまま（あと 7.0）', () => {
      const contests = [weightContest('大会', '2026-10-20', 65, origin('2026-10-01', 60))]
      expect(progress([makeBodyRecord('2026-10-04', { weight: 58 })], settings, contests)[0]).toMatchObject({
        status: 'increase',
        remaining: 7,
      })
    })

    it('origin.date は向きの決定に使わない（前の大会が無いとき、日付が何でも結果は同じ）', () => {
      const results = ['2000-01-01', '2026-10-01', '2026-12-31', '2999-12-31'].map((date) =>
        progress(history, settings, [weightContest('大会', '2026-10-20', 65, origin(date, 60), 'c1')]),
      )
      for (const result of results) expect(result).toEqual(results[0])
      expect(results[0][0]).toMatchObject({ status: 'increase', remaining: 4.5 })
    })

    it('baseline が目標と同じ（小数1桁）なら向きを決められず、差の符号に従う（65.04 → 目標 65）', () => {
      const contests = [weightContest('大会', '2026-10-20', 65, origin('2026-10-01', 65.04))]
      expect(progress([makeBodyRecord('2026-10-04', { weight: 66 })], settings, contests)[0]).toMatchObject({
        status: 'decrease',
        remaining: 1,
      })
      expect(progress([makeBodyRecord('2026-10-04', { weight: 64 })], settings, contests)[0]).toMatchObject({
        status: 'increase',
        remaining: 1,
      })
    })

    it('baseline が丸めて 0.1 違えば（65.1 vs 65）向きが決まる: 減らす（64.5 は達成）', () => {
      const contests = [weightContest('大会', '2026-10-20', 65, origin('2026-10-01', 65.1))]
      // 符号だけなら「あと 0.5 増」になる
      expect(progress([makeBodyRecord('2026-10-04', { weight: 64.5 })], settings, contests)[0]).toMatchObject({
        status: 'achieved',
      })
    })
  })

  describe('起点に値が無い・起点が無い（記録より先に目標を入れた）: baseline 無しで差の符号', () => {
    it.each([
      ['origin に value が無い', origin('2026-10-01')],
      ['origin が無い', undefined],
    ])('%s: 現在値 68 > 目標 65 は「あと 3.0 減」', (_label, weightOrigin) => {
      const contests = [weightContest('大会', '2026-10-20', 65, weightOrigin)]
      expect(progress([makeBodyRecord('2026-10-04', { weight: 68 })], settings, contests)[0]).toMatchObject({
        status: 'decrease',
        remaining: 3,
      })
    })

    it.each([
      ['origin に value が無い', origin('2026-10-01')],
      ['origin が無い', undefined],
    ])('%s: 現在値 62 < 目標 65 は「あと 3.0 増」、ちょうどなら達成', (_label, weightOrigin) => {
      const contests = [weightContest('大会', '2026-10-20', 65, weightOrigin)]
      expect(progress([makeBodyRecord('2026-10-04', { weight: 62 })], settings, contests)[0]).toMatchObject({
        status: 'increase',
        remaining: 3,
      })
      expect(progress([makeBodyRecord('2026-10-04', { weight: 65 })], settings, contests)[0]).toMatchObject({
        status: 'achieved',
        remaining: 0,
      })
    })

    it('履歴に起点の日以前の記録があっても、origin に value が無ければ履歴は使わない', () => {
      const contests = [weightContest('大会', '2026-10-20', 65, origin('2026-10-05'))]
      const history = [
        makeBodyRecord('2026-10-01', { weight: 60 }),
        makeBodyRecord('2026-10-04', { weight: 68 }),
      ]
      // 履歴の 60 を baseline にすると増やす目標になる
      expect(progress(history, settings, contests)[0]).toMatchObject({ status: 'decrease', remaining: 3 })
    })
  })

  describe('筋肉量・項目ごと', () => {
    it('筋肉量の origin.value は kg。単位が % の記録の現在値（体重 × % / 100）と同じ kg どうしで比べる', () => {
      const percentSettings = makeSettings({ muscleMassUnit: '%' })
      const contest = withTargets(
        makeContest('大会', '2026-10-20'),
        { muscleMass: 30 },
        { muscleMass: origin('2026-10-01', 28) },
      )
      const history = [makeBodyRecord('2026-10-04', { weight: 70, muscleMass: 41 })]
      expect(progress(history, percentSettings, [contest])[0]).toMatchObject({
        metric: 'muscleMass',
        current: 28.7,
        target: 30,
        remaining: 1.3,
        status: 'increase',
        source: 'contest',
      })
    })

    it('項目ごとに origin が別: 体重は減らす・体脂肪率は増やす', () => {
      const contest = withTargets(
        makeContest('大会', '2026-10-20'),
        { weight: 66, bodyFat: 18 },
        { weight: origin('2026-10-01', 68), bodyFat: origin('2026-10-01', 17) },
      )
      const history = [makeBodyRecord('2026-10-04', { weight: 66.5, bodyFat: 17.5 })]
      const [weight, bodyFat] = progress(history, settings, [contest])
      expect(weight).toMatchObject({ metric: 'weight', status: 'decrease', remaining: 0.5 })
      expect(bodyFat).toMatchObject({ metric: 'bodyFat', status: 'increase', remaining: 0.5 })
    })

    it('大会の目標のときは settings.goalBaselines を使わない（goalBaselines が 70 でも、大会の baseline 60 で増やす目標）', () => {
      const withBaselines = makeSettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
      const contests = [weightContest('大会', '2026-10-20', 64, origin('2026-10-01', 60))]
      expect(progress([makeBodyRecord('2026-10-04', { weight: 61 })], withBaselines, contests)[0]).toMatchObject({
        target: 64,
        status: 'increase',
        remaining: 3,
        source: 'contest',
      })
    })
  })

  describe('前の大会に数えないもの（5-1）', () => {
    it('目標を持たない予定は前の大会に数えない（数えると履歴で「あと 0.5 増」になってしまう）', () => {
      const plan = makeContest('目標なしの予定', '2026-09-20')
      const next = weightContest('大会B', '2026-12-01', 66, origin('2026-09-01', 68), 'b')
      const history = [
        makeBodyRecord('2026-09-01', { weight: 68 }),
        makeBodyRecord('2026-09-20', { weight: 65.5 }),
      ]
      // 前の大会は無い → (b) baseline 68 > 66 の減らす目標で、65.5 は達成
      expect(progress(history, settings, [plan, next])[0]).toMatchObject({
        current: 65.5,
        status: 'achieved',
        remaining: 0,
      })
    })

    it('targets が空・壊れている（0）大会も、目標を持たない予定と同じ', () => {
      const plan = { ...makeContest('壊れた目標', '2026-09-20'), targets: { weight: 0 } } as Contest
      const next = weightContest('大会B', '2026-12-01', 66, origin('2026-09-01', 68))
      const history = [
        makeBodyRecord('2026-09-01', { weight: 68 }),
        makeBodyRecord('2026-09-20', { weight: 65.5 }),
      ]
      expect(progress(history, settings, [plan, next])[0].status).toBe('achieved')
    })

    it('別の項目の目標だけを持つ大会は、この項目の前の大会ではない（体脂肪率だけの大会は、体重の起点にならない）', () => {
      const bodyFatOnly = withTargets(makeContest('体脂肪率だけ', '2026-09-20'), { bodyFat: 15 })
      const next = weightContest('大会B', '2026-12-01', 66, origin('2026-09-01', 68))
      const history = [
        makeBodyRecord('2026-09-01', { weight: 68 }),
        makeBodyRecord('2026-09-20', { weight: 65.5 }),
      ]
      expect(progress(history, settings, [bodyFatOnly, next])[0].status).toBe('achieved')
    })

    it('体重の目標だけを持つ前の大会は、体脂肪率の起点にならない（項目ごと）', () => {
      const previous = withTargets(makeContest('前の大会', '2026-10-10'), { weight: 62 })
      const next = withTargets(
        makeContest('次の大会', '2026-11-20'),
        { weight: 66, bodyFat: 18 },
        { weight: origin('2026-09-01', 68), bodyFat: origin('2026-09-01', 17) },
      )
      const history = [
        makeBodyRecord('2026-09-01', { weight: 68, bodyFat: 17 }),
        makeBodyRecord('2026-10-10', { weight: 62, bodyFat: 21 }),
        makeBodyRecord('2026-10-14', { weight: 62.3, bodyFat: 21.5 }),
      ]
      const [weight, bodyFat] = progress(history, settings, [previous, next], localDate(2026, 10, 15))
      // 体重は前の大会 10/10 を起点にする（5-2）。体脂肪率は前の大会が無いので origin.value の 17 → 18 は増やす目標で、21.5 は達成
      expect(weight).toMatchObject({ metric: 'weight', status: 'increase', remaining: 3.7 })
      // 体重の前の大会を体脂肪率の起点にしてしまうと、履歴の 21 から 18 への「あと 3.5 減」になる
      expect(bodyFat).toMatchObject({ metric: 'bodyFat', status: 'achieved', remaining: 0 })
    })

    it('同じ日の大会は前の大会に数えない（同日の別の大会を起点にしない）', () => {
      const earlier = weightContest('十日の大会', '2026-10-10', 62)
      const sameDayFirst = weightContest('同日・先', '2026-10-20', 62.1)
      const sameDaySecond = weightContest('同日・後', '2026-10-20', 50)
      const history = [
        makeBodyRecord('2026-10-10', { weight: 62 }),
        makeBodyRecord('2026-10-14', { weight: 62.3 }),
      ]
      const today = localDate(2026, 10, 15) // 10/10 の大会は過ぎている
      // 前の大会は 10/10 → 履歴の 62 < 62.1 の増やす目標で、62.3 は達成。
      // 同日を前の大会に数えると起点が 10/20 になり、履歴の最新 62.3 > 62.1 で「あと 0.2 減」になる
      expect(progress(history, settings, [earlier, sameDayFirst, sameDaySecond], today)[0]).toMatchObject({
        current: 62.3,
        status: 'achieved',
        remaining: 0,
      })
    })

    it('これより後ろの大会（日付が後）があっても結果は変わらない（前の大会に数えない）', () => {
      const target = weightContest('今回の大会', '2026-10-20', 65)
      const later = weightContest('もっと先の大会', '2026-11-30', 60)
      const history = [
        makeBodyRecord('2026-10-04', { weight: 68 }),
        makeBodyRecord('2026-10-05', { weight: 68 }),
      ]
      expect(progress(history, settings, [target, later])).toEqual(progress(history, settings, [target]))
    })
  })
})

describe('規則5-2 — (a) 前の大会があり、origin が無い・origin より後のとき: baseline は履歴から', () => {
  const settings = makeSettings()

  describe('例B（大会が切り替わる）', () => {
    const previous = weightContest('大会X', '2026-10-10', 62)
    const next = weightContest('大会Y', '2026-11-20', 66, origin('2026-09-01', 68), 'y')
    const history = [
      makeBodyRecord('2026-09-01', { weight: 68 }),
      makeBodyRecord('2026-10-10', { weight: 62 }),
      makeBodyRecord('2026-10-15', { weight: 62.3 }),
    ]
    const today = localDate(2026, 10, 15)

    it('今日 10/15: 一番近いのは Y。前の大会 X の日 10/10 > origin.date 9/01 なので履歴から baseline 62 → 増やす目標「あと 3.7 増」', () => {
      expect(progress(history, settings, [previous, next], today)).toEqual([
        {
          metric: 'weight',
          current: 62.3,
          target: 66,
          remaining: 3.7,
          status: 'increase',
          source: 'contest',
          contestId: 'y',
        },
      ])
    })

    it('origin（9/01 に 68）だけで決めていたら 68→66 で減らす目標になる。それを避けて「達成」と誤らない', () => {
      const [goal] = progress(history, settings, [previous, next], today)
      expect(goal.status).not.toBe('achieved')
      expect(goal.status).toBe('increase')
    })

    it('配列の並びが Y → X でも同じ結果（前の大会は日付で決める）', () => {
      expect(progress(history, settings, [next, previous], today)).toEqual(
        progress(history, settings, [previous, next], today),
      )
    })

    it('Y の目標を超えたら achieved になる', () => {
      const reached = [...history, makeBodyRecord('2026-10-20', { weight: 66.4 })]
      expect(progress(reached, settings, [previous, next], localDate(2026, 10, 21))[0]).toMatchObject({
        status: 'achieved',
        remaining: 0,
      })
    })
  })

  describe('origin が無い・value が無いとき、履歴から baseline を引く', () => {
    const previous = weightContest('前の大会', '2026-10-01', 62)
    const history = [
      makeBodyRecord('2026-09-25', { weight: 70 }),
      makeBodyRecord('2026-10-01', { weight: 62 }),
      makeBodyRecord('2026-10-03', { weight: 62.5 }),
    ]

    it('origin が無い: 前の大会の日ちょうどの記録 62 が baseline（増やす目標）で、62.5 は達成', () => {
      const next = weightContest('次の大会', '2026-10-20', 62.2)
      // 差の符号なら current 62.5 > 62.2 で「あと 0.3 減」になる
      expect(progress(history, settings, [previous, next])[0]).toMatchObject({
        status: 'achieved',
        remaining: 0,
      })
    })

    it('origin に value が無く、前の大会の日 > origin.date: 履歴から引く', () => {
      const next = weightContest('次の大会', '2026-10-20', 62.2, origin('2026-09-01'))
      expect(progress(history, settings, [previous, next])[0].status).toBe('achieved')
    })

    it('前の大会の日以前で一番新しい記録を使う（9/20 の 60 ではなく 9/30 の 70）', () => {
      const next = weightContest('次の大会', '2026-10-20', 67.5)
      const records = [
        makeBodyRecord('2026-09-20', { weight: 60 }),
        makeBodyRecord('2026-09-30', { weight: 70 }),
        makeBodyRecord('2026-10-04', { weight: 69 }),
      ]
      // baseline 70 > 67.5 の減らす目標。9/20 の 60 だと増やす目標になる
      expect(progress(records, settings, [previous, next])[0]).toMatchObject({ status: 'decrease', remaining: 1.5 })
    })

    it('前の大会の日以前に記録が無ければ、後で一番古い記録を使う（配列が新しい順でも）', () => {
      const next = weightContest('次の大会', '2026-10-20', 65.5)
      const records = [
        makeBodyRecord('2026-10-04', { weight: 65 }),
        makeBodyRecord('2026-10-03', { weight: 66 }),
      ]
      // baseline 66 > 65.5 の減らす目標で、65 は達成。差の符号なら「あと 0.5 増」
      expect(progress(records, settings, [previous, next])[0]).toMatchObject({ status: 'achieved' })
    })

    it('前の大会の日にその項目が入っていなければ、さらに前の入っている日が baseline（null の日は飛ばす）', () => {
      const next = weightContest('次の大会', '2026-10-20', 67.5)
      const records = [
        makeBodyRecord('2026-09-28', { weight: 70 }),
        makeBodyRecord('2026-10-01', { weight: null, bodyFat: 20 }),
        makeBodyRecord('2026-10-04', { weight: 69 }),
      ]
      expect(progress(records, settings, [previous, next])[0]).toMatchObject({ status: 'decrease', remaining: 1.5 })
    })

    it('筋肉量（単位 %）: 前の大会の日に体重が無ければその日は換算できず、さらに前の換算値（28kg）を使う', () => {
      const percentSettings = makeSettings({ muscleMassUnit: '%' })
      const previousMuscle = withTargets(makeContest('前の大会', '2026-10-01'), { muscleMass: 29 })
      const next = withTargets(makeContest('次の大会', '2026-10-20'), { muscleMass: 30 })
      const records = [
        makeBodyRecord('2026-09-28', { weight: 70, muscleMass: 40 }), // 28kg
        makeBodyRecord('2026-10-01', { weight: null, muscleMass: 50 }), // 体重が無いので換算できない
        makeBodyRecord('2026-10-04', { weight: 70, muscleMass: 41 }), // 28.7kg
      ]
      // baseline 28 < 30 の増やす目標。% のまま（50）を baseline にすると減らす目標になる
      expect(progress(records, percentSettings, [previousMuscle, next])[0]).toMatchObject({
        status: 'increase',
        remaining: 1.3,
      })
    })
  })

  describe('前の大会の日と origin.date の境目（> なら (a)、<= なら (b)）', () => {
    const previous = weightContest('前の大会', '2026-10-10', 62)
    const history = [
      makeBodyRecord('2026-10-10', { weight: 62 }),
      makeBodyRecord('2026-10-12', { weight: 67 }),
      makeBodyRecord('2026-10-14', { weight: 62.3 }),
    ]
    const today = localDate(2026, 10, 15)

    it('origin.date が前の大会の日の1日前 → (a): 履歴の 62 が baseline で、あと 3.7 増（origin.value の 70 は使わない）', () => {
      const next = weightContest('次の大会', '2026-11-20', 66, origin('2026-10-09', 70))
      expect(progress(history, settings, [previous, next], today)[0]).toMatchObject({
        status: 'increase',
        remaining: 3.7,
      })
    })

    it('origin.date が前の大会の日と同じ → (b): origin.value の 70 が baseline で、62.3 は達成', () => {
      const next = weightContest('次の大会', '2026-11-20', 66, origin('2026-10-10', 70))
      expect(progress(history, settings, [previous, next], today)[0]).toMatchObject({
        status: 'achieved',
        remaining: 0,
      })
    })

    it('origin.date が前の大会の日の1日後 → (b)', () => {
      const next = weightContest('次の大会', '2026-11-20', 66, origin('2026-10-11', 70))
      expect(progress(history, settings, [previous, next], today)[0]).toMatchObject({ status: 'achieved' })
    })

    it('大会が切り替わったあとに目標を変えた（origin.date >= 前の大会の日）: origin.value を使う（67 → 66 は減らす、66.5 は「あと 0.5 減」）', () => {
      const next = weightContest('次の大会', '2026-11-20', 66, origin('2026-10-12', 67))
      const records = [
        makeBodyRecord('2026-10-10', { weight: 62 }),
        makeBodyRecord('2026-10-12', { weight: 67 }),
        makeBodyRecord('2026-10-14', { weight: 66.5 }),
      ]
      // 履歴の 62 を baseline にすると増やす目標になり、66.5 は「達成」と誤る
      expect(progress(records, settings, [previous, next], today)[0]).toMatchObject({
        status: 'decrease',
        remaining: 0.5,
      })
    })

    it('origin に value が無く、前の大会の日 <= origin.date → (b): baseline 無しで差の符号', () => {
      const next = weightContest('次の大会', '2026-11-20', 66, origin('2026-10-12'))
      // 履歴の 62 を baseline にすると増やす目標（66.5 は達成）。差の符号なら「あと 0.5 減」
      const records = [
        makeBodyRecord('2026-10-10', { weight: 62 }),
        makeBodyRecord('2026-10-14', { weight: 66.5 }),
      ]
      expect(progress(records, settings, [previous, next], today)[0]).toMatchObject({
        status: 'decrease',
        remaining: 0.5,
      })
    })
  })

  describe('前の大会 = 同じ項目の目標を持つ大会のうち、一番遅い日（5-1）', () => {
    const today = localDate(2026, 10, 15)
    const records = [
      makeBodyRecord('2026-09-01', { weight: 70 }),
      makeBodyRecord('2026-10-01', { weight: 64 }),
      makeBodyRecord('2026-10-04', { weight: 64.3 }),
    ]

    it('一番前の大会ではなく、一番遅い前の大会の日を使う', () => {
      const first = weightContest('一番前', '2026-09-01', 70)
      const second = weightContest('二番目', '2026-10-01', 64)
      const target = weightContest('今回の大会', '2026-10-20', 64.2)
      // 起点 10/01 → baseline 64 < 64.2 の増やす目標で、64.3 は達成。9/01 の 70 を使うと「あと 0.1 減」になる
      expect(progress(records, settings, [first, second, target], today)[0]).toMatchObject({ status: 'achieved' })
    })

    it('配列の並びではなく日付で決める（先頭が一番新しい大会でも）', () => {
      const first = weightContest('一番前', '2026-09-01', 70)
      const second = weightContest('二番目', '2026-10-01', 64)
      const target = weightContest('今回の大会', '2026-10-20', 64.2)
      expect(progress(records, settings, [target, second, first], today)[0].status).toBe('achieved')
    })

    it('もっと遅い日でも、この項目の目標を持たない大会は飛ばして、目標を持つ 10/01 を使う', () => {
      const first = weightContest('一番前', '2026-09-01', 70)
      const second = weightContest('二番目', '2026-10-01', 64)
      const bodyFatOnly = withTargets(makeContest('体脂肪率だけ', '2026-10-10'), { bodyFat: 15 })
      const target = weightContest('今回の大会', '2026-10-20', 64.2)
      // 10/10 を前の大会に数えると履歴の最新 64.3 > 64.2 で「あと 0.1 減」になる
      expect(progress(records, settings, [first, second, bodyFatOnly, target], today)[0]).toMatchObject({
        status: 'achieved',
      })
    })
  })

  it('項目ごとに前の大会が別（体重の前の大会は 10/10、体脂肪率の前の大会は 9/20）', () => {
    const weightPrevious = withTargets(makeContest('体重の大会', '2026-10-10'), { weight: 62 })
    const bodyFatPrevious = withTargets(makeContest('体脂肪率の大会', '2026-09-20'), { bodyFat: 21 })
    const next = withTargets(makeContest('次の大会', '2026-11-20'), { weight: 66, bodyFat: 18 })
    const records = [
      makeBodyRecord('2026-09-20', { weight: 68, bodyFat: 17 }),
      makeBodyRecord('2026-10-10', { weight: 62, bodyFat: 22 }),
      makeBodyRecord('2026-10-14', { weight: 62.3, bodyFat: 17.5 }),
    ]
    const [weight, bodyFat] = progress(records, settings, [weightPrevious, bodyFatPrevious, next], localDate(2026, 10, 15))
    // 体重: 起点 10/10 → baseline 62 → 増やす。体脂肪率: 起点 9/20 → baseline 17 → 増やす（22 の 10/10 は起点ではない）
    expect(weight).toMatchObject({ status: 'increase', remaining: 3.7 })
    expect(bodyFat).toMatchObject({ status: 'increase', remaining: 0.5 })
  })
})

describe('規則6 — 向き（ふだんの目標のとき）は今までどおり settings.goalBaselines', () => {
  it('大会が体脂肪率だけ持つとき、体重（ふだん）は goalBaselines で向きを決める（70 → 65 の減らす目標で 64.5 は達成）', () => {
    const settings = makeSettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    const contests = [
      withTargets(makeContest('大会', '2026-10-20'), { bodyFat: 12 }, { bodyFat: origin('2026-10-01', 18) }),
    ]
    const records = [makeBodyRecord('2026-10-04', { weight: 64.5, bodyFat: 18 })]
    const [weight] = progress(records, settings, contests)
    expect(weight).toMatchObject({ metric: 'weight', source: 'base', status: 'achieved', remaining: 0 })
  })

  it('goalBaselines が無ければ、ふだんの目標は現在値と目標の差の符号（大会の origin は使わない）', () => {
    const settings = makeSettings({ targetWeight: 65 })
    const contests = [
      withTargets(makeContest('大会', '2026-10-20'), { bodyFat: 12 }, { bodyFat: origin('2026-10-01', 18) }),
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
    const contests = [withTargets(makeContest('大会', '2026-10-20'), { bodyFat: 12 })]
    const records = [makeBodyRecord('2026-10-04', { weight: 68, bodyFat: 18 })]
    expect(() => progress(records, settings, contests)).not.toThrow()
    expect(progress(records, settings, contests)[0]).toMatchObject({ source: 'base', status: 'decrease' })
  })
})

describe('規則7 — GoalProgress.contestId', () => {
  const records = [makeBodyRecord('2026-10-04', { weight: 68.2, bodyFat: 20 })]

  it('大会の目標の項目には、その大会の id が入る', () => {
    const contests = [weightContest('大会', '2026-10-20', 65, undefined, 'nearest')]
    expect(progress(records, makeSettings(), contests)[0]).toMatchObject({ source: 'contest', contestId: 'nearest' })
  })

  it('一番近い大会の id になる（2件目以降の id ではない）', () => {
    const contests = [
      weightContest('遠い大会', '2026-12-24', 60, undefined, 'far'),
      weightContest('近い大会', '2026-10-17', 65, undefined, 'near'),
    ]
    expect(progress(records, makeSettings(), contests)[0].contestId).toBe('near')
  })

  it('ふだんの目標の項目（source: base）には contestId が無い', () => {
    const settings = makeSettings({ targetBodyFat: 15 })
    const contests = [weightContest('大会', '2026-10-20', 65, undefined, 'c1')]
    const [weight, bodyFat] = progress(records, settings, contests)
    expect(weight.contestId).toBe('c1')
    expect(bodyFat).toMatchObject({ metric: 'bodyFat', source: 'base' })
    expect(bodyFat.contestId).toBeUndefined()
  })

  it('options なし・対象の大会が無い結果では、どの項目にも contestId が無い', () => {
    const settings = makeSettings({ targetWeight: 65 })
    expect(calcGoalProgress(records, settings).every((goal) => goal.contestId === undefined)).toBe(true)
    expect(progress(records, settings, []).every((goal) => goal.contestId === undefined)).toBe(true)
  })

  it('一番近い大会が切り替わると、contestId も切り替わる', () => {
    const contests = [
      weightContest('一つ目', '2026-10-10', 65, undefined, 'first'),
      weightContest('二つ目', '2026-11-20', 66, undefined, 'second'),
    ]
    expect(progress(records, makeSettings(), contests, localDate(2026, 10, 5))[0].contestId).toBe('first')
    expect(progress(records, makeSettings(), contests, localDate(2026, 10, 11))[0].contestId).toBe('second')
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
    const contest = { ...makeContest('大会', '2026-10-20'), targets: broken } as unknown as Contest
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
      ...makeContest('大会', '2026-10-20'),
      targets: { weight: broken },
    } as unknown as Contest
    expect(progress(records, settings, [contest])[0]).toMatchObject({ target: 65, source: 'base' })
  })

  it('1つの項目が壊れていても、ほかの項目の大会の目標は使う', () => {
    const contest = {
      ...makeContest('大会', '2026-10-20'),
      targets: { weight: 'x', bodyFat: 12 },
    } as unknown as Contest
    expect(progress(records, settings, [contest])).toEqual([
      expect.objectContaining({ metric: 'weight', source: 'base', target: 65 }),
      expect.objectContaining({ metric: 'bodyFat', source: 'contest', target: 12 }),
    ])
  })

  it('targets の未知のキーは無視する（waist など）', () => {
    const contest = {
      ...makeContest('大会', '2026-10-20'),
      targets: { waist: 70, weight: 60 },
    } as unknown as Contest
    const goals = progress(records, settings, [contest])
    expect(metricsOf(goals)).toEqual(['weight'])
    expect(goals[0]).toMatchObject({ target: 60, source: 'contest' })
  })

  describe('targetOrigins が壊れていても落ちない（無いのと同じ扱い）', () => {
    const previousContest = weightContest('前の大会', '2026-09-01', 62)
    const brokenRecords = [
      makeBodyRecord('2026-08-25', { weight: 70 }),
      makeBodyRecord('2026-09-01', { weight: 65 }),
      makeBodyRecord('2026-09-20', { weight: 67 }),
      makeBodyRecord('2026-10-03', { weight: 65.5 }),
    ]

    function withBrokenOrigins(broken: unknown): Contest {
      return {
        ...weightContest('次の大会', '2026-10-20', 65.2),
        targetOrigins: broken,
      } as unknown as Contest
    }

    it.each([
      ['null', null],
      ['文字列', 'broken'],
      ['数値', 42],
      ['配列', [{ date: '2026-10-01', value: 70 }]],
      ['項目が文字列', { weight: '2026-10-01' }],
      ['項目が null', { weight: null }],
    ])('targetOrigins が %s なら、前の大会の日の履歴で決める（9/01 の 65 → 増やす目標で、65.5 は達成）', (_label, broken) => {
      expect(() => progress(brokenRecords, makeSettings(), [previousContest, withBrokenOrigins(broken)])).not.toThrow()
      expect(progress(brokenRecords, makeSettings(), [previousContest, withBrokenOrigins(broken)])[0]).toMatchObject({
        status: 'achieved',
      })
    })

    it.each([
      ['存在しない日', '2026-09-31'],
      ['ゼロ埋めなし', '2026-10-1'],
      ['年が範囲外（3000 年）', '3000-01-01'],
      ['月も日も範囲外', '9999-99-99'],
      ['日付でない文字', 'あした'],
    ])('origin.date が壊れている（%s）なら、その origin は使わず履歴で決める', (_label, brokenDate) => {
      // 壊れた日付を起点に使うと、前の大会の日（9/01）より後と見て (b) の value 70 で「減らす目標」になってしまう
      const next = withBrokenOrigins({ weight: { date: brokenDate, value: 70 } })
      expect(progress(brokenRecords, makeSettings(), [previousContest, next])[0]).toMatchObject({
        status: 'achieved',
      })
    })

    it.each([
      ['NaN', NaN],
      ['Infinity', Infinity],
      ['文字列', '70'],
      ['null', null],
    ])('origin.value が %s なら、value が無い起点として扱う（(b) では baseline 無しで差の符号）', (_label, brokenValue) => {
      const next = withBrokenOrigins({ weight: { date: '2026-10-01', value: brokenValue } })
      // 前の大会の日 9/01 <= origin.date 10/01 → (b)。value が使えなければ差の符号（65.5 > 65.2 で「あと 0.3 減」）
      expect(progress(brokenRecords, makeSettings(), [previousContest, next])[0]).toMatchObject({
        status: 'decrease',
        remaining: 0.3,
      })
    })
  })

  it('渡した records・settings・contests を書き換えない（凍結しても例外にならない）', () => {
    const contests = deepFreeze([
      weightContest('前の大会', '2026-10-01', 62),
      weightContest('大会', '2026-10-20', 60, origin('2026-10-02', 68)),
    ])
    expect(() =>
      progress(deepFreeze([...records]), deepFreeze(makeSettings({ targetWeight: 65 })), contests),
    ).not.toThrow()
  })

  it('同じ入力なら何度呼んでも同じ結果（今日の時刻に依存せず、today だけに従う）', () => {
    const contests = [withTargets(makeContest('大会', '2026-10-20'), { weight: 60 })]
    expect(progress(records, settings, contests)).toEqual(progress(records, settings, contests))
  })
})

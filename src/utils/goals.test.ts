import { describe, it, expect } from 'vitest'
import { calcGoalProgress, latestGoalValues, withGoalBaseline } from './goals'
import { calcBody } from './body'
import { makeBodyRecord } from '../test/seed'
import type { BodyRecord, BodySettings, GoalBaselines } from '../types'

/** 既定値に頼らず全項目を明示する（goals.ts の仕様だけを見るため）。目標はすべて未設定 */
function makeSettings(overrides: Partial<BodySettings> = {}): BodySettings {
  return {
    height: 0,
    targetWeight: 0,
    muscleMassUnit: 'kg',
    targetBodyFat: 0,
    targetMuscleMass: 0,
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

describe('latestGoalValues', () => {
  it('記録が1件もなければ空', () => {
    expect(latestGoalValues([], makeSettings())).toEqual({})
  })

  it('1件の記録から 体重・体脂肪率・筋肉量(kg) を取る', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 70, bodyFat: 20, muscleMass: 35 })]
    expect(latestGoalValues(records, makeSettings({ muscleMassUnit: 'kg' }))).toEqual({
      weight: 70,
      bodyFat: 20,
      muscleMass: 35,
    })
  })

  it('筋肉量の単位が % のときは 体重 × 筋肉量% / 100 の kg にする', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 70, bodyFat: 20, muscleMass: 40 })]
    expect(latestGoalValues(records, makeSettings({ muscleMassUnit: '%' })).muscleMass).toBe(28)
  })

  it('筋肉量(%)の換算は calcBody の筋重量と同じ値になる', () => {
    const record = makeBodyRecord('2026-04-17', { weight: 98.2, bodyFat: 32.7, muscleMass: 15.0 })
    const settings = makeSettings({ muscleMassUnit: '%' })
    expect(latestGoalValues([record], settings).muscleMass).toBe(
      calcBody(record, settings).muscleMassKg,
    )
  })

  it('一番新しい日付の値を取る（配列の並びは古い順）', () => {
    const records = [
      makeBodyRecord('2026-09-01', { weight: 70 }),
      makeBodyRecord('2026-09-03', { weight: 68 }),
      makeBodyRecord('2026-09-02', { weight: 69 }),
    ]
    expect(latestGoalValues(records, makeSettings()).weight).toBe(68)
  })

  it('一番新しい日付の値を取る（配列の並びが新しい順でも同じ）', () => {
    const records = [
      makeBodyRecord('2026-09-03', { weight: 68 }),
      makeBodyRecord('2026-09-02', { weight: 69 }),
      makeBodyRecord('2026-09-01', { weight: 70 }),
    ]
    expect(latestGoalValues(records, makeSettings()).weight).toBe(68)
  })

  it('配列の最後が最新とは限らない（日付で決める）', () => {
    const records = [
      makeBodyRecord('2026-10-01', { weight: 66 }),
      makeBodyRecord('2026-09-01', { weight: 70 }),
    ]
    expect(latestGoalValues(records, makeSettings()).weight).toBe(66)
  })

  it('新しい日にその項目が null なら、入っている直近の日まで遡る', () => {
    const records = [
      makeBodyRecord('2026-09-01', { weight: 70, bodyFat: 20 }),
      makeBodyRecord('2026-09-02', { weight: null, bodyFat: 19 }),
      makeBodyRecord('2026-09-03', { weight: null, bodyFat: null }),
    ]
    expect(latestGoalValues(records, makeSettings())).toEqual({ weight: 70, bodyFat: 19 })
  })

  it('項目ごとに別々の日から取る', () => {
    const records = [
      makeBodyRecord('2026-09-01', { muscleMass: 34 }),
      makeBodyRecord('2026-09-05', { weight: 67 }),
      makeBodyRecord('2026-09-03', { bodyFat: 18 }),
    ]
    expect(latestGoalValues(records, makeSettings({ muscleMassUnit: 'kg' }))).toEqual({
      weight: 67,
      bodyFat: 18,
      muscleMass: 34,
    })
  })

  it('一度も記録していない項目は含めない', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 70 })]
    const values = latestGoalValues(records, makeSettings())
    expect(values).toEqual({ weight: 70 })
    expect(values.bodyFat).toBeUndefined()
    expect(values.muscleMass).toBeUndefined()
  })

  it('単位が % のとき、体重と筋肉量が同じ日に入っている一番新しい日から換算する', () => {
    const records = [
      makeBodyRecord('2026-09-01', { weight: 70, muscleMass: 40 }), // 28 kg
      makeBodyRecord('2026-09-02', { weight: 69, muscleMass: null }),
      makeBodyRecord('2026-09-03', { weight: null, muscleMass: 41 }), // 体重が無いので使えない
    ]
    const values = latestGoalValues(records, makeSettings({ muscleMassUnit: '%' }))
    expect(values.muscleMass).toBe(28)
    expect(values.weight).toBe(69) // 体重そのものは最新日（09-02）から取る
  })

  it('単位が % で、体重と筋肉量が同じ日に揃った日が無ければ筋肉量は無い', () => {
    const records = [
      makeBodyRecord('2026-09-01', { weight: 70 }),
      makeBodyRecord('2026-09-02', { muscleMass: 40 }),
    ]
    const values = latestGoalValues(records, makeSettings({ muscleMassUnit: '%' }))
    expect(values.muscleMass).toBeUndefined()
    expect(values.weight).toBe(70)
  })

  it('単位が kg なら体重が無くても筋肉量は取れる', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: null, muscleMass: 36 })]
    expect(latestGoalValues(records, makeSettings({ muscleMassUnit: 'kg' }))).toEqual({
      muscleMass: 36,
    })
  })

  it('渡した records を書き換えない（並べ替えもしない）', () => {
    const records = deepFreeze([
      makeBodyRecord('2026-09-03', { weight: 68 }),
      makeBodyRecord('2026-09-01', { weight: 70 }),
    ])
    expect(() => latestGoalValues(records, deepFreeze(makeSettings()))).not.toThrow()
    expect(records.map((record) => record.date)).toEqual(['2026-09-03', '2026-09-01'])
  })
})

describe('calcGoalProgress — 返す項目の選別', () => {
  const records: BodyRecord[] = [
    makeBodyRecord('2026-09-01', { weight: 68.2, bodyFat: 20, muscleMass: 35 }),
  ]

  it('目標がすべて未設定(0)なら空（目標を設定しない人には何も出さない）', () => {
    expect(calcGoalProgress(records, makeSettings())).toEqual([])
  })

  it('記録がなければ、目標があっても空', () => {
    const settings = makeSettings({ targetWeight: 65, targetBodyFat: 15, targetMuscleMass: 40 })
    expect(calcGoalProgress([], settings)).toEqual([])
  })

  it('目標を設定した項目だけ返す', () => {
    const result = calcGoalProgress(records, makeSettings({ targetBodyFat: 15 }))
    expect(result.map((goal) => goal.metric)).toEqual(['bodyFat'])
  })

  it('目標があっても、その項目の記録が一度も無ければ返さない', () => {
    const onlyWeight = [makeBodyRecord('2026-09-01', { weight: 68 })]
    const settings = makeSettings({ targetWeight: 65, targetBodyFat: 15, targetMuscleMass: 40 })
    expect(calcGoalProgress(onlyWeight, settings).map((goal) => goal.metric)).toEqual(['weight'])
  })

  it('3項目とも揃えば weight → bodyFat → muscleMass の順で返す', () => {
    const settings = makeSettings({ targetWeight: 65, targetBodyFat: 15, targetMuscleMass: 40 })
    expect(calcGoalProgress(records, settings).map((goal) => goal.metric)).toEqual([
      'weight',
      'bodyFat',
      'muscleMass',
    ])
  })

  it('設定の並びに関係なく、順序は weight → bodyFat → muscleMass で固定', () => {
    const settings = makeSettings({ targetMuscleMass: 40, targetWeight: 65 })
    expect(calcGoalProgress(records, settings).map((goal) => goal.metric)).toEqual([
      'weight',
      'muscleMass',
    ])
  })

  it('配列の並びが逆でも、最新日の値で計算する', () => {
    const reversed = [
      makeBodyRecord('2026-09-03', { weight: 66 }),
      makeBodyRecord('2026-09-01', { weight: 70 }),
    ]
    const [goal] = calcGoalProgress(
      reversed,
      makeSettings({ targetWeight: 65, goalBaselines: { weight: 70 } }),
    )
    expect(goal.current).toBe(66)
    expect(goal.remaining).toBe(1)
  })

  it('最新日が null の項目は、遡った日の値で計算する', () => {
    const withGap = [
      makeBodyRecord('2026-09-01', { weight: 70 }),
      makeBodyRecord('2026-09-02', { weight: null, bodyFat: 20 }),
    ]
    const [goal] = calcGoalProgress(withGap, makeSettings({ targetWeight: 65 }))
    expect(goal.current).toBe(70)
  })

  it('渡した records と settings を書き換えない', () => {
    const frozenRecords = deepFreeze([
      makeBodyRecord('2026-09-03', { weight: 66 }),
      makeBodyRecord('2026-09-01', { weight: 70 }),
    ])
    const frozenSettings = deepFreeze(
      makeSettings({ targetWeight: 65, goalBaselines: { weight: 70 } }),
    )
    expect(() => calcGoalProgress(frozenRecords, frozenSettings)).not.toThrow()
  })
})

describe('calcGoalProgress — 向きと残り（baseline あり）', () => {
  it('減らす目標: baseline 70 → 目標 65、現在 68.2 なら あと 3.2 の decrease', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 68.2 })]
    const settings = makeSettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    expect(calcGoalProgress(records, settings)).toEqual([
      { metric: 'weight', current: 68.2, target: 65, remaining: 3.2, status: 'decrease' },
    ])
  })

  it('増やす目標: baseline 36 → 目標 40、現在 38.5 なら あと 1.5 の increase（筋肉量 kg）', () => {
    const records = [makeBodyRecord('2026-09-01', { muscleMass: 38.5 })]
    const settings = makeSettings({
      muscleMassUnit: 'kg',
      targetMuscleMass: 40,
      goalBaselines: { muscleMass: 36 },
    })
    expect(calcGoalProgress(records, settings)).toEqual([
      { metric: 'muscleMass', current: 38.5, target: 40, remaining: 1.5, status: 'increase' },
    ])
  })

  it('体脂肪率は % の値で比べる', () => {
    const records = [makeBodyRecord('2026-09-01', { bodyFat: 20 })]
    const settings = makeSettings({ targetBodyFat: 15, goalBaselines: { bodyFat: 22 } })
    expect(calcGoalProgress(records, settings)).toEqual([
      { metric: 'bodyFat', current: 20, target: 15, remaining: 5, status: 'decrease' },
    ])
  })

  it('向きは baseline で決まる: 減らす目標なのに現在が baseline より増えていても decrease', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 72 })]
    const settings = makeSettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    const [goal] = calcGoalProgress(records, settings)
    expect(goal.status).toBe('decrease')
    expect(goal.remaining).toBe(7)
  })

  it('向きは baseline で決まる: 増やす目標なのに現在が baseline より減っていても increase', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 60 })]
    const settings = makeSettings({ targetWeight: 65, goalBaselines: { weight: 62 } })
    const [goal] = calcGoalProgress(records, settings)
    expect(goal.status).toBe('increase')
    expect(goal.remaining).toBe(5)
  })

  it('項目ごとに baseline を見る（他項目の baseline は影響しない）', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 68, bodyFat: 20 })]
    const settings = makeSettings({
      targetWeight: 65,
      targetBodyFat: 25, // 体脂肪率は「増やす」目標（珍しいが向きは baseline に従う）
      goalBaselines: { weight: 70, bodyFat: 18 },
    })
    const [weight, bodyFat] = calcGoalProgress(records, settings)
    expect(weight.status).toBe('decrease')
    expect(bodyFat.status).toBe('increase')
    expect(bodyFat.remaining).toBe(5)
  })
})

describe('calcGoalProgress — 達成と境界値', () => {
  it('減らす目標で現在が目標ちょうどなら achieved（remaining 0）', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 65 })]
    const settings = makeSettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    expect(calcGoalProgress(records, settings)[0]).toMatchObject({
      status: 'achieved',
      remaining: 0,
    })
  })

  it('減らす目標で目標を通り過ぎたら achieved、remaining は 0（負にならない）', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 63.4 })]
    const settings = makeSettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    expect(calcGoalProgress(records, settings)[0]).toMatchObject({
      current: 63.4,
      status: 'achieved',
      remaining: 0,
    })
  })

  it('増やす目標で現在が目標ちょうどなら achieved', () => {
    const records = [makeBodyRecord('2026-09-01', { muscleMass: 40 })]
    const settings = makeSettings({ targetMuscleMass: 40, goalBaselines: { muscleMass: 36 } })
    expect(calcGoalProgress(records, settings)[0]).toMatchObject({
      status: 'achieved',
      remaining: 0,
    })
  })

  it('増やす目標で目標を超えたら achieved、remaining は 0', () => {
    const records = [makeBodyRecord('2026-09-01', { muscleMass: 41.7 })]
    const settings = makeSettings({ targetMuscleMass: 40, goalBaselines: { muscleMass: 36 } })
    expect(calcGoalProgress(records, settings)[0]).toMatchObject({
      status: 'achieved',
      remaining: 0,
    })
  })

  it('目標に 0.1 届かない（減らす目標）は achieved にならない', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 65.1 })]
    const settings = makeSettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    expect(calcGoalProgress(records, settings)[0]).toMatchObject({
      status: 'decrease',
      remaining: 0.1,
    })
  })

  it('baseline と目標が同じ値なら achieved', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 68 })]
    const settings = makeSettings({ targetWeight: 65, goalBaselines: { weight: 65 } })
    const [goal] = calcGoalProgress(records, settings)
    expect(goal.status).toBe('achieved')
    expect(goal.remaining).toBe(0)
  })
})

describe('calcGoalProgress — 小数1桁の丸め', () => {
  it('差が 3.24 なら 3.2 に丸める', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 68.24 })]
    const settings = makeSettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    expect(calcGoalProgress(records, settings)[0].remaining).toBe(3.2)
  })

  it('差が 3.26 なら 3.3 に丸める', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 68.26 })]
    const settings = makeSettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    expect(calcGoalProgress(records, settings)[0].remaining).toBe(3.3)
  })

  it('差が 0.25（二進数で正確に表せる中間値）は 0.3 に切り上げる', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 65.25 })]
    const settings = makeSettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    expect(calcGoalProgress(records, settings)[0].remaining).toBe(0.3)
  })

  it('丸めて 0 になる差（65.04 と 65.0）は achieved、remaining 0', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 65.04 })]
    const settings = makeSettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    expect(calcGoalProgress(records, settings)[0]).toMatchObject({
      status: 'achieved',
      remaining: 0,
    })
  })

  it('丸めて 0 になる差は、増やす目標（現在が目標の少し下）でも achieved', () => {
    const records = [makeBodyRecord('2026-09-01', { muscleMass: 39.96 })]
    const settings = makeSettings({ targetMuscleMass: 40, goalBaselines: { muscleMass: 36 } })
    expect(calcGoalProgress(records, settings)[0]).toMatchObject({
      status: 'achieved',
      remaining: 0,
    })
  })

  it('浮動小数の誤差が出ない（68.2 - 65 → 3.2。3.2000000000000028 にならない）', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 68.2 })]
    const settings = makeSettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    expect(calcGoalProgress(records, settings)[0].remaining).toBe(3.2)
  })
})

describe('calcGoalProgress — baseline が無いとき（旧データ・記録前に目標を入れた）', () => {
  it('現在 > 目標 なら decrease', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 68 })]
    expect(calcGoalProgress(records, makeSettings({ targetWeight: 65 }))[0]).toEqual({
      metric: 'weight',
      current: 68,
      target: 65,
      remaining: 3,
      status: 'decrease',
    })
  })

  it('現在 < 目標 なら increase', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 60 })]
    expect(calcGoalProgress(records, makeSettings({ targetWeight: 65 }))[0]).toMatchObject({
      status: 'increase',
      remaining: 5,
    })
  })

  it('現在 = 目標 なら achieved', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 65 })]
    expect(calcGoalProgress(records, makeSettings({ targetWeight: 65 }))[0]).toMatchObject({
      status: 'achieved',
      remaining: 0,
    })
  })

  it('丸めて 0 になる差は achieved（baseline 無しでも）', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 65.04 })]
    expect(calcGoalProgress(records, makeSettings({ targetWeight: 65 }))[0]).toMatchObject({
      status: 'achieved',
      remaining: 0,
    })
  })

  it('他の項目の baseline があっても、その項目の baseline が無ければ差の符号で決める', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 68, bodyFat: 20 })]
    const settings = makeSettings({
      targetWeight: 65,
      targetBodyFat: 15,
      goalBaselines: { weight: 60 }, // 体重は increase 向きの baseline。体脂肪率には baseline 無し
    })
    const [weight, bodyFat] = calcGoalProgress(records, settings)
    expect(weight.status).toBe('achieved') // baseline 60 < 目標 65 → 増やす目標、68 >= 65
    expect(bodyFat.status).toBe('decrease')
  })
})

describe('calcGoalProgress — goalBaselines が壊れていても例外を投げない', () => {
  const records = [makeBodyRecord('2026-09-01', { weight: 68 })]

  function withBrokenBaselines(broken: unknown): BodySettings {
    return makeSettings({
      targetWeight: 65,
      goalBaselines: broken as GoalBaselines,
    })
  }

  it.each([
    ['null', null],
    ['文字列', 'broken'],
    ['数値', 5],
    ['配列', [70]],
    ['undefined（旧データ）', undefined],
  ])('goalBaselines が %s でも baseline 無しとして計算できる', (_label, broken) => {
    const settings = withBrokenBaselines(broken)
    expect(() => calcGoalProgress(records, settings)).not.toThrow()
    expect(calcGoalProgress(records, settings)[0]).toMatchObject({
      status: 'decrease',
      remaining: 3,
    })
  })

  it('baseline の値が数値でなければ無視する（文字列 "60" を数値として扱わない）', () => {
    // "60" を数値扱いすると 増やす目標（60 < 65）→ 現在 68 は達成になってしまう
    const settings = withBrokenBaselines({ weight: '60' })
    expect(calcGoalProgress(records, settings)[0].status).toBe('decrease')
  })

  it.each([
    ['null', null],
    ['真偽値', true],
    ['オブジェクト', {}],
  ])('baseline の値が %s でも baseline 無しとして扱う', (_label, broken) => {
    const settings = withBrokenBaselines({ weight: broken })
    expect(() => calcGoalProgress(records, settings)).not.toThrow()
    expect(calcGoalProgress(records, settings)[0].status).toBe('decrease')
  })
})

describe('calcGoalProgress — 筋肉量の単位', () => {
  it('単位 % のとき、現在値は体重 × 筋肉量% の kg。目標(kg)と比べる', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 70, muscleMass: 40 })] // 28 kg
    const settings = makeSettings({
      muscleMassUnit: '%',
      targetMuscleMass: 30,
      goalBaselines: { muscleMass: 25 },
    })
    expect(calcGoalProgress(records, settings)).toEqual([
      { metric: 'muscleMass', current: 28, target: 30, remaining: 2, status: 'increase' },
    ])
  })

  it('単位 kg のとき、現在値は筋肉量そのまま', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: 70, muscleMass: 28 })]
    const settings = makeSettings({
      muscleMassUnit: 'kg',
      targetMuscleMass: 30,
      goalBaselines: { muscleMass: 25 },
    })
    expect(calcGoalProgress(records, settings)[0]).toMatchObject({ current: 28, remaining: 2 })
  })

  it('単位 % で体重が無ければ筋肉量の目標は返さない', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: null, muscleMass: 40 })]
    const settings = makeSettings({ muscleMassUnit: '%', targetMuscleMass: 30 })
    expect(calcGoalProgress(records, settings)).toEqual([])
  })

  it('単位 kg なら体重が無くても筋肉量の目標を返す', () => {
    const records = [makeBodyRecord('2026-09-01', { weight: null, muscleMass: 28 })]
    const settings = makeSettings({ muscleMassUnit: 'kg', targetMuscleMass: 30 })
    expect(calcGoalProgress(records, settings)).toHaveLength(1)
  })

  it('current は calcBody の筋重量と一致する（98.2kg × 15% = 14.73）', () => {
    const record = makeBodyRecord('2026-04-17', { weight: 98.2, bodyFat: 32.7, muscleMass: 15 })
    const settings = makeSettings({ muscleMassUnit: '%', targetMuscleMass: 20 })
    const [goal] = calcGoalProgress([record], settings)
    expect(goal.current).toBe(calcBody(record, settings).muscleMassKg)
    expect(goal.current).toBe(14.73)
  })
})

describe('withGoalBaseline', () => {
  it('目標あり・現在値あり → その項目の baseline を現在値にした新しいオブジェクト', () => {
    expect(withGoalBaseline({}, 'weight', 65, 68.2)).toEqual({ weight: 68.2 })
  })

  it('他の項目の baseline は残す', () => {
    expect(withGoalBaseline({ bodyFat: 22 }, 'weight', 65, 68.2)).toEqual({
      bodyFat: 22,
      weight: 68.2,
    })
  })

  it('既にある baseline は現在値で上書きする', () => {
    expect(withGoalBaseline({ weight: 70 }, 'weight', 63, 68.2)).toEqual({ weight: 68.2 })
  })

  it('元の baselines を書き換えず、新しいオブジェクトを返す', () => {
    const original = deepFreeze<GoalBaselines>({ bodyFat: 22 })
    const next = withGoalBaseline(original, 'weight', 65, 68.2)
    expect(next).not.toBe(original)
    expect(original).toEqual({ bodyFat: 22 })
  })

  it('目標が 0（未設定に戻した）なら、その項目の baseline を取り除く', () => {
    const next = withGoalBaseline({ weight: 70, bodyFat: 22 }, 'weight', 0, 68.2)
    expect(next).toEqual({ bodyFat: 22 })
    expect(next).not.toHaveProperty('weight')
  })

  it('目標が 0 で現在値も無くても、その項目の baseline を取り除く', () => {
    const next = withGoalBaseline({ weight: 70 }, 'weight', 0, undefined)
    expect(next).not.toHaveProperty('weight')
  })

  it('目標あり・現在値なしなら baseline を取り除く（古い向きを引きずらない）', () => {
    const next = withGoalBaseline({ weight: 70, bodyFat: 22 }, 'weight', 65, undefined)
    expect(next).toEqual({ bodyFat: 22 })
    expect(next).not.toHaveProperty('weight')
  })

  it('取り除くときも元の baselines を書き換えない', () => {
    const original = deepFreeze<GoalBaselines>({ weight: 70 })
    expect(() => withGoalBaseline(original, 'weight', 0, 68)).not.toThrow()
    expect(original).toEqual({ weight: 70 })
  })

  it('3項目それぞれに使える', () => {
    let baselines: GoalBaselines = {}
    baselines = withGoalBaseline(baselines, 'weight', 65, 70)
    baselines = withGoalBaseline(baselines, 'bodyFat', 15, 22)
    baselines = withGoalBaseline(baselines, 'muscleMass', 40, 36)
    expect(baselines).toEqual({ weight: 70, bodyFat: 22, muscleMass: 36 })
  })
})

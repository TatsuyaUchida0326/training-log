import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_BODY_SETTINGS } from '../../hooks/useBodySettings'
import { makeContest, readStoredContests, seedContests, withTargets } from '../../test/contests'
import { setupFixedClock } from '../../test/fixedClock'
import { renderContestEditor } from '../../test/renderContestEditor'
import { makeBodyRecord } from '../../test/seed'
import type { GoalMetric } from '../../types'

/**
 * 大会ごとの目標の入力。今日は 2026-10-05（月）に固定する（目標を入れた日 = targetOrigins.date に使われる）。
 * 大会の名前・日付・追加・削除は ContestEditor.test.tsx が見ている。
 */
setupFixedClock(new Date(2026, 9, 5, 12))

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const NAME = 'ボディコンテスト'
const TODAY_TEXT = '2026-10-05'

/** 読み上げ名は「見える文字 + （大会名）」。見える文字は「この大会の目標を入れる」 */
const OPEN_BUTTON = { name: `この大会の目標を入れる（${NAME}）` }
const GROUP = { name: `${NAME}の目標` }

const LABELS: Record<GoalMetric, string> = {
  weight: `${NAME}の目標体重`,
  bodyFat: `${NAME}の目標体脂肪率`,
  muscleMass: `${NAME}の目標筋肉量`,
}

/** 見える文字（目標の欄の上の項目名） */
const VISIBLE_LABELS: Record<GoalMetric, string> = {
  weight: '体重',
  bodyFat: '体脂肪率',
  muscleMass: '筋肉量',
}

const KG_SETTINGS = { ...DEFAULT_BODY_SETTINGS, muscleMassUnit: 'kg' as const }

function plain() {
  return makeContest(NAME, '2026-10-17', 'a')
}

function input(label: string): HTMLInputElement {
  return screen.getByLabelText(label) as HTMLInputElement
}

/** 値を入れて blur する（保存のきっかけ。体組成画面の入力欄のテストと同じ書き方） */
function enter(label: string, value: string): void {
  fireEvent.blur(input(label), { target: { value } })
}

/** 目標を1つも持たない大会 1 件を置き、目標の欄を開いた状態にする */
async function openTargets(props: Parameters<typeof renderContestEditor>[0] = {}): Promise<void> {
  seedContests([plain()])
  renderContestEditor(props)
  await userEvent.click(screen.getByRole('button', OPEN_BUTTON))
}

describe('ContestEditor — 目標の欄を開く（目標が1つも無い大会）', () => {
  it('ボタンが出る。読み上げ名は「この大会の目標を入れる（{大会名}）」で、見える文字は「この大会の目標を入れる」で始まる', () => {
    seedContests([plain()])
    renderContestEditor()
    const button = screen.getByRole('button', OPEN_BUTTON)
    expect(button).toHaveAccessibleName(`この大会の目標を入れる（${NAME}）`)
    expect(button.textContent).toMatch(/^この大会の目標を入れる/)
    expect(button).toHaveAttribute('type', 'button')
  })

  it('aria-expanded は付けない（押すとボタン自体が消えるため、開閉の状態を持たない）', () => {
    seedContests([plain()])
    renderContestEditor()
    expect(screen.getByRole('button', OPEN_BUTTON)).not.toHaveAttribute('aria-expanded')
  })

  it('閉じている間は、目標の欄（group・3つの入力）が出ない', () => {
    seedContests([plain()])
    renderContestEditor()
    expect(screen.queryByRole('group', GROUP)).not.toBeInTheDocument()
    for (const label of Object.values(LABELS)) {
      expect(screen.queryByLabelText(label)).not.toBeInTheDocument()
    }
  })

  it('押すと、目標の欄（role="group"、aria-label「{大会名}の目標」）が開き、ボタンは消える', async () => {
    await openTargets()
    expect(screen.getByRole('group', GROUP)).toBeInTheDocument()
    expect(screen.queryByRole('button', OPEN_BUTTON)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^この大会の目標を入れる/ })).not.toBeInTheDocument()
  })

  it('押すと、フォーカスは先頭の欄（目標体重）へ移る（ボタンが消えてフォーカスが body に落ちない）', async () => {
    await openTargets()
    expect(input(LABELS.weight)).toHaveFocus()
    expect(document.body).not.toHaveFocus()
  })

  it('キーボード（フォーカスして Enter）でも開き、先頭の欄にフォーカスが移る', async () => {
    seedContests([plain()])
    renderContestEditor()
    screen.getByRole('button', OPEN_BUTTON).focus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('group', GROUP)).toBeInTheDocument()
    expect(input(LABELS.weight)).toHaveFocus()
  })

  it('開いた欄に number の入力が3つ（目標体重・目標体脂肪率・目標筋肉量）', async () => {
    await openTargets()
    const group = screen.getByRole('group', GROUP)
    expect(within(group).getAllByRole('spinbutton')).toHaveLength(3)
    for (const label of Object.values(LABELS)) {
      expect(within(group).getByLabelText(label)).toHaveAttribute('type', 'number')
    }
  })

  it('入力は min="0" step="0.1" で、最初は空', async () => {
    await openTargets()
    for (const label of Object.values(LABELS)) {
      expect(input(label)).toHaveAttribute('min', '0')
      expect(input(label)).toHaveAttribute('step', '0.1')
      expect(input(label)).toHaveValue(null)
    }
  })

  it('単位が kg / % / kg で出る', async () => {
    await openTargets()
    const group = screen.getByRole('group', GROUP)
    expect(within(group).getAllByText('kg')).toHaveLength(2)
    expect(within(group).getAllByText('%')).toHaveLength(1)
  })

  it('開くだけでは保存データは変わらない', async () => {
    await openTargets()
    expect(readStoredContests()).toEqual([plain()])
  })

  it('大会ごとに別のボタン（名前つき）と別の欄になる。片方を開いてももう片方は閉じたまま', async () => {
    seedContests([makeContest('大会いち', '2026-10-17', 'a'), makeContest('大会に', '2026-11-03', 'b')])
    renderContestEditor()
    await userEvent.click(screen.getByRole('button', { name: 'この大会の目標を入れる（大会いち）' }))
    expect(screen.getByRole('group', { name: '大会いちの目標' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: '大会にの目標' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'この大会の目標を入れる（大会に）' })).toBeInTheDocument()
  })

  it('過ぎた大会の行にもボタンが出る', () => {
    seedContests([makeContest('終わった大会', '2026-09-01', 'a')])
    renderContestEditor()
    expect(screen.getByRole('button', { name: 'この大会の目標を入れる（終わった大会）' })).toBeInTheDocument()
  })

  it('大会が1件も無ければ、目標のボタンも欄も無い', () => {
    renderContestEditor()
    expect(screen.queryByRole('button', { name: /^この大会の目標を入れる/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('開いたあとで全部の項目を空にしても、欄は開いたまま（ボタンに戻らない）', async () => {
    await openTargets()
    enter(LABELS.weight, '65')
    enter(LABELS.weight, '')
    expect(screen.getByRole('group', GROUP)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^この大会の目標を入れる/ })).not.toBeInTheDocument()
  })

  it('目標を入れたあとの Shift+Tab で、フォーカスが body に落ちない（移動先のボタンが消えない）', async () => {
    await openTargets()
    await userEvent.type(input(LABELS.weight), '65')
    await userEvent.tab({ shift: true })
    expect(document.body).not.toHaveFocus()
    expect(document.activeElement).not.toBeNull()
  })
})

describe('ContestEditor — 目標の欄の見える項目名（label）', () => {
  it.each<GoalMetric>(['weight', 'bodyFat', 'muscleMass'])(
    '%s: 見える文字「項目名」は <label> で、対応する入力と結び付く',
    async (metric) => {
      await openTargets()
      const group = screen.getByRole('group', GROUP)
      const label = within(group).getByText(VISIBLE_LABELS[metric])
      expect(label.tagName).toBe('LABEL')
      expect((label as HTMLLabelElement).control).toBe(input(LABELS[metric]))
    },
  )

  it.each<GoalMetric>(['weight', 'bodyFat', 'muscleMass'])(
    '%s: 見える文字をクリックすると、入力にフォーカスが入る',
    async (metric) => {
      await openTargets()
      // フォーカスが先頭の欄にあるので、いったん外す
      screen.getByRole('button', { name: `${NAME}を削除` }).focus()
      await userEvent.click(within(screen.getByRole('group', GROUP)).getByText(VISIBLE_LABELS[metric]))
      expect(input(LABELS[metric])).toHaveFocus()
    },
  )

  it('読み上げ名（getByLabelText で取れる名前）は「{大会名}の目標体重」などのまま', async () => {
    await openTargets()
    expect(input(LABELS.weight)).toHaveAccessibleName(LABELS.weight)
    expect(input(LABELS.bodyFat)).toHaveAccessibleName(LABELS.bodyFat)
    expect(input(LABELS.muscleMass)).toHaveAccessibleName(LABELS.muscleMass)
  })
})

describe('ContestEditor — 目標がある大会は最初から開いている', () => {
  it('ボタンは出ず、欄が開いていて、保存済みの値が入っている。フォーカスは動かさない', () => {
    seedContests([withTargets(plain(), { weight: 65, muscleMass: 40 }, { weight: { date: '2026-10-01', value: 68 } })])
    renderContestEditor()
    expect(screen.queryByRole('button', { name: /^この大会の目標を入れる/ })).not.toBeInTheDocument()
    expect(screen.getByRole('group', GROUP)).toBeInTheDocument()
    expect(input(LABELS.weight)).toHaveValue(65)
    expect(input(LABELS.bodyFat)).toHaveValue(null)
    expect(input(LABELS.muscleMass)).toHaveValue(40)
    for (const label of Object.values(LABELS)) expect(input(label)).not.toHaveFocus()
    expect(document.body).toHaveFocus()
  })

  it('1項目だけでも開いている（体脂肪率だけ）', () => {
    seedContests([withTargets(plain(), { bodyFat: 12.5 })])
    renderContestEditor()
    expect(screen.getByRole('group', GROUP)).toBeInTheDocument()
    expect(input(LABELS.bodyFat)).toHaveValue(12.5)
  })

  it('大会ごとに判断する（目標のある大会は開き、無い大会はボタン）', () => {
    seedContests([
      withTargets(makeContest('目標あり', '2026-10-17', 'a'), { weight: 65 }),
      makeContest('目標なし', '2026-11-03', 'b'),
    ])
    renderContestEditor()
    expect(screen.getByRole('group', { name: '目標ありの目標' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'この大会の目標を入れる（目標あり）' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: '目標なしの目標' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'この大会の目標を入れる（目標なし）' })).toBeInTheDocument()
  })

  it('壊れた targets（値が 0 など）しか無い大会は「目標なし」としてボタンが出る', () => {
    seedContests([{ ...plain(), targets: { weight: 0, bodyFat: 'x' } }])
    renderContestEditor()
    expect(screen.getByRole('button', OPEN_BUTTON)).toBeInTheDocument()
    expect(screen.queryByRole('group', GROUP)).not.toBeInTheDocument()
  })
})

describe('ContestEditor — 目標を入れる（blur で保存）', () => {
  it('記録が無いとき、目標体重 65 を blur すると、targets.weight = 65・origin = { date: 今日 }（value 無し）で保存される', async () => {
    await openTargets()
    enter(LABELS.weight, '65')
    const [stored] = readStoredContests()
    expect(stored).toMatchObject({ ...plain(), targets: { weight: 65 } })
    expect(stored.targetOrigins).toEqual({ weight: { date: TODAY_TEXT } })
    expect(stored.targetOrigins?.weight?.value).toBeUndefined()
  })

  it.each<[GoalMetric, string, number]>([
    ['weight', '65.5', 65.5],
    ['bodyFat', '12.5', 12.5],
    ['muscleMass', '40', 40],
  ])('%s の欄: 入力 %s を blur すると %s で保存される（ほかの項目は入らない）', async (metric, text, saved) => {
    await openTargets()
    enter(LABELS[metric], text)
    const [stored] = readStoredContests()
    expect(stored.targets).toEqual({ [metric]: saved })
    expect(Object.keys(stored.targetOrigins ?? {})).toEqual([metric])
    expect(stored.targetOrigins?.[metric]?.date).toBe(TODAY_TEXT)
  })

  it('3項目を続けて入れると、3項目とも保存される', async () => {
    await openTargets()
    enter(LABELS.weight, '65')
    enter(LABELS.bodyFat, '12')
    enter(LABELS.muscleMass, '40')
    const [stored] = readStoredContests()
    expect(stored.targets).toEqual({ weight: 65, bodyFat: 12, muscleMass: 40 })
    expect(Object.keys(stored.targetOrigins ?? {}).sort()).toEqual(['bodyFat', 'muscleMass', 'weight'])
  })

  it('入力を打っている途中（change）では保存せず、blur で保存する', async () => {
    await openTargets()
    fireEvent.change(input(LABELS.weight), { target: { value: '65' } })
    expect(readStoredContests()[0]).toEqual(plain())
    fireEvent.blur(input(LABELS.weight))
    expect(readStoredContests()[0].targets).toEqual({ weight: 65 })
  })

  it('保存したあとも、欄には入れた値が出たまま', async () => {
    await openTargets()
    enter(LABELS.weight, '65')
    expect(input(LABELS.weight)).toHaveValue(65)
    expect(screen.getByRole('group', GROUP)).toBeInTheDocument()
  })

  it('目標を入れても、大会の名前・日付・id は変わらない', async () => {
    await openTargets()
    enter(LABELS.weight, '65')
    expect(readStoredContests()[0]).toMatchObject({ id: 'a', name: NAME, date: '2026-10-17' })
    expect(input(`${NAME}の名前`)).toHaveValue(NAME)
    expect(input(`${NAME}の日付`)).toHaveValue('2026-10-17')
  })

  it('目標を入れても、大会の並び（日付の昇順）は変わらない', () => {
    seedContests([
      makeContest('遠い大会', '2026-12-24', 'far'),
      makeContest('近い大会', '2026-10-17', 'near'),
    ])
    renderContestEditor()
    const before = readStoredContests().map((contest) => contest.id)

    fireEvent.click(screen.getByRole('button', { name: 'この大会の目標を入れる（遠い大会）' }))
    enter('遠い大会の目標体重', '65')

    expect(readStoredContests().map((contest) => contest.id)).toEqual(before)
    const names = screen.getAllByLabelText(/^(?!追加する大会の名前$).+の名前$/) as HTMLInputElement[]
    expect(names.map((element) => element.value)).toEqual(['近い大会', '遠い大会'])
  })

  it('ほかの大会の目標には影響しない', () => {
    seedContests([
      withTargets(makeContest('大会いち', '2026-10-17', 'a'), { weight: 65 }, { weight: { date: '2026-10-01', value: 68 } }),
      makeContest('大会に', '2026-11-03', 'b'),
    ])
    renderContestEditor()
    fireEvent.click(screen.getByRole('button', { name: 'この大会の目標を入れる（大会に）' }))
    enter('大会にの目標体脂肪率', '12')

    const [first, second] = readStoredContests()
    expect(first.targets).toEqual({ weight: 65 })
    expect(first.targetOrigins).toEqual({ weight: { date: '2026-10-01', value: 68 } })
    expect(second.targets).toEqual({ bodyFat: 12 })
  })

  it('小数 1 桁の目標をそのまま保存する（62.5）', async () => {
    await openTargets()
    enter(LABELS.weight, '62.5')
    expect(readStoredContests()[0].targets).toEqual({ weight: 62.5 })
  })
})

describe('ContestEditor — 目標を入れたときの「いまの値」が起点の value になる', () => {
  it('体重の最新の記録（68.2）が origin.value になる。date は今日', async () => {
    await openTargets({
      bodyRecords: [makeBodyRecord('2026-10-03', { weight: 68.2 })],
      bodySettings: KG_SETTINGS,
    })
    enter(LABELS.weight, '65')
    expect(readStoredContests()[0].targetOrigins).toEqual({ weight: { date: TODAY_TEXT, value: 68.2 } })
  })

  it('その項目が入っている一番新しい日の値を使う（配列が古い順でなくても、新しい日に null なら遡る）', async () => {
    await openTargets({
      bodyRecords: [
        makeBodyRecord('2026-10-04', { weight: null, bodyFat: 20 }),
        makeBodyRecord('2026-09-01', { weight: 70 }),
        makeBodyRecord('2026-10-02', { weight: 68.2 }),
      ],
      bodySettings: KG_SETTINGS,
    })
    enter(LABELS.weight, '65')
    expect(readStoredContests()[0].targetOrigins).toEqual({ weight: { date: TODAY_TEXT, value: 68.2 } })
  })

  it('項目ごとに、その項目の最新値が入る（体脂肪率・筋肉量 kg）', async () => {
    await openTargets({
      bodyRecords: [makeBodyRecord('2026-10-03', { weight: 68.2, bodyFat: 20, muscleMass: 36 })],
      bodySettings: KG_SETTINGS,
    })
    enter(LABELS.bodyFat, '15')
    enter(LABELS.muscleMass, '40')
    const origins = readStoredContests()[0].targetOrigins
    expect(origins?.bodyFat).toEqual({ date: TODAY_TEXT, value: 20 })
    expect(origins?.muscleMass).toEqual({ date: TODAY_TEXT, value: 36 })
  })

  it('筋肉量の単位が % のときは、体重 × 筋肉量% / 100 の kg が value になる', async () => {
    await openTargets({
      bodyRecords: [makeBodyRecord('2026-10-03', { weight: 70, muscleMass: 40 })],
      bodySettings: { ...DEFAULT_BODY_SETTINGS, muscleMassUnit: '%' },
    })
    enter(LABELS.muscleMass, '30')
    expect(readStoredContests()[0].targetOrigins?.muscleMass).toEqual({ date: TODAY_TEXT, value: 28 })
  })

  it('その項目の記録が無ければ、value は無い（体重だけ記録していて体脂肪率の目標を入れた場合）', async () => {
    await openTargets({
      bodyRecords: [makeBodyRecord('2026-10-03', { weight: 68.2 })],
      bodySettings: KG_SETTINGS,
    })
    enter(LABELS.bodyFat, '15')
    expect(readStoredContests()[0].targetOrigins).toEqual({ bodyFat: { date: TODAY_TEXT } })
  })
})

describe('ContestEditor — 値が変わったときだけ起点を更新する', () => {
  const SAVED = withTargets(
    makeContest(NAME, '2026-10-17', 'a'),
    { weight: 65, bodyFat: 12 },
    { weight: { date: '2026-09-01', value: 70 }, bodyFat: { date: '2026-09-02', value: 20 } },
  )
  const RECORDS = [makeBodyRecord('2026-10-04', { weight: 64.5, bodyFat: 18 })]

  it('同じ値のまま blur し直しても、保存データ（origin を含む）は変わらない', () => {
    seedContests([SAVED])
    renderContestEditor({ bodyRecords: RECORDS, bodySettings: KG_SETTINGS })
    enter(LABELS.weight, '65')
    expect(readStoredContests()[0]).toEqual(SAVED)
  })

  it('同じ値を別の書き方（65.0）で blur しても変わらない', () => {
    seedContests([SAVED])
    renderContestEditor({ bodyRecords: RECORDS, bodySettings: KG_SETTINGS })
    enter(LABELS.weight, '65.0')
    expect(readStoredContests()[0]).toEqual(SAVED)
  })

  it('何も触らずに blur しても変わらない（欄に入っている値のまま）', () => {
    seedContests([SAVED])
    renderContestEditor({ bodyRecords: RECORDS, bodySettings: KG_SETTINGS })
    fireEvent.blur(input(LABELS.weight))
    expect(readStoredContests()[0]).toEqual(SAVED)
  })

  it('値を変えると、その項目の目標と origin（今日・いまの値）が更新され、ほかの項目は変わらない', () => {
    seedContests([SAVED])
    renderContestEditor({ bodyRecords: RECORDS, bodySettings: KG_SETTINGS })
    enter(LABELS.weight, '63')
    expect(readStoredContests()[0]).toEqual({
      ...SAVED,
      targets: { weight: 63, bodyFat: 12 },
      targetOrigins: {
        weight: { date: TODAY_TEXT, value: 64.5 },
        bodyFat: { date: '2026-09-02', value: 20 },
      },
    })
  })

  it('目標の無い項目に空のまま blur しても、何も保存しない（origin も作らない）', () => {
    seedContests([SAVED])
    renderContestEditor({ bodyRecords: RECORDS, bodySettings: KG_SETTINGS })
    enter(LABELS.muscleMass, '')
    expect(readStoredContests()[0]).toEqual(SAVED)
  })

  it('目標の無い大会で、開いただけ・空のまま blur しただけなら、保存データは元のまま', async () => {
    await openTargets()
    enter(LABELS.weight, '')
    enter(LABELS.bodyFat, '')
    expect(readStoredContests()[0]).toEqual(plain())
    expect(readStoredContests()[0]).not.toHaveProperty('targets')
    expect(readStoredContests()[0]).not.toHaveProperty('targetOrigins')
  })
})

describe('ContestEditor — 空・0・負数・数値でない入力は、その項目の目標を消す', () => {
  const SAVED = withTargets(
    makeContest(NAME, '2026-10-17', 'a'),
    { weight: 65, bodyFat: 12 },
    { weight: { date: '2026-09-01', value: 70 }, bodyFat: { date: '2026-09-02', value: 20 } },
  )

  it.each([
    ['空', ''],
    ['0', '0'],
    ['0.0', '0.0'],
    ['負数', '-5'],
    ['数値でない文字', 'abc'],
  ])('入力が「%s」なら、その項目を targets と targetOrigins の両方から取り除く', (_label, text) => {
    seedContests([SAVED])
    renderContestEditor()
    enter(LABELS.weight, text)
    const [stored] = readStoredContests()
    expect(stored.targets).toEqual({ bodyFat: 12 })
    expect(stored.targetOrigins).toEqual({ bodyFat: { date: '2026-09-02', value: 20 } })
  })

  it('最後の1項目を消すと、targets・targetOrigins のキーが保存データから無くなる', () => {
    seedContests([withTargets(makeContest(NAME, '2026-10-17', 'a'), { weight: 65 }, { weight: { date: '2026-09-01', value: 70 } })])
    renderContestEditor()
    enter(LABELS.weight, '')
    expect(readStoredContests()[0]).toEqual(plain())
    expect(readStoredContests()[0]).not.toHaveProperty('targets')
    expect(readStoredContests()[0]).not.toHaveProperty('targetOrigins')
  })

  it('消しても大会の名前・日付は変わらない', () => {
    seedContests([SAVED])
    renderContestEditor()
    enter(LABELS.weight, '')
    expect(readStoredContests()[0]).toMatchObject({ id: 'a', name: NAME, date: '2026-10-17' })
  })

  it('消したあとで、また入れられる（入れた日が今日で記録される）', () => {
    seedContests([SAVED])
    renderContestEditor({ bodyRecords: [makeBodyRecord('2026-10-04', { weight: 64.5 })], bodySettings: KG_SETTINGS })
    enter(LABELS.weight, '')
    enter(LABELS.weight, '60')
    const [stored] = readStoredContests()
    expect(stored.targets).toEqual({ weight: 60, bodyFat: 12 })
    expect(stored.targetOrigins).toEqual({
      weight: { date: TODAY_TEXT, value: 64.5 },
      bodyFat: { date: '2026-09-02', value: 20 },
    })
  })
})

describe('ContestEditor — 大会を消す・名前や日付を変える', () => {
  it('目標のある大会を削除すると、目標も一緒に消える', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    seedContests([
      withTargets(makeContest(NAME, '2026-10-17', 'a'), { weight: 65 }, { weight: { date: '2026-10-01', value: 68 } }),
      makeContest('秋の大会', '2026-11-03', 'b'),
    ])
    renderContestEditor()
    await userEvent.click(screen.getByRole('button', { name: `${NAME}を削除` }))
    expect(readStoredContests()).toEqual([makeContest('秋の大会', '2026-11-03', 'b')])
    expect(JSON.stringify(readStoredContests())).not.toContain('targets')
    expect(screen.queryByRole('group', GROUP)).not.toBeInTheDocument()
  })

  it('削除をキャンセルしたら、目標は残る', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const saved = withTargets(makeContest(NAME, '2026-10-17', 'a'), { weight: 65 }, { weight: { date: '2026-10-01', value: 68 } })
    seedContests([saved])
    renderContestEditor()
    await userEvent.click(screen.getByRole('button', { name: `${NAME}を削除` }))
    expect(readStoredContests()).toEqual([saved])
    expect(input(LABELS.weight)).toHaveValue(65)
  })

  it('名前を変えても、目標と起点は残る（欄のラベルは新しい名前になる）', () => {
    const saved = withTargets(makeContest(NAME, '2026-10-17', 'a'), { weight: 65 }, { weight: { date: '2026-10-01', value: 68 } })
    seedContests([saved])
    renderContestEditor()
    fireEvent.blur(input(`${NAME}の名前`), { target: { value: '全日本大会' } })
    expect(readStoredContests()[0]).toEqual({ ...saved, name: '全日本大会' })
    expect(screen.getByLabelText('全日本大会の目標体重')).toHaveValue(65)
  })

  it('日付を変えても、目標と起点は残る', () => {
    const saved = withTargets(makeContest(NAME, '2026-10-17', 'a'), { weight: 65 }, { weight: { date: '2026-10-01', value: 68 } })
    seedContests([saved])
    renderContestEditor()
    fireEvent.change(input(`${NAME}の日付`), { target: { value: '2026-12-24' } })
    expect(readStoredContests()[0]).toEqual({ ...saved, date: '2026-12-24' })
  })

  it('大会を新しく追加しても、既存の大会の目標は残り、新しい大会に目標は付かない', async () => {
    seedContests([withTargets(makeContest(NAME, '2026-10-17', 'a'), { weight: 65 }, { weight: { date: '2026-10-01', value: 68 } })])
    renderContestEditor()
    fireEvent.change(screen.getByLabelText('追加する大会の名前'), { target: { value: '新しい大会' } })
    fireEvent.change(screen.getByLabelText('追加する大会の日付'), { target: { value: '2026-12-24' } })
    await userEvent.click(screen.getByRole('button', { name: '大会を追加' }))
    const stored = readStoredContests()
    expect(stored).toHaveLength(2)
    expect(stored.find((contest) => contest.id === 'a')?.targets).toEqual({ weight: 65 })
    const added = stored.find((contest) => contest.id !== 'a')
    expect(added).toBeDefined()
    expect(added).not.toHaveProperty('targets')
    expect(screen.getByRole('button', { name: 'この大会の目標を入れる（新しい大会）' })).toBeInTheDocument()
  })
})

describe('ContestEditor — 過ぎた大会を削除すると、あとの大会へ起点が引き継がれる', () => {
  const records = [
    makeBodyRecord('2026-09-01', { weight: 68 }),
    makeBodyRecord('2026-10-01', { weight: 62 }),
    makeBodyRecord('2026-10-05', { weight: 62.5 }),
  ]
  // 記録を渡して描画すると、起点の値が無い目標は埋められる。比べやすいよう、どちらも起点の値を持たせておく
  const autumn = withTargets(
    makeContest('秋の大会', '2026-10-01', 'autumn'),
    { weight: 62 },
    { weight: { date: '2026-09-01', value: 68 } },
  )
  const winter = withTargets(
    makeContest('冬の大会', '2026-12-01', 'winter'),
    { weight: 66 },
    { weight: { date: '2026-09-01', value: 68 } },
  )

  it('再現2: 秋の大会（終わった・目標 62）を削除すると、冬の大会の起点が { 10/01, その日の値 62 } になる', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    seedContests([autumn, winter])
    renderContestEditor({ bodyRecords: records, bodySettings: KG_SETTINGS })
    await userEvent.click(screen.getByRole('button', { name: '秋の大会を削除' }))
    expect(readStoredContests()).toEqual([{ ...winter, targetOrigins: { weight: { date: '2026-10-01', value: 62 } } }])
  })

  it('これからの大会を削除しても、あとの大会の起点は変わらない', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const upcoming = withTargets(makeContest('これからの大会', '2026-10-20', 'upcoming'), { weight: 62 })
    seedContests([upcoming, winter])
    renderContestEditor({ bodyRecords: records, bodySettings: KG_SETTINGS })
    await userEvent.click(screen.getByRole('button', { name: 'これからの大会を削除' }))
    expect(readStoredContests()).toEqual([winter])
  })

  it('削除をキャンセルしたら、起点も変わらない', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    seedContests([autumn, winter])
    renderContestEditor({ bodyRecords: records, bodySettings: KG_SETTINGS })
    await userEvent.click(screen.getByRole('button', { name: '秋の大会を削除' }))
    expect(readStoredContests()).toEqual([autumn, winter])
  })
})

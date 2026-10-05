import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ContestEditor from './ContestEditor'
import { makeContest, readStoredContests, seedContests, withTargets } from '../../test/contests'
import { setupFixedClock } from '../../test/fixedClock'
import type { GoalMetric } from '../../types'

/**
 * 大会ごとの目標の入力。今日は 2026-10-05（月）に固定する（目標を入れた日 = targetsSetOn に使われる）。
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

const OPEN_BUTTON = { name: `${NAME}の目標を入れる` }
const GROUP = { name: `${NAME}の目標` }

const LABELS: Record<GoalMetric, string> = {
  weight: `${NAME}の目標体重`,
  bodyFat: `${NAME}の目標体脂肪率`,
  muscleMass: `${NAME}の目標筋肉量`,
}

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
async function openTargets(): Promise<void> {
  seedContests([plain()])
  render(<ContestEditor />)
  await userEvent.click(screen.getByRole('button', OPEN_BUTTON))
}

describe('ContestEditor — 目標の欄を開く（目標が1つも無い大会）', () => {
  it('ボタン「この大会の目標を入れる」が出て、最初は閉じている（aria-expanded="false"）', () => {
    seedContests([plain()])
    render(<ContestEditor />)
    const button = screen.getByRole('button', OPEN_BUTTON)
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveAttribute('type', 'button')
  })

  it('閉じている間は、目標の欄（group・3つの入力）が出ない', () => {
    seedContests([plain()])
    render(<ContestEditor />)
    expect(screen.queryByRole('group', GROUP)).not.toBeInTheDocument()
    for (const label of Object.values(LABELS)) {
      expect(screen.queryByLabelText(label)).not.toBeInTheDocument()
    }
  })

  it('押すと、目標の欄（role="group"、aria-label「{大会名}の目標」）が開く', async () => {
    await openTargets()
    expect(screen.getByRole('group', GROUP)).toBeInTheDocument()
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

  it('キーボード（フォーカスして Enter）でも開く', async () => {
    seedContests([plain()])
    render(<ContestEditor />)
    screen.getByRole('button', OPEN_BUTTON).focus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('group', GROUP)).toBeInTheDocument()
  })

  it('開くだけでは保存データは変わらない', async () => {
    await openTargets()
    expect(readStoredContests()).toEqual([plain()])
  })

  it('大会ごとに別のボタン（名前つき）と別の欄になる。片方を開いてももう片方は閉じたまま', async () => {
    seedContests([makeContest('大会いち', '2026-10-17', 'a'), makeContest('大会に', '2026-11-03', 'b')])
    render(<ContestEditor />)
    await userEvent.click(screen.getByRole('button', { name: '大会いちの目標を入れる' }))
    expect(screen.getByRole('group', { name: '大会いちの目標' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: '大会にの目標' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '大会にの目標を入れる' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('過ぎた大会の行にもボタンが出る', () => {
    seedContests([makeContest('終わった大会', '2026-09-01', 'a')])
    render(<ContestEditor />)
    expect(screen.getByRole('button', { name: '終わった大会の目標を入れる' })).toBeInTheDocument()
  })

  it('大会が1件も無ければ、目標のボタンも欄も無い', () => {
    render(<ContestEditor />)
    expect(screen.queryByRole('button', { name: /の目標を入れる$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('currentValues を渡しても省略しても、同じように開く（今回は表示には使わない）', async () => {
    seedContests([plain()])
    render(<ContestEditor currentValues={{ weight: 68.2, bodyFat: 20, muscleMass: 36 }} />)
    await userEvent.click(screen.getByRole('button', OPEN_BUTTON))
    expect(screen.getByRole('group', GROUP)).toBeInTheDocument()
    for (const label of Object.values(LABELS)) expect(input(label)).toHaveValue(null)
  })
})

describe('ContestEditor — 目標がある大会は最初から開いている', () => {
  it('ボタンは出ず、欄が開いていて、保存済みの値が入っている', () => {
    seedContests([withTargets(plain(), { weight: 65, muscleMass: 40 }, { weight: '2026-10-01' })])
    render(<ContestEditor />)
    expect(screen.queryByRole('button', OPEN_BUTTON)).not.toBeInTheDocument()
    expect(screen.getByRole('group', GROUP)).toBeInTheDocument()
    expect(input(LABELS.weight)).toHaveValue(65)
    expect(input(LABELS.bodyFat)).toHaveValue(null)
    expect(input(LABELS.muscleMass)).toHaveValue(40)
  })

  it('1項目だけでも開いている（体脂肪率だけ）', () => {
    seedContests([withTargets(plain(), { bodyFat: 12.5 })])
    render(<ContestEditor />)
    expect(screen.getByRole('group', GROUP)).toBeInTheDocument()
    expect(input(LABELS.bodyFat)).toHaveValue(12.5)
  })

  it('大会ごとに判断する（目標のある大会は開き、無い大会はボタン）', () => {
    seedContests([
      withTargets(makeContest('目標あり', '2026-10-17', 'a'), { weight: 65 }),
      makeContest('目標なし', '2026-11-03', 'b'),
    ])
    render(<ContestEditor />)
    expect(screen.getByRole('group', { name: '目標ありの目標' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '目標ありの目標を入れる' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: '目標なしの目標' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '目標なしの目標を入れる' })).toBeInTheDocument()
  })

  it('壊れた targets（値が 0 など）しか無い大会は「目標なし」としてボタンが出る', () => {
    seedContests([{ ...plain(), targets: { weight: 0, bodyFat: 'x' } }])
    render(<ContestEditor />)
    expect(screen.getByRole('button', OPEN_BUTTON)).toBeInTheDocument()
    expect(screen.queryByRole('group', GROUP)).not.toBeInTheDocument()
  })
})

describe('ContestEditor — 目標を入れる（blur で保存）', () => {
  it('目標体重 65 を blur すると、targets.weight = 65・targetsSetOn.weight = 今日で保存される', async () => {
    await openTargets()
    enter(LABELS.weight, '65')
    expect(readStoredContests()[0]).toEqual({
      ...plain(),
      targets: { weight: 65 },
      targetsSetOn: { weight: TODAY_TEXT },
    })
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
    expect(stored.targetsSetOn).toEqual({ [metric]: TODAY_TEXT })
  })

  it('3項目を続けて入れると、3項目とも保存される', async () => {
    await openTargets()
    enter(LABELS.weight, '65')
    enter(LABELS.bodyFat, '12')
    enter(LABELS.muscleMass, '40')
    const [stored] = readStoredContests()
    expect(stored.targets).toEqual({ weight: 65, bodyFat: 12, muscleMass: 40 })
    expect(stored.targetsSetOn).toEqual({ weight: TODAY_TEXT, bodyFat: TODAY_TEXT, muscleMass: TODAY_TEXT })
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

  it('目標が入ると、ボタン「この大会の目標を入れる」は出なくなる', async () => {
    await openTargets()
    enter(LABELS.weight, '65')
    expect(screen.queryByRole('button', OPEN_BUTTON)).not.toBeInTheDocument()
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
    render(<ContestEditor />)
    const before = readStoredContests().map((contest) => contest.id)

    fireEvent.click(screen.getByRole('button', { name: '遠い大会の目標を入れる' }))
    enter('遠い大会の目標体重', '65')

    expect(readStoredContests().map((contest) => contest.id)).toEqual(before)
    const names = screen.getAllByLabelText(/^(?!追加する大会の名前$).+の名前$/) as HTMLInputElement[]
    expect(names.map((element) => element.value)).toEqual(['近い大会', '遠い大会'])
  })

  it('ほかの大会の目標には影響しない', () => {
    seedContests([
      withTargets(makeContest('大会いち', '2026-10-17', 'a'), { weight: 65 }, { weight: '2026-10-01' }),
      makeContest('大会に', '2026-11-03', 'b'),
    ])
    render(<ContestEditor />)
    fireEvent.click(screen.getByRole('button', { name: '大会にの目標を入れる' }))
    enter('大会にの目標体脂肪率', '12')

    const [first, second] = readStoredContests()
    expect(first.targets).toEqual({ weight: 65 })
    expect(first.targetsSetOn).toEqual({ weight: '2026-10-01' })
    expect(second.targets).toEqual({ bodyFat: 12 })
  })

  it('小数 1 桁の目標をそのまま保存する（62.5）', async () => {
    await openTargets()
    enter(LABELS.weight, '62.5')
    expect(readStoredContests()[0].targets).toEqual({ weight: 62.5 })
  })
})

describe('ContestEditor — 値が変わったときだけ保存する', () => {
  const SAVED = withTargets(
    makeContest(NAME, '2026-10-17', 'a'),
    { weight: 65, bodyFat: 12 },
    { weight: '2026-09-01', bodyFat: '2026-09-02' },
  )

  it('同じ値のまま blur し直しても、targetsSetOn は変わらない', () => {
    seedContests([SAVED])
    render(<ContestEditor />)
    enter(LABELS.weight, '65')
    expect(readStoredContests()[0]).toEqual(SAVED)
  })

  it('同じ値を別の書き方（65.0）で blur しても変わらない', () => {
    seedContests([SAVED])
    render(<ContestEditor />)
    enter(LABELS.weight, '65.0')
    expect(readStoredContests()[0]).toEqual(SAVED)
  })

  it('何も触らずに blur しても変わらない（欄に入っている値のまま）', () => {
    seedContests([SAVED])
    render(<ContestEditor />)
    fireEvent.blur(input(LABELS.weight))
    expect(readStoredContests()[0]).toEqual(SAVED)
  })

  it('値を変えると、その項目の目標と targetsSetOn が更新され、ほかの項目は変わらない', () => {
    seedContests([SAVED])
    render(<ContestEditor />)
    enter(LABELS.weight, '63')
    expect(readStoredContests()[0]).toEqual({
      ...SAVED,
      targets: { weight: 63, bodyFat: 12 },
      targetsSetOn: { weight: TODAY_TEXT, bodyFat: '2026-09-02' },
    })
  })

  it('目標の無い項目に空のまま blur しても、何も保存しない（setOn も作らない）', () => {
    seedContests([SAVED])
    render(<ContestEditor />)
    enter(LABELS.muscleMass, '')
    expect(readStoredContests()[0]).toEqual(SAVED)
  })

  it('目標の無い大会で、開いただけ・空のまま blur しただけなら、保存データは元のまま', async () => {
    await openTargets()
    enter(LABELS.weight, '')
    enter(LABELS.bodyFat, '')
    expect(readStoredContests()[0]).toEqual(plain())
    expect(readStoredContests()[0]).not.toHaveProperty('targets')
    expect(readStoredContests()[0]).not.toHaveProperty('targetsSetOn')
  })
})

describe('ContestEditor — 空・0・負数・数値でない入力は、その項目の目標を消す', () => {
  const SAVED = withTargets(
    makeContest(NAME, '2026-10-17', 'a'),
    { weight: 65, bodyFat: 12 },
    { weight: '2026-09-01', bodyFat: '2026-09-02' },
  )

  it.each([
    ['空', ''],
    ['0', '0'],
    ['0.0', '0.0'],
    ['負数', '-5'],
    ['数値でない文字', 'abc'],
  ])('入力が「%s」なら、その項目を targets と targetsSetOn の両方から取り除く', (_label, text) => {
    seedContests([SAVED])
    render(<ContestEditor />)
    enter(LABELS.weight, text)
    const [stored] = readStoredContests()
    expect(stored.targets).toEqual({ bodyFat: 12 })
    expect(stored.targetsSetOn).toEqual({ bodyFat: '2026-09-02' })
  })

  it('最後の1項目を消すと、targets・targetsSetOn のキーが保存データから無くなる', () => {
    seedContests([withTargets(makeContest(NAME, '2026-10-17', 'a'), { weight: 65 }, { weight: '2026-09-01' })])
    render(<ContestEditor />)
    enter(LABELS.weight, '')
    expect(readStoredContests()[0]).toEqual(plain())
    expect(readStoredContests()[0]).not.toHaveProperty('targets')
    expect(readStoredContests()[0]).not.toHaveProperty('targetsSetOn')
  })

  it('消しても大会の名前・日付は変わらない', () => {
    seedContests([SAVED])
    render(<ContestEditor />)
    enter(LABELS.weight, '')
    expect(readStoredContests()[0]).toMatchObject({ id: 'a', name: NAME, date: '2026-10-17' })
  })

  it('消したあとで、また入れられる（入れた日が今日で記録される）', () => {
    seedContests([SAVED])
    render(<ContestEditor />)
    enter(LABELS.weight, '')
    enter(LABELS.weight, '60')
    const [stored] = readStoredContests()
    expect(stored.targets).toEqual({ weight: 60, bodyFat: 12 })
    expect(stored.targetsSetOn).toEqual({ weight: TODAY_TEXT, bodyFat: '2026-09-02' })
  })
})

describe('ContestEditor — 目標と大会の削除・名前・日付', () => {
  it('目標のある大会を削除すると、目標も一緒に消える', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    seedContests([
      withTargets(makeContest(NAME, '2026-10-17', 'a'), { weight: 65 }, { weight: '2026-10-01' }),
      makeContest('秋の大会', '2026-11-03', 'b'),
    ])
    render(<ContestEditor />)
    await userEvent.click(screen.getByRole('button', { name: `${NAME}を削除` }))
    expect(readStoredContests()).toEqual([makeContest('秋の大会', '2026-11-03', 'b')])
    expect(JSON.stringify(readStoredContests())).not.toContain('targets')
    expect(screen.queryByRole('group', GROUP)).not.toBeInTheDocument()
  })

  it('削除をキャンセルしたら、目標は残る', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const saved = withTargets(makeContest(NAME, '2026-10-17', 'a'), { weight: 65 }, { weight: '2026-10-01' })
    seedContests([saved])
    render(<ContestEditor />)
    await userEvent.click(screen.getByRole('button', { name: `${NAME}を削除` }))
    expect(readStoredContests()).toEqual([saved])
    expect(input(LABELS.weight)).toHaveValue(65)
  })

  it('名前を変えても、目標は残る（欄のラベルは新しい名前になる）', () => {
    seedContests([withTargets(makeContest(NAME, '2026-10-17', 'a'), { weight: 65 }, { weight: '2026-10-01' })])
    render(<ContestEditor />)
    fireEvent.blur(input(`${NAME}の名前`), { target: { value: '全日本大会' } })
    expect(readStoredContests()[0]).toMatchObject({
      name: '全日本大会',
      targets: { weight: 65 },
      targetsSetOn: { weight: '2026-10-01' },
    })
    expect(screen.getByLabelText('全日本大会の目標体重')).toHaveValue(65)
  })

  it('日付を変えても、目標は残る', () => {
    seedContests([withTargets(makeContest(NAME, '2026-10-17', 'a'), { weight: 65 }, { weight: '2026-10-01' })])
    render(<ContestEditor />)
    fireEvent.change(input(`${NAME}の日付`), { target: { value: '2026-12-24' } })
    expect(readStoredContests()[0]).toMatchObject({
      date: '2026-12-24',
      targets: { weight: 65 },
      targetsSetOn: { weight: '2026-10-01' },
    })
  })

  it('大会を新しく追加しても、既存の大会の目標は残り、新しい大会に目標は付かない', async () => {
    seedContests([withTargets(makeContest(NAME, '2026-10-17', 'a'), { weight: 65 }, { weight: '2026-10-01' })])
    render(<ContestEditor />)
    fireEvent.change(screen.getByLabelText('追加する大会の名前'), { target: { value: '新しい大会' } })
    fireEvent.change(screen.getByLabelText('追加する大会の日付'), { target: { value: '2026-12-24' } })
    await userEvent.click(screen.getByRole('button', { name: '大会を追加' }))
    const stored = readStoredContests()
    expect(stored).toHaveLength(2)
    expect(stored.find((contest) => contest.id === 'a')?.targets).toEqual({ weight: 65 })
    const added = stored.find((contest) => contest.id !== 'a')
    expect(added).toBeDefined()
    expect(added).not.toHaveProperty('targets')
    expect(screen.getByRole('button', { name: '新しい大会の目標を入れる' })).toBeInTheDocument()
  })
})

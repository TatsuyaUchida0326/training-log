import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HomePage from './HomePage'
import { DEFAULT_EXERCISES } from '../../data/defaultExercises'
import { makeContest, nestedGoalRows, queryNestedGoalList, readStoredContests, seedContests, withTargets } from '../../test/contests'
import { setupFixedClock } from '../../test/fixedClock'
import { makeBodyRecord, seedBodyRecords, seedBodySettings } from '../../test/seed'
import { applySampleData } from '../../utils/sampleData'

/**
 * ホームのカードが、calcGoalProgress(bodyRecords, bodySettings, { contests, today }) の結果を出す。
 * 今日は 2026-10-05（月）12:00 に固定する。
 */
setupFixedClock(new Date(2026, 9, 5, 12))

const CONTEST_LIST = { name: '大会までの残り日数' }
const STANDALONE_GOAL_LIST = { name: '目標までの残り' }
const ANY_NESTED_GOAL_LIST = { name: /.+の目標までの残り$/ }

beforeEach(() => {
  localStorage.clear()
})

function renderHomePage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/body" element={<div data-testid="body-page" />} />
        <Route path="/date/:dateStr" element={<div data-testid="detail-page" />} />
        <Route path="/date/:dateStr/exercises/:exerciseId" element={<div data-testid="entry-page" />} />
      </Routes>
    </MemoryRouter>,
  )
}

const BODY_CONTEST = () => makeContest('ボディコンテスト', '2026-10-17', 'c1')

describe('HomePage — 大会の目標があるとき', () => {
  it('一番近い大会の行の中に「ボディコンテストの目標までの残り」が出て、「あと 3.2 kg 減」と読める', () => {
    seedBodyRecords([makeBodyRecord('2026-10-03', { weight: 68.2 })])
    seedContests([withTargets(BODY_CONTEST(), { weight: 65 }, { weight: { date: '2026-10-01', value: 68.2 } })])
    renderHomePage()

    const nested = screen.getByRole('list', { name: 'ボディコンテストの目標までの残り' })
    expect(nested).toHaveTextContent('68.2 → 目標 65.0 kg')
    expect(nested).toHaveTextContent(/あと\s*3\.2\s*kg\s*減/)
    expect(screen.getByRole('list', CONTEST_LIST)).toContainElement(nested)
  })

  it('このとき独立した「目標までの残り」リストは出ない', () => {
    seedBodyRecords([makeBodyRecord('2026-10-03', { weight: 68.2 })])
    seedContests([withTargets(BODY_CONTEST(), { weight: 65 }, { weight: { date: '2026-10-01', value: 68.2 } })])
    renderHomePage()
    expect(screen.queryByRole('list', STANDALONE_GOAL_LIST)).not.toBeInTheDocument()
  })

  it('大会の行そのもの（名前・日付・あと 12 日）は今までどおり', () => {
    seedBodyRecords([makeBodyRecord('2026-10-03', { weight: 68.2 })])
    seedContests([withTargets(BODY_CONTEST(), { weight: 65 }, { weight: { date: '2026-10-01', value: 68.2 } })])
    renderHomePage()
    const list = screen.getByRole('list', CONTEST_LIST)
    expect(list).toHaveTextContent('ボディコンテスト')
    expect(list).toHaveTextContent('10月17日（土）')
    expect(list).toHaveTextContent(/あと\s*12\s*日/)
  })

  it('大会の目標のあと、体重が増えても減らす目標のまま（目標を入れた日以降で最初の記録が基準）', () => {
    seedBodyRecords([
      makeBodyRecord('2026-10-03', { weight: 68.2 }),
      makeBodyRecord('2026-10-04', { weight: 70 }),
    ])
    seedContests([withTargets(BODY_CONTEST(), { weight: 65 }, { weight: { date: '2026-10-01', value: 68.2 } })])
    renderHomePage()
    expect(nestedGoalRows('ボディコンテスト')[0]).toHaveTextContent(/あと\s*5\.0\s*kg\s*減/)
  })

  it('目標を超えたら「達成」', () => {
    seedBodyRecords([
      makeBodyRecord('2026-10-03', { weight: 68.2 }),
      makeBodyRecord('2026-10-04', { weight: 64.5 }),
    ])
    seedContests([withTargets(BODY_CONTEST(), { weight: 65 }, { weight: { date: '2026-10-01', value: 68.2 } })])
    renderHomePage()
    const [row] = nestedGoalRows('ボディコンテスト')
    expect(row).toHaveTextContent('達成')
    expect(row).not.toHaveTextContent('あと')
  })

  it('ふだんの目標（体脂肪率）も、同じ入れ子の中に体重（大会）と並ぶ', () => {
    seedBodyRecords([makeBodyRecord('2026-10-03', { weight: 68.2, bodyFat: 20 })])
    seedBodySettings({ targetBodyFat: 15, goalBaselines: { bodyFat: 20 } })
    seedContests([withTargets(BODY_CONTEST(), { weight: 65 }, { weight: { date: '2026-10-01', value: 68.2 } })])
    renderHomePage()
    const rows = nestedGoalRows('ボディコンテスト')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('体重')
    expect(rows[0]).toHaveTextContent('目標 65.0 kg')
    expect(rows[1]).toHaveTextContent('体脂肪率')
    expect(rows[1]).toHaveTextContent('20.0 → 目標 15.0 %')
    expect(screen.queryByRole('list', STANDALONE_GOAL_LIST)).not.toBeInTheDocument()
  })

  it('大会の目標はふだんの目標より優先する（ふだん 70 kg・大会 65 kg → 65.0 kg）', () => {
    seedBodyRecords([makeBodyRecord('2026-10-03', { weight: 68.2 })])
    seedBodySettings({ targetWeight: 70 })
    seedContests([withTargets(BODY_CONTEST(), { weight: 65 }, { weight: { date: '2026-10-01', value: 68.2 } })])
    renderHomePage()
    const [row] = nestedGoalRows('ボディコンテスト')
    expect(row).toHaveTextContent('目標 65.0 kg')
    expect(row).not.toHaveTextContent('70.0')
  })

  it('当日の大会の行にも入れ子で出る', () => {
    seedBodyRecords([makeBodyRecord('2026-10-03', { weight: 68.2 })])
    seedContests([withTargets(makeContest('今日の大会', '2026-10-05', 'c1'), { weight: 65 }, { weight: { date: '2026-10-01', value: 68.2 } })])
    renderHomePage()
    expect(screen.getByRole('list', CONTEST_LIST)).toHaveTextContent('今日')
    expect(queryNestedGoalList('今日の大会')).toBeInTheDocument()
  })

  it('大会の目標があっても、体重の記録が無ければ入れ子は出ない（大会の行だけ）', () => {
    seedContests([withTargets(BODY_CONTEST(), { weight: 65 }, { weight: { date: '2026-10-01', value: 68.2 } })])
    renderHomePage()
    expect(screen.getByRole('list', CONTEST_LIST)).toBeInTheDocument()
    expect(screen.queryByRole('list', ANY_NESTED_GOAL_LIST)).not.toBeInTheDocument()
    expect(screen.queryByRole('list', STANDALONE_GOAL_LIST)).not.toBeInTheDocument()
  })

  it('4件以上の大会があっても、入れ子は先頭の大会だけで、「ほか 1 件」も今までどおり出る', () => {
    seedBodyRecords([makeBodyRecord('2026-10-03', { weight: 68.2 })])
    seedContests([
      withTargets(makeContest('大会いち', '2026-10-06', 'c1'), { weight: 65 }, { weight: { date: '2026-10-01', value: 68.2 } }),
      makeContest('大会に', '2026-10-07', 'c2'),
      makeContest('大会さん', '2026-10-08', 'c3'),
      makeContest('大会よん', '2026-10-09', 'c4'),
    ])
    renderHomePage()
    expect(queryNestedGoalList('大会いち')).toBeInTheDocument()
    expect(screen.getAllByRole('list', ANY_NESTED_GOAL_LIST)).toHaveLength(1)
    expect(screen.getByRole('link', { name: /ほか\s*1\s*件/ })).toHaveAttribute('href', '/body')
  })
})

describe('HomePage — 一番近い大会が切り替わる', () => {
  const X = () => withTargets(makeContest('大会X', '2026-10-10', 'x'), { weight: 62 }, { weight: { date: '2026-09-01', value: 68.2 } })
  const Y = () => withTargets(makeContest('大会Y', '2026-11-20', 'y'), { weight: 66 }, { weight: { date: '2026-09-01', value: 68.2 } })

  beforeEach(() => {
    seedBodyRecords([
      makeBodyRecord('2026-09-01', { weight: 68 }),
      makeBodyRecord('2026-10-10', { weight: 62 }),
      makeBodyRecord('2026-10-14', { weight: 62.3 }),
    ])
    seedContests([X(), Y()])
  })

  it('X が一番近い間は、X の目標（62）を出す', () => {
    renderHomePage()
    expect(queryNestedGoalList('大会X')).toBeInTheDocument()
    expect(queryNestedGoalList('大会Y')).not.toBeInTheDocument()
  })

  it('X が過ぎたら Y の目標（66）に切り替わる。起点は X の日なので「あと 3.7 kg 増」', () => {
    vi.setSystemTime(new Date(2026, 9, 15, 12))
    renderHomePage()
    expect(queryNestedGoalList('大会X')).not.toBeInTheDocument()
    const [row] = nestedGoalRows('大会Y')
    expect(row).toHaveTextContent('62.3 → 目標 66.0 kg')
    expect(row).toHaveTextContent(/あと\s*3\.7\s*kg\s*増/)
    expect(row).not.toHaveTextContent('達成')
  })
})

describe('HomePage — 大会の目標が使われないとき（今の表示から何も変わらない）', () => {
  beforeEach(() => {
    seedBodyRecords([makeBodyRecord('2026-10-01', { weight: 68 })])
    seedBodySettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
  })

  it('大会を登録していない: ふだんの目標の独立したリスト', () => {
    renderHomePage()
    expect(screen.getByRole('list', STANDALONE_GOAL_LIST)).toHaveTextContent(/あと\s*3\.0\s*kg\s*減/)
    expect(screen.queryByRole('list', ANY_NESTED_GOAL_LIST)).not.toBeInTheDocument()
  })

  it('大会に目標が無い: 大会のリストと独立した目標のリストが別々に出る', () => {
    seedContests([BODY_CONTEST()])
    renderHomePage()
    const contestList = screen.getByRole('list', CONTEST_LIST)
    const goalList = screen.getByRole('list', STANDALONE_GOAL_LIST)
    expect(contestList).not.toContainElement(goalList)
    expect(within(contestList).queryByRole('list')).not.toBeInTheDocument()
    expect(goalList).toHaveTextContent(/あと\s*3\.0\s*kg\s*減/)
  })

  it('目標があるのは過ぎた大会だけ: ふだんの目標の独立リスト', () => {
    seedContests([
      withTargets(makeContest('終わった大会', '2026-09-01', 'old'), { weight: 60 }, { weight: { date: '2026-08-01', value: 68.2 } }),
    ])
    renderHomePage()
    expect(screen.getByRole('list', STANDALONE_GOAL_LIST)).toHaveTextContent('目標 65.0 kg')
    expect(screen.queryByRole('list', ANY_NESTED_GOAL_LIST)).not.toBeInTheDocument()
  })

  it('目標があるのは2件目の大会だけ: ふだんの目標の独立リスト', () => {
    seedContests([BODY_CONTEST(), withTargets(makeContest('秋の大会', '2026-11-03', 'c2'), { weight: 60 })])
    renderHomePage()
    expect(screen.getByRole('list', STANDALONE_GOAL_LIST)).toHaveTextContent('目標 65.0 kg')
    expect(screen.queryByRole('list', ANY_NESTED_GOAL_LIST)).not.toBeInTheDocument()
  })

  it('一番近い大会に壊れた目標（0・文字列）しか無い: ふだんの目標の独立リスト', () => {
    seedContests([{ ...BODY_CONTEST(), targets: { weight: 0, bodyFat: 'x' } }])
    renderHomePage()
    expect(screen.getByRole('list', STANDALONE_GOAL_LIST)).toHaveTextContent('目標 65.0 kg')
    expect(screen.queryByRole('list', ANY_NESTED_GOAL_LIST)).not.toBeInTheDocument()
  })
})

describe('HomePage — 体重・体脂肪率のグラフの目標線は、カードと同じ目標を出す', () => {
  const WEIGHT_LABEL = /^目標 [\d.]+ kg$/
  const BODY_FAT_LABEL = /^目標 [\d.]+ %$/

  beforeEach(() => {
    seedBodyRecords([
      makeBodyRecord('2026-10-01', { weight: 73, bodyFat: 21 }),
      makeBodyRecord('2026-10-03', { weight: 72.8, bodyFat: 20.8 }),
    ])
  })

  it('一番近い大会に体重の目標があれば、ふだんの目標ではなく大会の目標（72.5）を出す', () => {
    seedBodySettings({ targetWeight: 72 })
    seedContests([withTargets(makeContest('ボディコンテスト', '2026-10-17', 'c1'), { weight: 72.5 })])
    renderHomePage()
    expect(within(screen.getByTestId('weight-chart')).getByText('目標 72.5 kg')).toBeInTheDocument()
    expect(screen.queryByText('目標 72 kg')).not.toBeInTheDocument()
  })

  it('一番近い大会に体脂肪率の目標があれば、大会の目標（19.5）を出す', () => {
    seedBodySettings({ targetBodyFat: 18 })
    seedContests([withTargets(makeContest('ボディコンテスト', '2026-10-17', 'c1'), { bodyFat: 19.5 })])
    renderHomePage()
    expect(within(screen.getByTestId('bodyfat-chart')).getByText('目標 19.5 %')).toBeInTheDocument()
    expect(screen.queryByText('目標 18 %')).not.toBeInTheDocument()
  })

  it('項目ごとに決める（体重は大会の目標・体脂肪率はふだんの目標）', () => {
    seedBodySettings({ targetWeight: 72, targetBodyFat: 18 })
    seedContests([withTargets(makeContest('ボディコンテスト', '2026-10-17', 'c1'), { weight: 72.5 })])
    renderHomePage()
    expect(within(screen.getByTestId('weight-chart')).getByText('目標 72.5 kg')).toBeInTheDocument()
    expect(within(screen.getByTestId('bodyfat-chart')).getByText('目標 18 %')).toBeInTheDocument()
  })

  it('大会に目標が無ければ、ふだんの目標（今までと同じ）', () => {
    seedBodySettings({ targetWeight: 72, targetBodyFat: 18 })
    seedContests([makeContest('ボディコンテスト', '2026-10-17', 'c1')])
    renderHomePage()
    expect(within(screen.getByTestId('weight-chart')).getByText('目標 72 kg')).toBeInTheDocument()
    expect(within(screen.getByTestId('bodyfat-chart')).getByText('目標 18 %')).toBeInTheDocument()
  })

  it('大会を登録していなければ、ふだんの目標（今までと同じ）', () => {
    seedBodySettings({ targetWeight: 72 })
    renderHomePage()
    expect(within(screen.getByTestId('weight-chart')).getByText('目標 72 kg')).toBeInTheDocument()
  })

  it('目標があるのが過ぎた大会だけなら、ふだんの目標', () => {
    seedBodySettings({ targetWeight: 72 })
    seedContests([withTargets(makeContest('終わった大会', '2026-09-01', 'old'), { weight: 60 })])
    renderHomePage()
    expect(within(screen.getByTestId('weight-chart')).getByText('目標 72 kg')).toBeInTheDocument()
  })

  it('目標があるのが2件目の大会だけなら、ふだんの目標（一番近い大会だけを見る）', () => {
    seedBodySettings({ targetWeight: 72 })
    seedContests([
      makeContest('近い大会', '2026-10-17', 'c1'),
      withTargets(makeContest('次の大会', '2026-11-03', 'c2'), { weight: 60 }),
    ])
    renderHomePage()
    expect(within(screen.getByTestId('weight-chart')).getByText('目標 72 kg')).toBeInTheDocument()
  })

  it('大会が過ぎたら、次の大会の目標に切り替わる', () => {
    seedContests([
      withTargets(makeContest('近い大会', '2026-10-10', 'c1'), { weight: 71 }),
      withTargets(makeContest('次の大会', '2026-11-20', 'c2'), { weight: 70 }),
    ])
    const first = renderHomePage()
    expect(within(screen.getByTestId('weight-chart')).getByText('目標 71 kg')).toBeInTheDocument()
    first.unmount()

    vi.setSystemTime(new Date(2026, 9, 11, 12))
    renderHomePage()
    expect(within(screen.getByTestId('weight-chart')).getByText('目標 70 kg')).toBeInTheDocument()
  })

  it('どちらの目標も無ければ、目標線のラベルは出ない', () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17', 'c1')])
    renderHomePage()
    expect(within(screen.getByTestId('weight-chart')).queryByText(WEIGHT_LABEL)).not.toBeInTheDocument()
    expect(within(screen.getByTestId('bodyfat-chart')).queryByText(BODY_FAT_LABEL)).not.toBeInTheDocument()
  })

  it('サンプルデータを入れた直後: カードと同じ大会の目標を出す（ふだんの目標の 72 ではない）', () => {
    applySampleData(DEFAULT_EXERCISES, new Date(2026, 9, 5))
    const [contest] = readStoredContests()
    const weightTarget = contest.targets?.weight
    const bodyFatTarget = contest.targets?.bodyFat
    expect(weightTarget).toBeDefined()
    expect(bodyFatTarget).toBeDefined()
    renderHomePage()
    expect(within(screen.getByTestId('weight-chart')).getByText(`目標 ${weightTarget} kg`)).toBeInTheDocument()
    expect(within(screen.getByTestId('bodyfat-chart')).getByText(`目標 ${bodyFatTarget} %`)).toBeInTheDocument()
    // カードの目標の行にも同じ値が出ている
    expect(screen.getByRole('list', { name: '地区ボディコンテストの目標までの残り' })).toHaveTextContent(
      `目標 ${(weightTarget as number).toFixed(1)} kg`,
    )
  })
})

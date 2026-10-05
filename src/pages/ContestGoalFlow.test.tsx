import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PageHeaderProvider } from '../contexts/PageHeaderContext'
import BodyPage from './BodyPage/BodyPage'
import HomePage from './HomePage/HomePage'
import { nestedGoalRows, queryNestedGoalList, readStoredContests } from '../test/contests'
import { setupFixedClock } from '../test/fixedClock'

/**
 * 「体組成画面で体重を記録し、大会に目標を入れる → ホームの大会の行の中に残りが出る」を、保存データを介してつなぐ。
 * 画面は別々にマウントし直す（実際の画面遷移と同じ。状態の受け渡しは localStorage だけ）。
 * 今日は 2026-10-05（月）に固定する。2026-10-17 は「あと 12 日」。時計を進めるテストは vi.setSystemTime を使う。
 */
setupFixedClock(new Date(2026, 9, 5, 12))

const CONTEST_LIST = { name: '大会までの残り日数' }
const STANDALONE_GOAL_LIST = { name: '目標までの残り' }
const ANY_NESTED_GOAL_LIST = { name: /.+の目標までの残り$/ }

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function visitBodyPage() {
  return render(
    <PageHeaderProvider>
      <BodyPage />
    </PageHeaderProvider>,
  )
}

function visitHomePage() {
  return render(
    <PageHeaderProvider>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </PageHeaderProvider>,
  )
}

/** 体組成画面で入力欄に値を入れて blur し、画面を閉じる（今日の記録・ふだんの目標用） */
function enterOnBodyPage(label: string, value: string): void {
  const { unmount } = visitBodyPage()
  fireEvent.blur(screen.getByLabelText(label), { target: { value } })
  unmount()
}

/** 体組成画面で大会を追加し、画面を閉じる */
async function addContestOnBodyPage(name: string, date: string): Promise<void> {
  const { unmount } = visitBodyPage()
  fireEvent.change(screen.getByLabelText('追加する大会の名前'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('追加する大会の日付'), { target: { value: date } })
  await userEvent.click(screen.getByRole('button', { name: '大会を追加' }))
  unmount()
}

/** 体組成画面で、その大会の目標欄を（閉じていれば）開いて、項目に値を入れ、画面を閉じる */
async function enterContestTarget(name: string, field: '体重' | '体脂肪率' | '筋肉量', value: string): Promise<void> {
  const { unmount } = visitBodyPage()
  const openButton = screen.queryByRole('button', { name: `${name}の目標を入れる` })
  if (openButton) await userEvent.click(openButton)
  fireEvent.blur(screen.getByLabelText(`${name}の目標${field}`), { target: { value } })
  unmount()
}

const NAME = 'ボディコンテスト'

describe('大会の目標の設定からホーム表示まで', () => {
  it('体重 68.2 を記録 → 大会を追加 → 目標体重 65 を入れる → ホームの大会の行の中に「あと 3.2 kg 減」', async () => {
    enterOnBodyPage('体重', '68.2')
    await addContestOnBodyPage(NAME, '2026-10-17')
    await enterContestTarget(NAME, '体重', '65')

    visitHomePage()
    const [row] = nestedGoalRows(NAME)
    expect(row).toHaveTextContent('体重')
    expect(row).toHaveTextContent('68.2 → 目標 65.0 kg')
    expect(row).toHaveTextContent(/あと\s*3\.2\s*kg\s*減/)
    expect(screen.getByRole('list', CONTEST_LIST)).toContainElement(queryNestedGoalList(NAME))
    expect(screen.queryByRole('list', STANDALONE_GOAL_LIST)).not.toBeInTheDocument()
  })

  it('大会に目標を入れる前は、ホームに入れ子は無い（大会の行だけ）', async () => {
    enterOnBodyPage('体重', '68.2')
    await addContestOnBodyPage(NAME, '2026-10-17')

    visitHomePage()
    expect(screen.getByRole('list', CONTEST_LIST)).toBeInTheDocument()
    expect(screen.queryByRole('list', ANY_NESTED_GOAL_LIST)).not.toBeInTheDocument()
    expect(screen.queryByRole('list', STANDALONE_GOAL_LIST)).not.toBeInTheDocument()
  })

  it('ふだんの目標（体脂肪率 12）もあるとき、同じ入れ子の中に体重（大会）と体脂肪率（ふだん）が並ぶ', async () => {
    enterOnBodyPage('体重', '68.2')
    enterOnBodyPage('体脂肪', '20')
    enterOnBodyPage('目標体脂肪率', '12')
    await addContestOnBodyPage(NAME, '2026-10-17')
    await enterContestTarget(NAME, '体重', '65')

    visitHomePage()
    const rows = nestedGoalRows(NAME)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('体重')
    expect(rows[0]).toHaveTextContent('目標 65.0 kg')
    expect(rows[1]).toHaveTextContent('体脂肪率')
    expect(rows[1]).toHaveTextContent('20.0 → 目標 12.0 %')
    expect(screen.queryByRole('list', STANDALONE_GOAL_LIST)).not.toBeInTheDocument()
  })

  it('大会の目標を空にすると、入れ子が消える。ふだんの目標があれば独立したリストに戻る', async () => {
    enterOnBodyPage('体重', '68.2')
    enterOnBodyPage('体脂肪', '20')
    enterOnBodyPage('目標体脂肪率', '12')
    await addContestOnBodyPage(NAME, '2026-10-17')
    await enterContestTarget(NAME, '体重', '65')
    await enterContestTarget(NAME, '体重', '')

    visitHomePage()
    expect(screen.queryByRole('list', ANY_NESTED_GOAL_LIST)).not.toBeInTheDocument()
    const goalList = screen.getByRole('list', STANDALONE_GOAL_LIST)
    expect(goalList).toHaveTextContent('体脂肪率')
    expect(goalList).not.toHaveTextContent('体重')
    expect(screen.getByRole('list', CONTEST_LIST)).not.toContainElement(goalList)
  })

  it('大会の目標を空にして、ふだんの目標も無ければ、目標のリストは出ない（大会の行だけ）', async () => {
    enterOnBodyPage('体重', '68.2')
    await addContestOnBodyPage(NAME, '2026-10-17')
    await enterContestTarget(NAME, '体重', '65')
    await enterContestTarget(NAME, '体重', '')

    visitHomePage()
    expect(screen.getByRole('list', CONTEST_LIST)).toBeInTheDocument()
    expect(screen.queryByRole('list', ANY_NESTED_GOAL_LIST)).not.toBeInTheDocument()
    expect(screen.queryByRole('list', STANDALONE_GOAL_LIST)).not.toBeInTheDocument()
    expect(readStoredContests()[0]).not.toHaveProperty('targets')
  })

  it('大会を削除すると、ふだんの目標の表示（独立したリスト）に戻る', async () => {
    enterOnBodyPage('体重', '68.2')
    enterOnBodyPage('目標体重', '64')
    await addContestOnBodyPage(NAME, '2026-10-17')
    await enterContestTarget(NAME, '体重', '65')

    const first = visitHomePage()
    expect(nestedGoalRows(NAME)[0]).toHaveTextContent('目標 65.0 kg')
    first.unmount()

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const body = visitBodyPage()
    await userEvent.click(screen.getByRole('button', { name: `${NAME}を削除` }))
    body.unmount()

    visitHomePage()
    expect(screen.queryByRole('list', CONTEST_LIST)).not.toBeInTheDocument()
    expect(screen.queryByRole('list', ANY_NESTED_GOAL_LIST)).not.toBeInTheDocument()
    const goalList = screen.getByRole('list', STANDALONE_GOAL_LIST)
    expect(goalList).toHaveTextContent('目標 64.0 kg')
    expect(goalList).toHaveTextContent(/あと\s*4\.2\s*kg\s*減/)
    expect(JSON.stringify(readStoredContests())).not.toContain('targets')
  })
})

describe('大会が過ぎると、次の大会の目標に切り替わる', () => {
  async function setUpTwoContests(secondTarget: string | null, baseTargetWeight?: string): Promise<void> {
    enterOnBodyPage('体重', '68.2')
    if (baseTargetWeight !== undefined) enterOnBodyPage('目標体重', baseTargetWeight)
    await addContestOnBodyPage('近い大会', '2026-10-17')
    await addContestOnBodyPage('次の大会', '2026-11-20')
    await enterContestTarget('近い大会', '体重', '65')
    if (secondTarget !== null) await enterContestTarget('次の大会', '体重', secondTarget)
  }

  it('近い大会が一番近い間は、その大会の目標（65）', async () => {
    await setUpTwoContests('66')

    visitHomePage()
    expect(nestedGoalRows('近い大会')[0]).toHaveTextContent('目標 65.0 kg')
    expect(queryNestedGoalList('次の大会')).not.toBeInTheDocument()
  })

  it('大会が過ぎた日付に時計を進めると、次の大会の目標（66）に切り替わる（「あと 2.2 kg 減」）', async () => {
    await setUpTwoContests('66')

    vi.setSystemTime(new Date(2026, 9, 18, 12))
    visitHomePage()
    expect(queryNestedGoalList('近い大会')).not.toBeInTheDocument()
    const [row] = nestedGoalRows('次の大会')
    expect(row).toHaveTextContent('68.2 → 目標 66.0 kg')
    expect(row).toHaveTextContent(/あと\s*2\.2\s*kg\s*減/)
    expect(screen.queryByRole('list', STANDALONE_GOAL_LIST)).not.toBeInTheDocument()
  })

  it('大会当日はまだその大会の目標。翌日に切り替わる', async () => {
    await setUpTwoContests('66')

    vi.setSystemTime(new Date(2026, 9, 17, 23, 59))
    const sameDay = visitHomePage()
    expect(queryNestedGoalList('近い大会')).toBeInTheDocument()
    sameDay.unmount()

    vi.setSystemTime(new Date(2026, 9, 18, 0, 0, 10))
    visitHomePage()
    expect(queryNestedGoalList('近い大会')).not.toBeInTheDocument()
    expect(queryNestedGoalList('次の大会')).toBeInTheDocument()
  })

  it('次の大会に目標が無ければ、ふだんの目標の独立したリストになる', async () => {
    await setUpTwoContests(null, '64')

    vi.setSystemTime(new Date(2026, 9, 18, 12))
    visitHomePage()
    expect(screen.queryByRole('list', ANY_NESTED_GOAL_LIST)).not.toBeInTheDocument()
    const goalList = screen.getByRole('list', STANDALONE_GOAL_LIST)
    expect(goalList).toHaveTextContent('目標 64.0 kg')
    expect(screen.getByRole('list', CONTEST_LIST)).toHaveTextContent('次の大会')
  })

  it('次の大会に目標が無く、ふだんの目標も無ければ、目標のリストは出ない', async () => {
    await setUpTwoContests(null)

    vi.setSystemTime(new Date(2026, 9, 18, 12))
    visitHomePage()
    expect(screen.queryByRole('list', ANY_NESTED_GOAL_LIST)).not.toBeInTheDocument()
    expect(screen.queryByRole('list', STANDALONE_GOAL_LIST)).not.toBeInTheDocument()
  })

  it('全部の大会が過ぎたら、ふだんの目標の独立したリスト（大会の行も出ない）', async () => {
    await setUpTwoContests('66', '64')

    vi.setSystemTime(new Date(2026, 10, 21, 12))
    visitHomePage()
    expect(screen.queryByRole('list', CONTEST_LIST)).not.toBeInTheDocument()
    expect(screen.queryByRole('list', ANY_NESTED_GOAL_LIST)).not.toBeInTheDocument()
    expect(screen.getByRole('list', STANDALONE_GOAL_LIST)).toHaveTextContent('目標 64.0 kg')
  })
})

describe('目標を入れた日が向き（減らす・増やす）の基準になる', () => {
  it('翌日に 64.5 kg を記録すると、減らす目標（65）は「達成」になる', async () => {
    enterOnBodyPage('体重', '68.2')
    await addContestOnBodyPage(NAME, '2026-10-17')
    await enterContestTarget(NAME, '体重', '65')

    vi.setSystemTime(new Date(2026, 9, 6, 12))
    enterOnBodyPage('体重', '64.5')

    visitHomePage()
    const [row] = nestedGoalRows(NAME)
    expect(row).toHaveTextContent('達成')
    expect(row).not.toHaveTextContent('あと')
  })

  it('目標を入れたあとに体重が増えても「減らす目標」のまま（あと 5.0 kg 減）', async () => {
    enterOnBodyPage('体重', '68.2')
    await addContestOnBodyPage(NAME, '2026-10-17')
    await enterContestTarget(NAME, '体重', '65')

    vi.setSystemTime(new Date(2026, 9, 6, 12))
    enterOnBodyPage('体重', '70')

    visitHomePage()
    expect(nestedGoalRows(NAME)[0]).toHaveTextContent(/あと\s*5\.0\s*kg\s*減/)
  })

  it('同じ値のまま blur し直しても、目標を入れた日は変わらない（変わると 64.5 が基準になり「あと 0.5 増」になってしまう）', async () => {
    enterOnBodyPage('体重', '68.2')
    await addContestOnBodyPage(NAME, '2026-10-17')
    await enterContestTarget(NAME, '体重', '65')

    vi.setSystemTime(new Date(2026, 9, 6, 12))
    enterOnBodyPage('体重', '64.5')
    await enterContestTarget(NAME, '体重', '65') // 同じ値で blur し直す
    expect(readStoredContests()[0].targetsSetOn).toEqual({ weight: '2026-10-05' })

    visitHomePage()
    expect(nestedGoalRows(NAME)[0]).toHaveTextContent('達成')
  })

  it('目標の値を変えたら、変えた日が新しい基準になる（64.5 kg の日に 60 に変えると「あと 4.5 kg 減」）', async () => {
    enterOnBodyPage('体重', '68.2')
    await addContestOnBodyPage(NAME, '2026-10-17')
    await enterContestTarget(NAME, '体重', '65')

    vi.setSystemTime(new Date(2026, 9, 6, 12))
    enterOnBodyPage('体重', '64.5')
    await enterContestTarget(NAME, '体重', '60')
    expect(readStoredContests()[0].targetsSetOn).toEqual({ weight: '2026-10-06' })

    visitHomePage()
    expect(nestedGoalRows(NAME)[0]).toHaveTextContent(/あと\s*4\.5\s*kg\s*減/)
  })
})

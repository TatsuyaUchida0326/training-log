import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import HomePage from './HomePage'
import { CONTESTS_KEY, makeContest, seedContests } from '../../test/contests'
import { setupFixedClock } from '../../test/fixedClock'
import { makeBodyRecord, seedBodyRecords, seedBodySettings } from '../../test/seed'

// 今日を 2026-10-05（月）12:00 に固定する。2026-10-17 は「あと 12 日」
setupFixedClock(new Date(2026, 9, 5, 12))

const CONTEST_LIST = { name: '大会までの残り日数' }
const GOAL_LIST = { name: '目標までの残り' }

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

function contestRows(): HTMLElement[] {
  return within(screen.getByRole('list', CONTEST_LIST)).getAllByRole('listitem')
}

describe('HomePage — 大会を登録していない人（今の画面のまま）', () => {
  it('大会のリストも、カレンダー上部の残り日数も、カレンダーの大会の印も出ない', () => {
    renderHomePage()
    expect(screen.queryByRole('list', CONTEST_LIST)).not.toBeInTheDocument()
    expect(screen.queryByTestId('calendar-countdown')).not.toBeInTheDocument()
    expect(screen.queryByTestId('contest-name')).not.toBeInTheDocument()
  })

  it('大会も目標も無ければカードが出ず、ページ先頭はカレンダー', () => {
    const { container } = renderHomePage()
    const page = container.firstElementChild as HTMLElement
    expect(page.firstElementChild).toContainElement(screen.getByText('日')) // カレンダーの曜日見出し
    expect(screen.queryByRole('list', GOAL_LIST)).not.toBeInTheDocument()
  })

  it('保存データが空配列でも同じ', () => {
    seedContests([])
    const { container } = renderHomePage()
    const page = container.firstElementChild as HTMLElement
    expect(page.firstElementChild).toContainElement(screen.getByText('日'))
    expect(screen.queryByRole('list', CONTEST_LIST)).not.toBeInTheDocument()
  })

  it('「今日のトレーニング」も今まで通り出る', () => {
    renderHomePage()
    expect(screen.getByText('今日のトレーニング')).toBeInTheDocument()
    expect(screen.getByText('まだ記録がありません')).toBeInTheDocument()
  })
})

describe('HomePage — 大会のカード', () => {
  it('登録した大会が「名前・日付・あと ◯ 日」で出る', () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17')])
    renderHomePage()
    const [row] = contestRows()
    expect(row).toHaveTextContent('ボディコンテスト')
    expect(row).toHaveTextContent('10月17日（土）')
    expect(row).toHaveTextContent(/あと\s*12\s*日/)
  })

  it('大会だけで目標が無くてもカードが出て、ページ先頭になる（カレンダーより前）', () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17')])
    const { container } = renderHomePage()
    const list = screen.getByRole('list', CONTEST_LIST)
    const page = container.firstElementChild as HTMLElement
    expect(page.firstElementChild).toContainElement(list)
    expect(screen.queryByRole('list', GOAL_LIST)).not.toBeInTheDocument()
    const weekdayHeader = screen.getByText('日')
    expect(list.compareDocumentPosition(weekdayHeader) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('当日の大会は「今日」と出る', () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-05')])
    renderHomePage()
    const [row] = contestRows()
    expect(row).toHaveTextContent('今日')
    expect(row).not.toHaveTextContent('あと')
  })

  it('明日の大会は「あと 1 日」', () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-06')])
    renderHomePage()
    expect(contestRows()[0]).toHaveTextContent(/あと\s*1\s*日/)
  })

  it('過ぎた大会はカードに出ない（大会が過ぎたものだけならカード自体が出ない）', () => {
    seedContests([makeContest('終わった大会', '2026-10-04'), makeContest('もっと前', '2025-01-01')])
    renderHomePage()
    expect(screen.queryByRole('list', CONTEST_LIST)).not.toBeInTheDocument()
  })

  it('過ぎた大会と、これからの大会があれば、これからの大会だけが出る', () => {
    seedContests([makeContest('終わった大会', '2026-09-01'), makeContest('次の大会', '2026-10-17')])
    renderHomePage()
    const rows = contestRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('次の大会')
  })

  it('近い順に並ぶ（登録順が遠い順でも）', () => {
    seedContests([
      makeContest('三番目', '2027-01-10'),
      makeContest('一番目', '2026-10-06'),
      makeContest('二番目', '2026-11-03'),
    ])
    renderHomePage()
    const rows = contestRows()
    expect(rows[0]).toHaveTextContent('一番目')
    expect(rows[1]).toHaveTextContent('二番目')
    expect(rows[2]).toHaveTextContent('三番目')
  })

  it('同じ日の大会は登録順', () => {
    seedContests([
      makeContest('登録一番目', '2026-10-17'),
      makeContest('登録二番目', '2026-10-17'),
    ])
    renderHomePage()
    const rows = contestRows()
    expect(rows[0]).toHaveTextContent('登録一番目')
    expect(rows[1]).toHaveTextContent('登録二番目')
  })

  it('今年以外の年の大会は年つきの日付（2027年1月10日（日））', () => {
    seedContests([makeContest('新年の大会', '2027-01-10')])
    renderHomePage()
    expect(contestRows()[0]).toHaveTextContent('2027年1月10日（日）')
    expect(contestRows()[0]).toHaveTextContent(/あと\s*97\s*日/)
  })

  it('4件以上あれば先頭3件だけが行で、「ほか 2 件」が /body へのリンクになる', () => {
    seedContests([
      makeContest('大会いち', '2026-10-06'),
      makeContest('大会に', '2026-10-07'),
      makeContest('大会さん', '2026-10-08'),
      makeContest('大会よん', '2026-10-09'),
      makeContest('大会ご', '2026-10-10'),
    ])
    renderHomePage()
    expect(contestRows()).toHaveLength(3)
    expect(within(screen.getByRole('list', CONTEST_LIST)).queryByText('大会よん')).not.toBeInTheDocument()
    const link = screen.getByRole('link', { name: /ほか\s*2\s*件/ })
    expect(link).toHaveAttribute('href', '/body')
  })

  it('「ほか ◯ 件」を押すと体組成画面（/body）へ行く', async () => {
    seedContests(
      ['い', 'ろ', 'は', 'に'].map((name, index) => makeContest(`大会${name}`, `2026-10-0${6 + index}`)),
    )
    renderHomePage()
    await userEvent.click(screen.getByRole('link', { name: /ほか\s*1\s*件/ }))
    expect(screen.getByTestId('body-page')).toBeInTheDocument()
  })

  it('過ぎた大会は「ほか ◯ 件」に数えない（これからの大会が3件ならリンクは出ない）', () => {
    seedContests([
      makeContest('大会いち', '2026-10-06'),
      makeContest('大会に', '2026-10-07'),
      makeContest('大会さん', '2026-10-08'),
      makeContest('終わった大会', '2026-09-01'),
    ])
    renderHomePage()
    expect(contestRows()).toHaveLength(3)
    expect(screen.queryByRole('link', { name: /ほか/ })).not.toBeInTheDocument()
  })

  it('今日の時刻が 23:59 でも、翌日の大会は「あと 1 日」', () => {
    vi.setSystemTime(new Date(2026, 9, 5, 23, 59, 30))
    seedContests([makeContest('ボディコンテスト', '2026-10-06')])
    renderHomePage()
    expect(contestRows()[0]).toHaveTextContent(/あと\s*1\s*日/)
  })

  it('今日の時刻が 0:00:10 でも、2日後の大会は「あと 2 日」', () => {
    vi.setSystemTime(new Date(2026, 9, 5, 0, 0, 10))
    seedContests([makeContest('ボディコンテスト', '2026-10-07')])
    renderHomePage()
    expect(contestRows()[0]).toHaveTextContent(/あと\s*2\s*日/)
  })
})

describe('HomePage — 大会と目標を両方持つ人', () => {
  beforeEach(() => {
    seedBodySettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    seedBodyRecords([makeBodyRecord('2026-10-01', { weight: 68 })])
    seedContests([makeContest('ボディコンテスト', '2026-10-17')])
  })

  it('大会のリストと目標のリストが同じカードに出る', () => {
    renderHomePage()
    expect(screen.getByRole('list', CONTEST_LIST)).toBeInTheDocument()
    expect(screen.getByRole('list', GOAL_LIST)).toBeInTheDocument()
    expect(screen.getByRole('list', GOAL_LIST)).toHaveTextContent(/あと\s*3\.0\s*kg\s*減/)
  })

  it('大会のリストが目標のリストより先で、どちらもカレンダーより前', () => {
    renderHomePage()
    const contestList = screen.getByRole('list', CONTEST_LIST)
    const goalList = screen.getByRole('list', GOAL_LIST)
    const weekdayHeader = screen.getByText('日')
    expect(contestList.compareDocumentPosition(goalList) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(goalList.compareDocumentPosition(weekdayHeader) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('大会を持たず目標だけの人には、大会のリストは出ない', () => {
    localStorage.removeItem(CONTESTS_KEY)
    renderHomePage()
    expect(screen.queryByRole('list', CONTEST_LIST)).not.toBeInTheDocument()
    expect(screen.getByRole('list', GOAL_LIST)).toBeInTheDocument()
  })
})

describe('HomePage — カレンダーの大会の印', () => {
  it('大会の日のセルに印（読み上げ名の「大会: 名前」と名前の表示）が出る', () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17')])
    renderHomePage()
    const cell = screen.getByRole('button', { name: '10月17日（土）、大会: ボディコンテスト' })
    expect(within(cell).getByTestId('contest-name')).toHaveTextContent('ボディコンテスト')
  })

  it('過ぎた大会の日にも印が出る（カードには出ないがカレンダーには出る）', () => {
    seedContests([makeContest('終わった大会', '2026-10-01')])
    renderHomePage()
    expect(
      screen.getByRole('button', { name: '10月1日（木）、大会: 終わった大会' }),
    ).toBeInTheDocument()
  })

  it('カレンダー上部の残り日数（calendar-countdown）は渡さない（カードと重複させない）', () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17')])
    renderHomePage()
    expect(screen.queryByTestId('calendar-countdown')).not.toBeInTheDocument()
    // 「あと 12 日」はカードの1か所だけ
    expect(document.body.textContent?.match(/あと\s*12\s*日/g)).toHaveLength(1)
  })

  it('大会のある日を押すと、今まで通り日付詳細へ遷移する（ホームにはポップアップを足さない）', async () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17')])
    renderHomePage()
    await userEvent.click(screen.getByRole('button', { name: /^10月17日（土）/ }))
    expect(screen.getByTestId('detail-page')).toBeInTheDocument()
  })
})

describe('HomePage — 保存データが壊れていても落ちない', () => {
  it('JSON として壊れていても、画面は出て、大会は出ない', () => {
    localStorage.setItem(CONTESTS_KEY, 'INVALID_JSON{{{')
    expect(() => renderHomePage()).not.toThrow()
    expect(screen.queryByRole('list', CONTEST_LIST)).not.toBeInTheDocument()
    expect(screen.getByText('今日のトレーニング')).toBeInTheDocument()
  })

  it('配列でない値でも、画面は出て、大会は出ない', () => {
    localStorage.setItem(CONTESTS_KEY, '{"not":"an array"}')
    expect(() => renderHomePage()).not.toThrow()
    expect(screen.queryByRole('list', CONTEST_LIST)).not.toBeInTheDocument()
  })

  it('壊れた要素が混ざっていても、正しい大会だけが出る', () => {
    seedContests([
      null,
      'broken',
      { id: '', name: '空の id', date: '2026-10-17' },
      { id: 'x', name: '   ', date: '2026-10-17' },
      { id: 'y', name: '存在しない日', date: '2026-02-30' },
      makeContest('正しい大会', '2026-10-17'),
    ])
    expect(() => renderHomePage()).not.toThrow()
    const rows = contestRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('正しい大会')
  })

  it('壊れた要素しか無ければ、大会は何も出ない（今の画面のまま）', () => {
    seedContests([null, { id: 'y', name: 'x', date: '2026-02-30' }])
    const { container } = renderHomePage()
    expect(screen.queryByRole('list', CONTEST_LIST)).not.toBeInTheDocument()
    const page = container.firstElementChild as HTMLElement
    expect(page.firstElementChild).toContainElement(screen.getByText('日'))
  })
})

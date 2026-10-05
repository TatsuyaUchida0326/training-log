import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PageHeaderProvider } from '../contexts/PageHeaderContext'
import BodyPage from './BodyPage/BodyPage'
import HomePage from './HomePage/HomePage'
import { setupFixedClock } from '../test/fixedClock'

/**
 * 「体組成画面で大会を登録する → ホームに残り日数が出る → 体組成画面で削除する → ホームから消える」を、
 * 保存データを介してつなぐ。画面は別々にマウントし直す（実際の画面遷移と同じ。状態の受け渡しは localStorage だけ）。
 * 今日は 2026-10-05（月）に固定する。2026-10-17 は「あと 12 日」。
 */
setupFixedClock(new Date(2026, 9, 5, 12))

const CONTEST_LIST = { name: '大会までの残り日数' }

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

/** 体組成画面で大会を追加し、画面を閉じる */
async function addContestOnBodyPage(name: string, date: string): Promise<void> {
  const { unmount } = visitBodyPage()
  fireEvent.change(screen.getByLabelText('大会の名前'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('大会の日付'), { target: { value: date } })
  await userEvent.click(screen.getByRole('button', { name: '大会を追加' }))
  unmount()
}

describe('大会の登録からホーム表示まで', () => {
  it('何も登録していないホームには、大会のカードも残り日数も無い（今の画面のまま）', () => {
    const { container } = visitHomePage()
    expect(screen.queryByRole('list', CONTEST_LIST)).not.toBeInTheDocument()
    expect(screen.queryByTestId('calendar-countdown')).not.toBeInTheDocument()
    const page = container.firstElementChild as HTMLElement
    expect(page.firstElementChild).toContainElement(screen.getByText('日'))
  })

  it('体組成画面で大会を追加すると、ホームのカードに「あと 12 日」が出る', async () => {
    await addContestOnBodyPage('ボディコンテスト', '2026-10-17')

    visitHomePage()
    const list = screen.getByRole('list', CONTEST_LIST)
    expect(list).toHaveTextContent('ボディコンテスト')
    expect(list).toHaveTextContent('10月17日（土）')
    expect(list).toHaveTextContent(/あと\s*12\s*日/)
  })

  it('ホームのカレンダーにも、その日の印が出る', async () => {
    await addContestOnBodyPage('ボディコンテスト', '2026-10-17')

    visitHomePage()
    expect(screen.getByRole('button', { name: '10月17日（土）、大会: ボディコンテスト' })).toBeInTheDocument()
  })

  it('体組成画面で削除すると、ホームからカードが消える（ページ先頭はカレンダーに戻る）', async () => {
    await addContestOnBodyPage('ボディコンテスト', '2026-10-17')
    const first = visitHomePage()
    expect(screen.getByRole('list', CONTEST_LIST)).toBeInTheDocument()
    first.unmount()

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const body = visitBodyPage()
    await userEvent.click(screen.getByRole('button', { name: 'ボディコンテストを削除' }))
    body.unmount()

    const { container } = visitHomePage()
    expect(screen.queryByRole('list', CONTEST_LIST)).not.toBeInTheDocument()
    expect(screen.queryByTestId('contest-name')).not.toBeInTheDocument()
    const page = container.firstElementChild as HTMLElement
    expect(page.firstElementChild).toContainElement(screen.getByText('日'))
  })

  it('削除をキャンセルしたら、ホームのカードは残る', async () => {
    await addContestOnBodyPage('ボディコンテスト', '2026-10-17')

    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const body = visitBodyPage()
    await userEvent.click(screen.getByRole('button', { name: 'ボディコンテストを削除' }))
    body.unmount()

    visitHomePage()
    expect(screen.getByRole('list', CONTEST_LIST)).toHaveTextContent('ボディコンテスト')
  })

  it('日付を変えると、ホームの残り日数も変わる（あと 12 日 → あと 30 日）', async () => {
    await addContestOnBodyPage('ボディコンテスト', '2026-10-17')

    const body = visitBodyPage()
    fireEvent.change(screen.getByLabelText('ボディコンテストの日付'), { target: { value: '2026-11-04' } })
    body.unmount()

    visitHomePage()
    const list = screen.getByRole('list', CONTEST_LIST)
    expect(list).toHaveTextContent(/あと\s*30\s*日/)
    expect(list).toHaveTextContent('11月4日（水）')
  })

  it('名前を変えると、ホームの名前も変わる', async () => {
    await addContestOnBodyPage('ボディコンテスト', '2026-10-17')

    const body = visitBodyPage()
    const input = screen.getByLabelText('ボディコンテストの名前')
    fireEvent.change(input, { target: { value: '全日本大会' } })
    fireEvent.blur(input)
    body.unmount()

    visitHomePage()
    const list = screen.getByRole('list', CONTEST_LIST)
    expect(list).toHaveTextContent('全日本大会')
    expect(list).not.toHaveTextContent('ボディコンテスト')
  })

  it('複数登録すると、ホームには近い順に並ぶ（登録順が遠い順でも）', async () => {
    await addContestOnBodyPage('遠い大会', '2026-12-24')
    await addContestOnBodyPage('近い大会', '2026-10-17')

    visitHomePage()
    const rows = within(screen.getByRole('list', CONTEST_LIST)).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('近い大会')
    expect(rows[1]).toHaveTextContent('遠い大会')
  })

  it('4件登録すると、ホームは3件と「ほか 1 件」になり、1件削除すると「ほか」が消える', async () => {
    await addContestOnBodyPage('大会いち', '2026-10-06')
    await addContestOnBodyPage('大会に', '2026-10-07')
    await addContestOnBodyPage('大会さん', '2026-10-08')
    await addContestOnBodyPage('大会よん', '2026-10-09')

    const home = visitHomePage()
    expect(within(screen.getByRole('list', CONTEST_LIST)).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByRole('link', { name: /ほか\s*1\s*件/ })).toHaveAttribute('href', '/body')
    home.unmount()

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const body = visitBodyPage()
    await userEvent.click(screen.getByRole('button', { name: '大会よんを削除' }))
    body.unmount()

    visitHomePage()
    expect(within(screen.getByRole('list', CONTEST_LIST)).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByRole('link', { name: /ほか/ })).not.toBeInTheDocument()
  })

  it('過ぎた日付で追加した大会は、ホームのカードには出ず、カレンダーの印だけ出る', async () => {
    await addContestOnBodyPage('終わった大会', '2026-10-01')

    visitHomePage()
    expect(screen.queryByRole('list', CONTEST_LIST)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '10月1日（木）、大会: 終わった大会' })).toBeInTheDocument()
  })

  it('全データをリセット（localStorage 全消去）すると、ホームから大会が消える', async () => {
    await addContestOnBodyPage('ボディコンテスト', '2026-10-17')
    localStorage.clear()

    visitHomePage()
    expect(screen.queryByRole('list', CONTEST_LIST)).not.toBeInTheDocument()
    expect(screen.queryByTestId('contest-name')).not.toBeInTheDocument()
  })
})

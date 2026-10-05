import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import GoalCard from './GoalCard'
import { contestRows } from '../../test/contests'
import { setupFixedClock } from '../../test/fixedClock'
import type { GoalProgress } from '../../utils/goals'
import type { ContestCountdown } from '../../types'

// 「今年以外の年は年を付ける」の「今年」が実時間に依存するため 2026-10-05 に固定する
setupFixedClock(new Date(2026, 9, 5, 12))

const CONTEST_LIST = { name: '大会までの残り日数' }
const GOAL_LIST = { name: '目標までの残り' }

const WEIGHT_DECREASE: GoalProgress = {
  metric: 'weight',
  current: 68.2,
  target: 65,
  remaining: 3.2,
  status: 'decrease',
}

function countdown(id: string, name: string, date: string, daysLeft: number): ContestCountdown {
  return { contest: { id, name, date }, daysLeft }
}

const BODY_CONTEST = countdown('c1', 'ボディコンテスト', '2026-10-17', 12)

function renderCard(props: Parameters<typeof GoalCard>[0]) {
  return render(
    <MemoryRouter>
      <GoalCard {...props} />
    </MemoryRouter>,
  )
}

describe('GoalCard — 大会のみ・何も無いとき', () => {
  it('goals も countdowns も空なら何も描画しない', () => {
    const { container } = renderCard({ goals: [], countdowns: [] })
    expect(container).toBeEmptyDOMElement()
  })

  it('countdowns を渡さず goals が空でも何も描画しない（今までと同じ）', () => {
    const { container } = renderCard({ goals: [] })
    expect(container).toBeEmptyDOMElement()
  })

  it('どちらも空なら className があっても何も描画しない（空のカードを出さない）', () => {
    const { container } = renderCard({ goals: [], countdowns: [], className: 'spacing' })
    expect(container).toBeEmptyDOMElement()
  })

  it('大会だけあれば大会のリストが出て、目標のリストは出ない', () => {
    renderCard({ goals: [], countdowns: [BODY_CONTEST] })
    expect(screen.getByRole('list', CONTEST_LIST)).toBeInTheDocument()
    expect(screen.queryByRole('list', GOAL_LIST)).not.toBeInTheDocument()
  })

  it('目標だけなら大会のリストは出ない（countdowns を渡さない場合も空配列の場合も）', () => {
    const { unmount } = renderCard({ goals: [WEIGHT_DECREASE] })
    expect(screen.queryByRole('list', CONTEST_LIST)).not.toBeInTheDocument()
    expect(screen.getByRole('list', GOAL_LIST)).toBeInTheDocument()
    unmount()

    renderCard({ goals: [WEIGHT_DECREASE], countdowns: [] })
    expect(screen.queryByRole('list', CONTEST_LIST)).not.toBeInTheDocument()
    expect(screen.getByRole('list', GOAL_LIST)).toBeInTheDocument()
  })

  it('大会が無いとき、「ほか ◯ 件」のリンクも出ない', () => {
    renderCard({ goals: [WEIGHT_DECREASE], countdowns: [] })
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('GoalCard — 外側のカード', () => {
  it('外側は div 1枚で、className はその div に付く', () => {
    const { container } = renderCard({ goals: [WEIGHT_DECREASE], countdowns: [BODY_CONTEST], className: 'spacing' })
    const card = container.firstElementChild as HTMLElement
    expect(card.tagName).toBe('DIV')
    expect(card).toHaveClass('spacing')
    expect(container.children).toHaveLength(1)
  })

  it('大会のリストと目標のリストは同じカードの中に入る', () => {
    const { container } = renderCard({ goals: [WEIGHT_DECREASE], countdowns: [BODY_CONTEST] })
    const card = container.firstElementChild as HTMLElement
    expect(card).toContainElement(screen.getByRole('list', CONTEST_LIST))
    expect(card).toContainElement(screen.getByRole('list', GOAL_LIST))
  })

  it('大会のリストが目標のリストより先（DOM 順）', () => {
    renderCard({ goals: [WEIGHT_DECREASE], countdowns: [BODY_CONTEST] })
    const contestList = screen.getByRole('list', CONTEST_LIST)
    const goalList = screen.getByRole('list', GOAL_LIST)
    expect(contestList.compareDocumentPosition(goalList) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('role="list" を明示している（Safari は list-style: none でリストの役割を外すため）', () => {
    renderCard({ goals: [], countdowns: [BODY_CONTEST] })
    expect(screen.getByRole('list', CONTEST_LIST)).toHaveAttribute('role', 'list')
  })
})

describe('GoalCard — 大会の行', () => {
  it('1件につき1行', () => {
    renderCard({
      goals: [],
      countdowns: [BODY_CONTEST, countdown('c2', '秋の大会', '2026-11-03', 29)],
    })
    expect(contestRows()).toHaveLength(2)
  })

  it('名前・日付（M月d日（曜））・あと ◯ 日 が出る', () => {
    renderCard({ goals: [], countdowns: [BODY_CONTEST] })
    const [row] = contestRows()
    expect(row).toHaveTextContent('ボディコンテスト')
    expect(row).toHaveTextContent('10月17日（土）')
    expect(row).toHaveTextContent(/あと\s*12\s*日/)
  })

  it('渡した順に並ぶ（並べ替えない）', () => {
    renderCard({
      goals: [],
      countdowns: [
        countdown('c1', 'いち', '2026-10-06', 1),
        countdown('c2', 'に', '2026-10-20', 15),
        countdown('c3', 'さん', '2026-11-01', 27),
      ],
    })
    const rows = contestRows()
    expect(rows[0]).toHaveTextContent('いち')
    expect(rows[1]).toHaveTextContent('に')
    expect(rows[2]).toHaveTextContent('さん')
  })

  it('当日（daysLeft 0）は「今日」と出て「あと」は出ない', () => {
    renderCard({ goals: [], countdowns: [countdown('c1', 'ボディコンテスト', '2026-10-05', 0)] })
    const [row] = contestRows()
    expect(row).toHaveTextContent('今日')
    expect(row).not.toHaveTextContent('あと')
    expect(row).toHaveTextContent('10月5日（月）')
  })

  it('明日（daysLeft 1）は「あと 1 日」', () => {
    renderCard({ goals: [], countdowns: [countdown('c1', 'ボディコンテスト', '2026-10-06', 1)] })
    const [row] = contestRows()
    expect(row).toHaveTextContent(/あと\s*1\s*日/)
    expect(row).not.toHaveTextContent('今日')
  })

  it('今日の行と未来の行が混在しても、行ごとに表示が分かれる', () => {
    renderCard({
      goals: [],
      countdowns: [
        countdown('c1', '今日の大会', '2026-10-05', 0),
        countdown('c2', '先の大会', '2026-10-17', 12),
      ],
    })
    const rows = contestRows()
    expect(rows[0]).toHaveTextContent('今日')
    expect(rows[0]).not.toHaveTextContent('あと')
    expect(rows[1]).toHaveTextContent(/あと\s*12\s*日/)
    expect(rows[1]).not.toHaveTextContent('今日')
  })

  it('3桁の日数も出る（あと 365 日）', () => {
    renderCard({ goals: [], countdowns: [countdown('c1', '来年の大会', '2027-10-05', 365)] })
    expect(contestRows()[0]).toHaveTextContent(/あと\s*365\s*日/)
  })

  it('今年の日付には年を付けない', () => {
    renderCard({ goals: [], countdowns: [BODY_CONTEST] })
    expect(contestRows()[0]).not.toHaveTextContent('2026')
  })

  it('今年以外の年の日付には年を付ける（2027年1月10日（日））', () => {
    renderCard({ goals: [], countdowns: [countdown('c1', '新年の大会', '2027-01-10', 97)] })
    expect(contestRows()[0]).toHaveTextContent('2027年1月10日（日）')
  })

  it('日付の曜日が正しい（うるう日 2028年2月29日は火曜）', () => {
    renderCard({ goals: [], countdowns: [countdown('c1', 'うるう日の大会', '2028-02-29', 512)] })
    expect(contestRows()[0]).toHaveTextContent('2028年2月29日（火）')
  })

  it('名前は全文を出す（30文字でも切らない）', () => {
    const longName = '全日本ボディビル選手権大会ジュニア部門の予選会兼選考会の最終日です'.slice(0, 30)
    expect(longName).toHaveLength(30)
    renderCard({ goals: [], countdowns: [countdown('c1', longName, '2026-10-17', 12)] })
    expect(screen.getByText(longName)).toBeInTheDocument()
  })

  it('名前に HTML 風の文字があっても文字として出す', () => {
    renderCard({ goals: [], countdowns: [countdown('c1', '<b>強調</b>大会', '2026-10-17', 12)] })
    expect(contestRows()[0]).toHaveTextContent('<b>強調</b>大会')
    expect(contestRows()[0].querySelector('b')).toBeNull()
  })

  it('目標の行と同時に出しても、目標の行は今まで通り', () => {
    renderCard({ goals: [WEIGHT_DECREASE], countdowns: [BODY_CONTEST] })
    const goalRows = within(screen.getByRole('list', GOAL_LIST)).getAllByRole('listitem')
    expect(goalRows).toHaveLength(1)
    expect(goalRows[0]).toHaveTextContent(/あと\s*3\.2\s*kg\s*減/)
    expect(goalRows[0]).not.toHaveTextContent('ボディコンテスト')
  })
})

describe('GoalCard — 4件以上は先頭3件まで + 「ほか ◯ 件」', () => {
  const FIVE = [
    countdown('c1', '大会いち', '2026-10-06', 1),
    countdown('c2', '大会に', '2026-10-07', 2),
    countdown('c3', '大会さん', '2026-10-08', 3),
    countdown('c4', '大会よん', '2026-10-09', 4),
    countdown('c5', '大会ご', '2026-10-10', 5),
  ]

  it('1〜3件なら全部を行にし、リンクは出ない', () => {
    for (const count of [1, 2, 3]) {
      const { unmount } = renderCard({ goals: [], countdowns: FIVE.slice(0, count) })
      expect(contestRows()).toHaveLength(count)
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      unmount()
    }
  })

  it('4件なら先頭3件が行で、「ほか 1 件」のリンクが出る', () => {
    renderCard({ goals: [], countdowns: FIVE.slice(0, 4) })
    const rows = contestRows()
    expect(rows).toHaveLength(3)
    expect(rows[2]).toHaveTextContent('大会さん')
    expect(screen.queryByText('大会よん')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ほか\s*1\s*件/ })).toBeInTheDocument()
  })

  it('5件なら先頭3件が行で、「ほか 2 件」のリンクが /body へ張られる', () => {
    renderCard({ goals: [], countdowns: FIVE })
    const rows = contestRows()
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('大会いち')
    expect(rows[1]).toHaveTextContent('大会に')
    expect(rows[2]).toHaveTextContent('大会さん')
    expect(screen.queryByText('大会よん')).not.toBeInTheDocument()
    expect(screen.queryByText('大会ご')).not.toBeInTheDocument()

    const link = screen.getByRole('link', { name: /ほか\s*2\s*件/ })
    expect(link).toHaveAttribute('href', '/body')
  })

  it('10件なら「ほか 7 件」', () => {
    const ten = Array.from({ length: 10 }, (_, index) =>
      countdown(`c${index}`, `大会${index}`, '2026-10-17', 12 + index),
    )
    renderCard({ goals: [], countdowns: ten })
    expect(contestRows()).toHaveLength(3)
    expect(screen.getByRole('link', { name: /ほか\s*7\s*件/ })).toHaveAttribute('href', '/body')
  })

  it('リンクは大会のリストの後ろにあり、リストの中（listitem）には入らない', () => {
    renderCard({ goals: [], countdowns: FIVE })
    const list = screen.getByRole('list', CONTEST_LIST)
    const link = screen.getByRole('link', { name: /ほか\s*2\s*件/ })
    expect(list).not.toContainElement(link)
    expect(list.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('リンクは1つだけ', () => {
    renderCard({ goals: [WEIGHT_DECREASE], countdowns: FIVE })
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })
})

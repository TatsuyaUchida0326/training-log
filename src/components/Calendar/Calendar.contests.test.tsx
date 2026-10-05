import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Calendar from './Calendar'
import { setupFixedClock } from '../../test/fixedClock'
import type { CalendarProps, Contest } from '../../types'
import type { ContestCountdown } from '../../utils/contests'

// 2026年4月: 1日が水曜。表示は 3/29〜5/2（前月 3/29-31、翌月 5/1-2 のセルが付く）
const TODAY = new Date(2026, 3, 16) // month は 0-indexed

const defaultProps: CalendarProps = {
  currentDate: TODAY,
  onPrevMonth: vi.fn(),
  onNextMonth: vi.fn(),
  onToday: vi.fn(),
  selectedDate: null,
  onDateSelect: vi.fn(),
}

setupFixedClock(TODAY)

beforeEach(() => {
  vi.clearAllMocks()
})

function contest(id: string, name: string, date: string): Contest {
  return { id, name, date }
}

const BODY_CONTEST = contest('c1', 'ボディコンテスト', '2026-04-20') // 4月20日（月）

function cell(name: string | RegExp): HTMLElement {
  return screen.getByRole('button', { name })
}

describe('Calendar — 大会の印（アクセシブルネーム）', () => {
  it('大会のある日は、読み上げ名の末尾に「、大会: 名前」が付く', () => {
    render(<Calendar {...defaultProps} contests={[BODY_CONTEST]} />)
    expect(cell('4月20日（月）、大会: ボディコンテスト')).toBeInTheDocument()
  })

  it('同じ日に2件あれば「、大会: A、B」（配列の順）', () => {
    render(
      <Calendar
        {...defaultProps}
        contests={[contest('a', 'A大会', '2026-04-20'), contest('b', 'B大会', '2026-04-20')]}
      />,
    )
    expect(cell('4月20日（月）、大会: A大会、B大会')).toBeInTheDocument()
  })

  it('同じ日に3件あれば全部を読み上げ名に並べる', () => {
    render(
      <Calendar
        {...defaultProps}
        contests={[
          contest('a', 'A大会', '2026-04-20'),
          contest('b', 'B大会', '2026-04-20'),
          contest('c', 'C大会', '2026-04-20'),
        ]}
      />,
    )
    expect(cell('4月20日（月）、大会: A大会、B大会、C大会')).toBeInTheDocument()
  })

  it('大会のない日の読み上げ名は今まで通り（「大会」が付かない）', () => {
    render(<Calendar {...defaultProps} contests={[BODY_CONTEST]} />)
    expect(cell('4月21日（火）')).toBeInTheDocument()
    expect(cell('4月16日（木）')).toBeInTheDocument()
  })

  it('祝日 → 記録あり → 大会 の順に並ぶ（既存の並びの後ろに付く）', () => {
    // 2026-09-23（水）は秋分の日
    render(
      <Calendar
        {...defaultProps}
        currentDate={new Date(2026, 8, 1)}
        markedDates={['2026-09-23']}
        contests={[contest('c1', 'ボディコンテスト', '2026-09-23')]}
      />,
    )
    expect(cell('9月23日（水）、秋分の日、記録あり、大会: ボディコンテスト')).toBeInTheDocument()
  })

  it('祝日と大会が重なる日（記録なし）は「、祝日名、大会: 名前」', () => {
    render(
      <Calendar
        {...defaultProps}
        contests={[contest('c1', 'ボディコンテスト', '2026-04-29')]} // 昭和の日
      />,
    )
    expect(cell('4月29日（水）、昭和の日、大会: ボディコンテスト')).toBeInTheDocument()
  })

  it('記録ありと大会が重なる日は「、記録あり、大会: 名前」', () => {
    render(<Calendar {...defaultProps} achievedDates={['2026-04-20']} contests={[BODY_CONTEST]} />)
    expect(cell('4月20日（月）、記録あり、大会: ボディコンテスト')).toBeInTheDocument()
  })

  it('今日の日が大会でも aria-current は付いたまま', () => {
    render(<Calendar {...defaultProps} contests={[contest('c1', '今日の大会', '2026-04-16')]} />)
    expect(cell('4月16日（木）、大会: 今日の大会')).toHaveAttribute('aria-current', 'date')
  })

  it('過ぎた大会（今日より前）の日にも印が出る', () => {
    render(<Calendar {...defaultProps} contests={[contest('c1', '終わった大会', '2026-04-01')]} />)
    expect(cell('4月1日（水）、大会: 終わった大会')).toBeInTheDocument()
  })

  it('表示していない月の大会は、どのセルにも出ない', () => {
    render(<Calendar {...defaultProps} contests={[contest('c1', '来月の大会', '2026-06-10')]} />)
    expect(screen.queryByTestId('contest-name')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /大会:/ })).not.toBeInTheDocument()
  })

  it('同じ日付でも年が違えば印は出ない（2025-04-20 は 2026年4月に出ない）', () => {
    render(<Calendar {...defaultProps} contests={[contest('c1', '去年の大会', '2025-04-20')]} />)
    expect(screen.queryByTestId('contest-name')).not.toBeInTheDocument()
  })
})

describe('Calendar — 大会の印（セルの中の名前）', () => {
  it('大会のある日のセルの中に、1件目の名前が全文で出る（省略は CSS）', () => {
    render(<Calendar {...defaultProps} contests={[BODY_CONTEST]} />)
    const name = within(cell(/^4月20日（月）/)).getByTestId('contest-name')
    expect(name).toHaveTextContent('ボディコンテスト')
  })

  it('長い名前も DOM のテキストは全文（30文字）', () => {
    const longName = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほま'.slice(0, 30)
    expect(longName).toHaveLength(30)
    render(<Calendar {...defaultProps} contests={[contest('c1', longName, '2026-04-20')]} />)
    expect(within(cell(/^4月20日（月）/)).getByTestId('contest-name').textContent).toBe(longName)
  })

  it('1件だけなら「他 ◯ 件」は出ない', () => {
    render(<Calendar {...defaultProps} contests={[BODY_CONTEST]} />)
    expect(cell(/^4月20日（月）/)).not.toHaveTextContent(/他\s*\d+\s*件/)
  })

  it('同じ日に2件あれば、1件目の名前と「他1件」が出る', () => {
    render(
      <Calendar
        {...defaultProps}
        contests={[contest('a', 'A大会', '2026-04-20'), contest('b', 'B大会', '2026-04-20')]}
      />,
    )
    const target = cell(/^4月20日（月）/)
    expect(within(target).getByTestId('contest-name')).toHaveTextContent('A大会')
    expect(target).toHaveTextContent(/他\s*1\s*件/)
    // 2件目の名前はセルの中の表示には出さない（読み上げ名には入る）
    expect(within(target).queryByText('B大会')).not.toBeInTheDocument()
  })

  it('同じ日に3件あれば「他2件」', () => {
    render(
      <Calendar
        {...defaultProps}
        contests={[
          contest('a', 'A大会', '2026-04-20'),
          contest('b', 'B大会', '2026-04-20'),
          contest('c', 'C大会', '2026-04-20'),
        ]}
      />,
    )
    expect(cell(/^4月20日（月）/)).toHaveTextContent(/他\s*2\s*件/)
  })

  it('大会の無い日のセルには名前も「他◯件」も出ない', () => {
    render(<Calendar {...defaultProps} contests={[BODY_CONTEST]} />)
    const other = cell('4月21日（火）')
    expect(within(other).queryByTestId('contest-name')).not.toBeInTheDocument()
    expect(other).not.toHaveTextContent(/他\s*\d+\s*件/)
  })

  it('名前の表示は大会のある日の数だけ（同じ日の2件は1つにまとまる）', () => {
    render(
      <Calendar
        {...defaultProps}
        contests={[
          contest('a', 'A大会', '2026-04-20'),
          contest('b', 'B大会', '2026-04-20'),
          contest('c', 'C大会', '2026-04-25'),
        ]}
      />,
    )
    expect(screen.getAllByTestId('contest-name')).toHaveLength(2)
  })

  it('大会の名前はテキストとして出す（HTML として解釈しない）', () => {
    render(<Calendar {...defaultProps} contests={[contest('a', '<b>強調</b>', '2026-04-20')]} />)
    const target = cell(/^4月20日（月）/)
    expect(within(target).getByTestId('contest-name')).toHaveTextContent('<b>強調</b>')
    expect(target.querySelector('b')).toBeNull()
  })

  it('大会の印があっても、日付の数字は今まで通り出る', () => {
    render(<Calendar {...defaultProps} contests={[BODY_CONTEST]} />)
    expect(within(cell(/^4月20日（月）/)).getByText('20')).toBeInTheDocument()
  })

  it('大会の印は、日付セルのボタンの中にある（押せる範囲に収まる）', () => {
    render(<Calendar {...defaultProps} contests={[BODY_CONTEST]} />)
    const name = screen.getByTestId('contest-name')
    expect(name.closest('button')).toBe(cell(/^4月20日（月）/))
  })
})

describe('Calendar — 前後の月のセルでも大会の印を出す', () => {
  it('前月末（3月31日）のセルに印が出る', () => {
    render(<Calendar {...defaultProps} contests={[contest('c1', '前月の大会', '2026-03-31')]} />)
    const target = cell('3月31日（火）、大会: 前月の大会')
    expect(within(target).getByTestId('contest-name')).toHaveTextContent('前月の大会')
  })

  it('翌月頭（5月1日）のセルに印が出る', () => {
    render(<Calendar {...defaultProps} contests={[contest('c1', '翌月の大会', '2026-05-01')]} />)
    const target = cell('5月1日（金）、大会: 翌月の大会')
    expect(within(target).getByTestId('contest-name')).toHaveTextContent('翌月の大会')
  })

  it('表示範囲の外（3月28日・5月3日）の大会は出ない', () => {
    render(
      <Calendar
        {...defaultProps}
        contests={[contest('a', '遠い前月', '2026-03-28'), contest('b', '遠い翌月', '2026-05-03')]}
      />,
    )
    expect(screen.queryByTestId('contest-name')).not.toBeInTheDocument()
  })

  it('年またぎ: 1月表示の前月セル（12月）の大会も出る', () => {
    // 2027年1月は 1日が金曜 → 前月の 12/27〜12/31 のセルが付く
    render(
      <Calendar
        {...defaultProps}
        currentDate={new Date(2027, 0, 1)}
        contests={[contest('c1', '年末の大会', '2026-12-31')]}
      />,
    )
    expect(cell('12月31日（木）、大会: 年末の大会')).toBeInTheDocument()
  })
})

describe('Calendar — 大会を渡さないときは今と完全に同じ DOM', () => {
  it('contests を渡さない / 空配列 のとき、DOM が一致する', () => {
    const without = render(<Calendar {...defaultProps} />)
    const htmlWithout = without.container.innerHTML
    without.unmount()

    const empty = render(<Calendar {...defaultProps} contests={[]} />)
    expect(empty.container.innerHTML).toBe(htmlWithout)
  })

  it('記録・祝日があっても contests が空なら DOM が一致する', () => {
    const props = { ...defaultProps, markedDates: ['2026-04-10'], achievedDates: ['2026-04-20'] }
    const without = render(<Calendar {...props} />)
    const htmlWithout = without.container.innerHTML
    without.unmount()

    const empty = render(<Calendar {...props} contests={[]} />)
    expect(empty.container.innerHTML).toBe(htmlWithout)
  })

  it('contests を渡さなければ、名前も countdown も出ない', () => {
    render(<Calendar {...defaultProps} />)
    expect(screen.queryByTestId('contest-name')).not.toBeInTheDocument()
    expect(screen.queryByTestId('calendar-countdown')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /大会/ })).not.toBeInTheDocument()
  })

  it('大会があっても、セルの数・記録の印の数は変わらない', () => {
    const props = { ...defaultProps, markedDates: ['2026-04-10', '2026-04-20'] }
    const without = render(<Calendar {...props} />)
    const cellsWithout = without.container.querySelectorAll('button[aria-pressed]').length
    without.unmount()

    render(<Calendar {...props} contests={[BODY_CONTEST]} />)
    expect(document.querySelectorAll('button[aria-pressed]').length).toBe(cellsWithout)
    expect(screen.getAllByTestId('marked-dot')).toHaveLength(2)
  })

  it('大会のある日をクリックすると、今まで通り onDateSelect が呼ばれる', async () => {
    const user = userEvent.setup()
    const onDateSelect = vi.fn()
    render(<Calendar {...defaultProps} onDateSelect={onDateSelect} contests={[BODY_CONTEST]} />)

    await user.click(cell(/^4月20日（月）/))

    expect(onDateSelect).toHaveBeenCalledTimes(1)
    const called: Date = onDateSelect.mock.calls[0][0]
    expect([called.getFullYear(), called.getMonth(), called.getDate()]).toEqual([2026, 3, 20])
  })
})

describe('Calendar — countdown（カレンダー上部の「あと ◯ 日」）', () => {
  function makeCountdown(name: string, date: string, daysLeft: number): ContestCountdown {
    return { contest: contest('c1', name, date), daysLeft }
  }

  it('渡さなければ出ない', () => {
    render(<Calendar {...defaultProps} contests={[BODY_CONTEST]} />)
    expect(screen.queryByTestId('calendar-countdown')).not.toBeInTheDocument()
  })

  it('渡すと「{名前}まで あと 12 日」が出る', () => {
    render(
      <Calendar
        {...defaultProps}
        contests={[BODY_CONTEST]}
        countdown={makeCountdown('ボディコンテスト', '2026-04-28', 12)}
      />,
    )
    expect(screen.getByTestId('calendar-countdown')).toHaveTextContent(
      /ボディコンテストまで\s*あと\s*12\s*日/,
    )
  })

  it('当日（daysLeft 0）は「今日は{名前}」', () => {
    render(
      <Calendar
        {...defaultProps}
        countdown={makeCountdown('ボディコンテスト', '2026-04-16', 0)}
      />,
    )
    const element = screen.getByTestId('calendar-countdown')
    expect(element).toHaveTextContent(/今日は\s*ボディコンテスト/)
    expect(element).not.toHaveTextContent('あと')
  })

  it('明日（daysLeft 1）は「あと 1 日」', () => {
    render(
      <Calendar
        {...defaultProps}
        countdown={makeCountdown('ボディコンテスト', '2026-04-17', 1)}
      />,
    )
    expect(screen.getByTestId('calendar-countdown')).toHaveTextContent(
      /ボディコンテストまで\s*あと\s*1\s*日/,
    )
  })

  it('contests を渡さなくても countdown だけで出せる', () => {
    render(
      <Calendar {...defaultProps} countdown={makeCountdown('ボディコンテスト', '2026-04-28', 12)} />,
    )
    expect(screen.getByTestId('calendar-countdown')).toBeInTheDocument()
  })

  it('名前は全文で出す（30文字）', () => {
    const longName = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほま'.slice(0, 30)
    render(<Calendar {...defaultProps} countdown={makeCountdown(longName, '2026-04-28', 12)} />)
    expect(screen.getByTestId('calendar-countdown')).toHaveTextContent(longName)
  })

  it('1つだけ出る', () => {
    render(
      <Calendar {...defaultProps} countdown={makeCountdown('ボディコンテスト', '2026-04-28', 12)} />,
    )
    expect(screen.getAllByTestId('calendar-countdown')).toHaveLength(1)
  })

  it('カレンダーの上部にある（日付セルより DOM 順で前）', () => {
    render(
      <Calendar {...defaultProps} countdown={makeCountdown('ボディコンテスト', '2026-04-28', 12)} />,
    )
    const countdown = screen.getByTestId('calendar-countdown')
    const firstDay = screen.getByRole('button', { name: '4月16日（木）' })
    expect(countdown.compareDocumentPosition(firstDay) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('別の月を表示していても出る（表示月に依存しない）', () => {
    render(
      <Calendar
        {...defaultProps}
        currentDate={new Date(2026, 7, 1)}
        countdown={makeCountdown('ボディコンテスト', '2026-04-28', 12)}
      />,
    )
    expect(screen.getByTestId('calendar-countdown')).toBeInTheDocument()
  })

  it('countdown があっても月の見出しと日付セルは今まで通り', () => {
    render(
      <Calendar {...defaultProps} countdown={makeCountdown('ボディコンテスト', '2026-04-28', 12)} />,
    )
    expect(screen.getByText('2026年4月')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '前の月' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '次の月' })).toBeInTheDocument()
  })
})

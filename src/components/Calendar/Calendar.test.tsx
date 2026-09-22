import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Calendar from './Calendar'
import { setupFixedClock } from '../../test/fixedClock'
import type { CalendarProps } from '../../types'

// 年月ヘッダーも「今日」ボタンの表示判定も実時間に依存するため 2026-04-16 に固定する
const TODAY = new Date(2026, 3, 16) // month は 0-indexed

// デフォルト props
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

describe('Calendar', () => {
  it('年月ヘッダーが "2026年4月" 形式で表示される', () => {
    render(<Calendar {...defaultProps} />)
    expect(screen.getByText('2026年4月')).toBeInTheDocument()
  })

  it('曜日ヘッダー 日〜土 が表示される', () => {
    render(<Calendar {...defaultProps} />)
    const weekdays = ['日', '月', '火', '水', '木', '金', '土']
    weekdays.forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument()
    })
  })

  it('April 2026 の全日付（1〜30）が表示される', () => {
    render(<Calendar {...defaultProps} />)
    // April は 30 日まで
    for (let d = 1; d <= 30; d++) {
      // getAllByText で複数マッチ（前月・翌月の溢れ分も含む可能性あり）を許容
      const cells = screen.getAllByText(String(d))
      expect(cells.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('＜ボタンをクリックすると onPrevMonth が呼ばれる', async () => {
    const user = userEvent.setup()
    const onPrevMonth = vi.fn()
    render(<Calendar {...defaultProps} onPrevMonth={onPrevMonth} />)

    // aria-label または テキスト "<" のボタンを探す
    const prevButton = screen.getByRole('button', { name: /prev|previous|＜|</i })
    await user.click(prevButton)

    expect(onPrevMonth).toHaveBeenCalledTimes(1)
  })

  it('＞ボタンをクリックすると onNextMonth が呼ばれる', async () => {
    const user = userEvent.setup()
    const onNextMonth = vi.fn()
    render(<Calendar {...defaultProps} onNextMonth={onNextMonth} />)

    const nextButton = screen.getByRole('button', { name: /next|＞|>/i })
    await user.click(nextButton)

    expect(onNextMonth).toHaveBeenCalledTimes(1)
  })

  it('日付「16」をクリックすると onDateSelect が 2026-04-16 の Date で呼ばれる', async () => {
    const user = userEvent.setup()
    const onDateSelect = vi.fn()
    render(<Calendar {...defaultProps} onDateSelect={onDateSelect} />)

    // April 2026 の 16 日を取得（複数ある場合は最初の一致を使用）
    const dateCell = screen.getAllByText('16')[0]
    await user.click(dateCell)

    expect(onDateSelect).toHaveBeenCalledTimes(1)
    const calledWith: Date = onDateSelect.mock.calls[0][0]
    expect(calledWith).toBeInstanceOf(Date)
    expect(calledWith.getFullYear()).toBe(2026)
    expect(calledWith.getMonth()).toBe(3) // 0-indexed: April = 3
    expect(calledWith.getDate()).toBe(16)
  })

  it('当月を表示中は「今日」ボタンが表示されない', () => {
    render(<Calendar {...defaultProps} currentDate={TODAY} />)
    expect(screen.queryByRole('button', { name: '今日' })).not.toBeInTheDocument()
  })

  it('前月表示中に「今日」ボタンをクリックすると onToday が呼ばれる', async () => {
    const user = userEvent.setup()
    const onToday = vi.fn()
    const prevMonth = new Date(2026, 2, 1) // 2026-03
    render(<Calendar {...defaultProps} currentDate={prevMonth} onToday={onToday} />)

    const todayButton = screen.getByRole('button', { name: '今日' })
    expect(todayButton).toBeInTheDocument()
    await user.click(todayButton)

    expect(onToday).toHaveBeenCalledTimes(1)
  })

  it('markedDates に含まれる日付にドットが表示される', () => {
    const markedDates = ['2026-04-10', '2026-04-20']
    render(<Calendar {...defaultProps} markedDates={markedDates} />)

    const dots = document.querySelectorAll('[data-testid="marked-dot"]')
    expect(dots.length).toBe(2)
  })

  it('achievedDates に含まれる日付にドットが表示される', () => {
    const achievedDates = ['2026-04-10', '2026-04-20']
    render(<Calendar {...defaultProps} achievedDates={achievedDates} />)

    const dots = document.querySelectorAll('[data-testid="marked-dot"]')
    expect(dots.length).toBe(2)
  })

  it('achievedDates の日はフルカラー、markedDates のみの日はグレー表示になる', () => {
    render(
      <Calendar
        {...defaultProps}
        markedDates={['2026-04-10', '2026-04-15']}
        achievedDates={['2026-04-15']}
      />
    )
    const dots = document.querySelectorAll('[data-testid="marked-dot"]')
    expect(dots.length).toBe(2)
    // 達成日（15日）はフルカラークラス、記録のみ（10日）はグレークラス
    const dotClasses = Array.from(dots).map((d) => d.className)
    expect(dotClasses.some((c) => c.includes('muscleIconGray'))).toBe(true)
    expect(dotClasses.some((c) => c.includes('muscleIcon') && !c.includes('Gray'))).toBe(true)
  })
})

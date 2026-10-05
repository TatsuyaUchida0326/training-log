import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { PageHeaderProvider } from '../../contexts/PageHeaderContext'
import HistoryPage from './HistoryPage'
import { makeContest, seedContests } from '../../test/contests'
import { setupFixedClock } from '../../test/fixedClock'
import { seedExercises, seedRecords } from '../../test/seed'

// カレンダーの表示月は実時間に依存するため 2026-04-16（木）12:00 に固定する
setupFixedClock(new Date(2026, 3, 16, 12))

const EXERCISE = { id: 'ex-chest-1', name: 'ベンチプレス', categoryId: '胸', isCustom: false }

function seedRecordOn(date: string): void {
  seedExercises([EXERCISE])
  seedRecords([
    {
      id: 'rec-1',
      date,
      exerciseId: EXERCISE.id,
      sets: [{ id: 's1', weight: 60, reps: 10, memo: '' }],
    },
  ])
}

function renderHistoryPage() {
  return render(
    <PageHeaderProvider>
      <MemoryRouter initialEntries={['/history']}>
        <Routes>
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/date/:dateStr" element={<div data-testid="date-detail-page" />} />
        </Routes>
      </MemoryRouter>
    </PageHeaderProvider>,
  )
}

/** 日付セル。読み上げ名は「4月20日（月）」で始まる */
function dayCell(label: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(`^${label}`) })
}

beforeEach(() => {
  localStorage.clear()
})

describe('HistoryPage — カレンダーの大会の印', () => {
  it('大会の日のセルに印が出る', () => {
    seedContests([makeContest('ボディコンテスト', '2026-04-20')])
    renderHistoryPage()
    const cell = screen.getByRole('button', { name: '4月20日（月）、大会: ボディコンテスト' })
    expect(within(cell).getByTestId('contest-name')).toHaveTextContent('ボディコンテスト')
  })

  it('過ぎた大会の日にも印が出る', () => {
    seedContests([makeContest('終わった大会', '2026-04-01')])
    renderHistoryPage()
    expect(screen.getByRole('button', { name: '4月1日（水）、大会: 終わった大会' })).toBeInTheDocument()
  })

  it('大会が無ければ印も残り日数も出ない（今まで通り）', () => {
    renderHistoryPage()
    expect(screen.queryByTestId('contest-name')).not.toBeInTheDocument()
    expect(screen.queryByTestId('calendar-countdown')).not.toBeInTheDocument()
  })
})

describe('HistoryPage — カレンダー上部の「あと ◯ 日」', () => {
  it('一番近い大会が出る', () => {
    seedContests([
      makeContest('遠い大会', '2026-05-30'),
      makeContest('近い大会', '2026-04-20'),
    ])
    renderHistoryPage()
    expect(screen.getByTestId('calendar-countdown')).toHaveTextContent(/近い大会まで\s*あと\s*4\s*日/)
  })

  it('過ぎた大会は数えず、これからの大会のうち一番近いものが出る', () => {
    seedContests([
      makeContest('終わった大会', '2026-04-10'),
      makeContest('これからの大会', '2026-04-28'),
    ])
    renderHistoryPage()
    expect(screen.getByTestId('calendar-countdown')).toHaveTextContent(
      /これからの大会まで\s*あと\s*12\s*日/,
    )
  })

  it('当日の大会は「今日は{名前}」', () => {
    seedContests([makeContest('今日の大会', '2026-04-16'), makeContest('明日の大会', '2026-04-17')])
    renderHistoryPage()
    expect(screen.getByTestId('calendar-countdown')).toHaveTextContent(/今日は\s*今日の大会/)
  })

  it('同じ日の大会が複数あるときは、登録順で先のものが出る', () => {
    seedContests([makeContest('登録一番目', '2026-04-20'), makeContest('登録二番目', '2026-04-20')])
    renderHistoryPage()
    expect(screen.getByTestId('calendar-countdown')).toHaveTextContent('登録一番目')
    expect(screen.getByTestId('calendar-countdown')).not.toHaveTextContent('登録二番目')
  })

  it('これからの大会が無ければ出ない（過ぎた大会の印はカレンダーに残る）', () => {
    seedContests([makeContest('終わった大会', '2026-04-10')])
    renderHistoryPage()
    expect(screen.queryByTestId('calendar-countdown')).not.toBeInTheDocument()
    expect(screen.getByTestId('contest-name')).toHaveTextContent('終わった大会')
  })

  it('1つだけ出る（大会が複数あっても）', () => {
    seedContests([makeContest('A大会', '2026-04-20'), makeContest('B大会', '2026-05-01')])
    renderHistoryPage()
    expect(screen.getAllByTestId('calendar-countdown')).toHaveLength(1)
  })
})

describe('HistoryPage — 日付を押したとき', () => {
  it('記録が無くても、大会がある日はポップアップを開く（日付詳細へは遷移しない）', async () => {
    seedContests([makeContest('2026年ボディビル大会', '2026-04-25')])
    renderHistoryPage()

    await userEvent.click(dayCell('4月25日（土）'))

    expect(screen.getByTestId('popup-overlay')).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByText('2026年ボディビル大会')).toBeInTheDocument()
    expect(screen.queryByTestId('date-detail-page')).not.toBeInTheDocument()
  })

  it('大会だけの日のポップアップの見出しは、押した日の日付', async () => {
    seedContests([makeContest('2026年ボディビル大会', '2026-04-25')])
    renderHistoryPage()
    await userEvent.click(dayCell('4月25日（土）'))
    expect(screen.getByRole('dialog', { name: '4月25日（土）' })).toBeInTheDocument()
  })

  it('過ぎた大会の日も、記録が無くてもポップアップを開く', async () => {
    seedContests([makeContest('終わった大会', '2026-04-01')])
    renderHistoryPage()
    await userEvent.click(dayCell('4月1日（水）'))
    expect(screen.getByTestId('popup-overlay')).toBeInTheDocument()
  })

  it('大会も記録も無い日は、従来どおり日付詳細へ遷移する', async () => {
    seedContests([makeContest('ボディコンテスト', '2026-04-25')])
    renderHistoryPage()
    await userEvent.click(dayCell('4月21日（火）'))
    expect(screen.getByTestId('date-detail-page')).toBeInTheDocument()
    expect(screen.queryByTestId('popup-overlay')).not.toBeInTheDocument()
  })

  it('大会がまったく無いときも、記録の無い日は従来どおり日付詳細へ遷移する', async () => {
    renderHistoryPage()
    await userEvent.click(dayCell('4月21日（火）'))
    expect(screen.getByTestId('date-detail-page')).toBeInTheDocument()
  })

  it('記録と大会が両方ある日は、ポップアップに種目も大会名も出る', async () => {
    seedRecordOn('2026-04-22')
    seedContests([makeContest('2026年ボディビル大会', '2026-04-22')])
    renderHistoryPage()

    await userEvent.click(dayCell('4月22日（水）'))

    const dialog = screen.getByRole('dialog', { name: '4月22日（水）' })
    expect(within(dialog).getByText('ベンチプレス')).toBeInTheDocument()
    expect(within(dialog).getByText('2026年ボディビル大会')).toBeInTheDocument()
  })

  it('記録があって大会が無い日は、今まで通りポップアップに大会名は出ない', async () => {
    seedRecordOn('2026-04-22')
    seedContests([makeContest('2026年ボディビル大会', '2026-04-25')])
    renderHistoryPage()

    await userEvent.click(dayCell('4月22日（水）'))

    const dialog = screen.getByRole('dialog', { name: '4月22日（水）' })
    expect(within(dialog).queryByText('2026年ボディビル大会')).not.toBeInTheDocument()
  })

  it('その日の大会だけをポップアップに出す（別の日の大会は出さない）', async () => {
    seedContests([
      makeContest('二十五日の大会', '2026-04-25'),
      makeContest('二十六日の大会', '2026-04-26'),
    ])
    renderHistoryPage()
    await userEvent.click(dayCell('4月25日（土）'))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('二十五日の大会')).toBeInTheDocument()
    expect(within(dialog).queryByText('二十六日の大会')).not.toBeInTheDocument()
  })

  it('同じ日に複数の大会があれば、ポップアップに全部出る', async () => {
    seedContests([makeContest('A大会', '2026-04-25'), makeContest('B大会', '2026-04-25')])
    renderHistoryPage()
    await userEvent.click(dayCell('4月25日（土）'))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('A大会')).toBeInTheDocument()
    expect(within(dialog).getByText('B大会')).toBeInTheDocument()
  })

  it('大会だけの日のポップアップの「詳細を見る」で日付詳細へ遷移できる', async () => {
    seedContests([makeContest('2026年ボディビル大会', '2026-04-25')])
    renderHistoryPage()
    await userEvent.click(dayCell('4月25日（土）'))
    await userEvent.click(screen.getByRole('button', { name: '詳細を見る' }))
    expect(screen.getByTestId('date-detail-page')).toBeInTheDocument()
    expect(screen.queryByTestId('popup-overlay')).not.toBeInTheDocument()
  })

  it('ポップアップを閉じると消える', async () => {
    seedContests([makeContest('2026年ボディビル大会', '2026-04-25')])
    renderHistoryPage()
    await userEvent.click(dayCell('4月25日（土）'))
    await userEvent.click(screen.getByRole('button', { name: '閉じる' }))
    expect(screen.queryByTestId('popup-overlay')).not.toBeInTheDocument()
  })

  it('前の月・次の月のセルに大会があれば、そこを押してもポップアップが開く', async () => {
    seedContests([makeContest('前月の大会', '2026-03-31')])
    renderHistoryPage()
    await userEvent.click(dayCell('3月31日（火）'))
    expect(screen.getByTestId('popup-overlay')).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByText('前月の大会')).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CalendarDayPopup from './CalendarDayPopup'
import type { Contest, Exercise, TrainingRecord } from '../../types'

const DATE = '2026-04-22' // 水曜日

const EXERCISES: Exercise[] = [
  { id: 'ex-chest-1', name: 'ベンチプレス', categoryId: '胸', isCustom: false },
]

const RECORDS: TrainingRecord[] = [
  {
    id: 'rec-1',
    date: DATE,
    exerciseId: 'ex-chest-1',
    sets: [{ id: 's1', weight: 60, reps: 10, memo: '' }],
  },
]

const BODYBUILDING: Contest = { id: 'c1', name: '2026年ボディビル大会', date: DATE }

function renderPopup(
  overrides: Partial<{
    records: TrainingRecord[]
    contests: Contest[]
    onClose: () => void
    onNavigate: (date: string) => void
  }> = {},
) {
  const props = {
    date: DATE,
    records: RECORDS,
    exercises: EXERCISES,
    onClose: vi.fn(),
    onNavigate: vi.fn(),
    ...overrides,
  }
  return { ...render(<CalendarDayPopup {...props} />), props }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CalendarDayPopup — その日の大会', () => {
  it('渡された大会の名前が全文で出る', () => {
    renderPopup({ contests: [BODYBUILDING] })
    expect(screen.getByText('2026年ボディビル大会')).toBeInTheDocument()
  })

  it('同じ日に複数あれば、全部の名前が出る', () => {
    renderPopup({
      contests: [BODYBUILDING, { id: 'c2', name: '社内ベンチプレス大会', date: DATE }],
    })
    expect(screen.getByText('2026年ボディビル大会')).toBeInTheDocument()
    expect(screen.getByText('社内ベンチプレス大会')).toBeInTheDocument()
  })

  it('複数ある大会は渡された順に並ぶ', () => {
    renderPopup({
      contests: [BODYBUILDING, { id: 'c2', name: '社内ベンチプレス大会', date: DATE }],
    })
    const first = screen.getByText('2026年ボディビル大会')
    const second = screen.getByText('社内ベンチプレス大会')
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('長い名前も全文で出る（30文字）', () => {
    const longName = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほま'.slice(0, 30)
    renderPopup({ contests: [{ id: 'c1', name: longName, date: DATE }] })
    expect(screen.getByText(longName)).toBeInTheDocument()
  })

  it('大会の名前は日付の見出しより後ろ（見出しの下）に出る', () => {
    renderPopup({ contests: [BODYBUILDING] })
    const heading = screen.getByText('4月22日（水）')
    const name = screen.getByText('2026年ボディビル大会')
    expect(heading.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('大会の名前はダイアログの中にあり、ダイアログの名前（日付）は変わらない', () => {
    renderPopup({ contests: [BODYBUILDING] })
    const dialog = screen.getByRole('dialog', { name: '4月22日（水）' })
    expect(dialog).toContainElement(screen.getByText('2026年ボディビル大会'))
  })

  it('記録と大会が両方ある日は、種目も大会も出る', () => {
    renderPopup({ contests: [BODYBUILDING] })
    expect(screen.getByText('ベンチプレス')).toBeInTheDocument()
    expect(screen.getByText('1set')).toBeInTheDocument()
    expect(screen.getByText('2026年ボディビル大会')).toBeInTheDocument()
  })

  it('記録が無く大会だけの日でも開ける（見出しと大会名が出る）', () => {
    renderPopup({ records: [], contests: [BODYBUILDING] })
    expect(screen.getByRole('dialog', { name: '4月22日（水）' })).toBeInTheDocument()
    expect(screen.getByText('2026年ボディビル大会')).toBeInTheDocument()
    expect(screen.queryByText('ベンチプレス')).not.toBeInTheDocument()
  })

  it('大会名はテキストとして出す（HTML として解釈しない）', () => {
    renderPopup({ contests: [{ id: 'c1', name: '<b>強調</b>大会', date: DATE }] })
    expect(screen.getByText('<b>強調</b>大会')).toBeInTheDocument()
  })

  it('大会があっても、閉じる・Escape・「詳細を見る」は今まで通り動く', async () => {
    const user = userEvent.setup()
    const { props } = renderPopup({ contests: [BODYBUILDING] })

    await user.click(screen.getByRole('button', { name: '詳細を見る' }))
    expect(props.onNavigate).toHaveBeenCalledWith(DATE)

    await user.click(screen.getByRole('button', { name: '閉じる' }))
    await user.keyboard('{Escape}')
    expect(props.onClose).toHaveBeenCalledTimes(2)
  })

  it('大会の名前を押してもポップアップは閉じない', async () => {
    const user = userEvent.setup()
    const { props } = renderPopup({ contests: [BODYBUILDING] })
    await user.click(screen.getByText('2026年ボディビル大会'))
    expect(props.onClose).not.toHaveBeenCalled()
  })
})

describe('CalendarDayPopup — 大会が無いとき（今まで通り）', () => {
  it('contests を渡さなければ大会の表示は無い', () => {
    renderPopup()
    expect(screen.queryByText('2026年ボディビル大会')).not.toBeInTheDocument()
  })

  it('contests が空配列でも、渡さないときと表示（テキスト）が同じ', () => {
    const without = renderPopup()
    const textWithout = without.container.textContent
    without.unmount()

    const empty = renderPopup({ contests: [] })
    expect(empty.container.textContent).toBe(textWithout)
  })
})

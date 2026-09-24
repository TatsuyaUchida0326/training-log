import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CalendarDayPopup from './CalendarDayPopup'
import type { TrainingRecord, Exercise } from '../../types'

// ── フィクスチャ ──────────────────────────────────────────────────────────────

const DATE = '2026-04-22' // 水曜日

const EXERCISES: Exercise[] = [
  { id: 'ex-chest-1', name: 'ベンチプレス',   categoryId: '胸',  isCustom: false },
  { id: 'ex-chest-2', name: 'ペックフライ',   categoryId: '胸',  isCustom: false },
  { id: 'ex-back-1',  name: 'デッドリフト',   categoryId: '背中', isCustom: false },
]

const RECORDS: TrainingRecord[] = [
  {
    id: 'rec-1',
    date: DATE,
    exerciseId: 'ex-chest-1',
    sets: [
      { id: 's1', weight: 60, reps: 10, memo: '' },
      { id: 's2', weight: 60, reps: 10, memo: '' },
      { id: 's3', weight: 60, reps: 10, memo: '' },
    ],
  },
  {
    id: 'rec-2',
    date: DATE,
    exerciseId: 'ex-chest-2',
    sets: [
      { id: 's4', weight: 40, reps: 12, memo: '' },
      { id: 's5', weight: 40, reps: 12, memo: '' },
    ],
  },
  {
    id: 'rec-3',
    date: DATE,
    exerciseId: 'ex-back-1',
    sets: [
      { id: 's6', weight: 100, reps: 5, memo: '' },
    ],
  },
]

// ── ヘルパー ──────────────────────────────────────────────────────────────────

function renderPopup(
  overrides: Partial<{
    date: string
    records: TrainingRecord[]
    exercises: Exercise[]
    onClose: () => void
    onNavigate: (date: string) => void
  }> = {}
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

// ── テスト ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CalendarDayPopup', () => {
  it('日付が「4月22日（水）」形式で表示される', () => {
    renderPopup()
    expect(screen.getByText('4月22日（水）')).toBeInTheDocument()
  })

  it('種目が部位ごとにグループ表示される（カテゴリラベルが表示される）', () => {
    renderPopup()
    // 胸・背中 の両カテゴリラベルが表示される
    expect(screen.getByText('胸')).toBeInTheDocument()
    expect(screen.getByText('背中')).toBeInTheDocument()
  })

  it('各種目にセット数（例: 3set）が表示される', () => {
    renderPopup()
    // ベンチプレス: 3set
    expect(screen.getByText('3set')).toBeInTheDocument()
    // ペックフライ: 2set
    expect(screen.getByText('2set')).toBeInTheDocument()
    // デッドリフト: 1set
    expect(screen.getByText('1set')).toBeInTheDocument()
  })

  it('各種目名が表示される', () => {
    renderPopup()
    expect(screen.getByText('ベンチプレス')).toBeInTheDocument()
    expect(screen.getByText('ペックフライ')).toBeInTheDocument()
    expect(screen.getByText('デッドリフト')).toBeInTheDocument()
  })

  it('閉じるボタン（aria-label="閉じる"）クリックで onClose が呼ばれる', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderPopup({ onClose })

    const closeButton = screen.getByRole('button', { name: /閉じる/i })

    await user.click(closeButton)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('オーバーレイ（data-testid="popup-overlay"）クリックで onClose が呼ばれる', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderPopup({ onClose })

    const overlay = screen.getByTestId('popup-overlay')
    await user.click(overlay)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('カード内クリックでは onClose が呼ばれない', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderPopup({ onClose })

    // 日付ヘッダーをクリック（カード内要素）
    await user.click(screen.getByText('4月22日（水）'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('「詳細を見る」ボタンクリックで onNavigate("2026-04-22") が呼ばれる', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    renderPopup({ onNavigate })

    const navButton = screen.getByRole('button', { name: '詳細を見る' })
    await user.click(navButton)
    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect(onNavigate).toHaveBeenCalledWith('2026-04-22')
  })

  it('records が空の場合は種目リストが表示されない', () => {
    renderPopup({ records: [] })
    expect(screen.queryByText('ベンチプレス')).not.toBeInTheDocument()
    expect(screen.queryByText('胸')).not.toBeInTheDocument()
  })
})

/* 判定基準は isFilledSet を参照 */
describe('CalendarDayPopup - 空セットの除外', () => {
  const emptySet = { id: 'empty-1', weight: 0, reps: 0, memo: '' }

  it('空セットだけの記録は種目として表示しない', () => {
    renderPopup({
      records: [{ id: 'rec-empty', date: DATE, exerciseId: 'ex-chest-1', sets: [emptySet] }],
    })
    expect(screen.queryByText('ベンチプレス')).not.toBeInTheDocument()
    expect(screen.queryByText('胸')).not.toBeInTheDocument()
  })

  it('セット数は中身のあるセットだけ数える', () => {
    renderPopup({
      records: [
        {
          id: 'rec-mixed',
          date: DATE,
          exerciseId: 'ex-chest-1',
          sets: [{ id: 'filled-1', weight: 60, reps: 10, memo: '' }, emptySet, emptySet],
        },
      ],
    })
    expect(screen.getByText('1set')).toBeInTheDocument()
  })
})

describe('CalendarDayPopup - ダイアログとしてのアクセシビリティ', () => {
  it('role="dialog" かつ aria-modal="true" の要素が、日付テキストを名前として取得できる', () => {
    renderPopup()
    expect(
      screen.getByRole('dialog', { name: '4月22日（水）' })
    ).toBeInTheDocument()
  })

  it('マウント時にダイアログ本体へフォーカスが移る', () => {
    renderPopup()
    expect(screen.getByRole('dialog', { name: '4月22日（水）' })).toHaveFocus()
  })

  it('Escapeキーで onClose が呼ばれる', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderPopup({ onClose })
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('CalendarDayPopup - 閉じたときのフォーカス復帰', () => {
  it('開く前にフォーカスしていたボタンへ、閉じたあとフォーカスが戻る', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [open, setOpen] = useState(true)
      return (
        <div>
          <button>Opener</button>
          {open && (
            <CalendarDayPopup
              date={DATE}
              records={RECORDS}
              exercises={EXERCISES}
              onClose={() => setOpen(false)}
              onNavigate={vi.fn()}
            />
          )}
        </div>
      )
    }

    render(<Harness />)
    const openerButton = screen.getByRole('button', { name: 'Opener' })
    openerButton.focus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(openerButton).toHaveFocus()
  })
})

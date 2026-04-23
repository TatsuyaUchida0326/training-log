import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PageHeaderProvider } from '../contexts/PageHeaderContext'
import HistoryPage from './HistoryPage'
import type { TrainingRecord, Exercise } from '../types'

// ── フィクスチャ ──────────────────────────────────────────────────────────────

const DATE_WITH_RECORD = '2026-04-22'

const MOCK_EXERCISES: Exercise[] = [
  { id: 'ex-chest-1', name: 'ベンチプレス', categoryId: '胸', isCustom: false },
  { id: 'ex-back-1',  name: 'デッドリフト', categoryId: '背中', isCustom: false },
]

const MOCK_RECORDS: TrainingRecord[] = [
  {
    id: 'rec-1',
    date: DATE_WITH_RECORD,
    exerciseId: 'ex-chest-1',
    sets: [
      { id: 's1', weight: 60, reps: 10, memo: '' },
      { id: 's2', weight: 60, reps: 10, memo: '' },
      { id: 's3', weight: 60, reps: 10, memo: '' },
    ],
  },
]

// ── モック ────────────────────────────────────────────────────────────────────

vi.mock('../hooks/useTrainingRecords', () => ({
  useTrainingRecords: () => ({
    records: MOCK_RECORDS,
    getRecordsByDate: (date: string) => MOCK_RECORDS.filter((r) => r.date === date),
    getRecord: vi.fn(),
    getLastRecord: vi.fn(),
    upsertRecord: vi.fn(),
    addSet: vi.fn(),
    updateSet: vi.fn(),
    deleteSet: vi.fn(),
    removeRecord: vi.fn(),
  }),
}))

vi.mock('../hooks/useExercises', () => ({
  useExercises: () => ({
    exercises: MOCK_EXERCISES,
    addExercise: vi.fn(),
    deleteExercise: vi.fn(),
    getCategoryExercises: vi.fn(),
  }),
}))

// ── ヘルパー ──────────────────────────────────────────────────────────────────

function renderHistoryPage() {
  return render(
    <PageHeaderProvider>
      <MemoryRouter initialEntries={['/history']}>
        <Routes>
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/date/:dateStr" element={<div data-testid="date-detail-page" />} />
        </Routes>
      </MemoryRouter>
    </PageHeaderProvider>
  )
}

// ── テスト ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('HistoryPage - タブ表示', () => {
  it('「ALL」タブが表示される', () => {
    renderHistoryPage()
    const allTabs = screen.getAllByText('ALL')
    expect(allTabs.length).toBeGreaterThanOrEqual(1)
  })

  it('「カレンダー」「グラフ」切り替えボタンが表示される', () => {
    renderHistoryPage()
    expect(screen.getByRole('button', { name: 'カレンダー' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'グラフ' })).toBeInTheDocument()
  })

  it('初期状態でカレンダービューが表示される', () => {
    renderHistoryPage()
    expect(screen.getByText('日')).toBeInTheDocument()
    expect(screen.getByText('月')).toBeInTheDocument()
  })
})

describe('HistoryPage - ビュー切り替え', () => {
  it('「グラフ」ボタンクリックでグラフビューに切り替わる', async () => {
    renderHistoryPage()
    await userEvent.click(screen.getByRole('button', { name: 'グラフ' }))
    expect(screen.queryByText('日')).not.toBeInTheDocument()
  })

  it('「グラフ」ビューで記録がない場合「記録がありません」が表示される', async () => {
    renderHistoryPage()
    await userEvent.click(screen.getByRole('button', { name: 'グラフ' }))
    expect(screen.getByText('記録がありません')).toBeInTheDocument()
  })

  it('「カレンダー」ボタンでカレンダービューに戻る', async () => {
    renderHistoryPage()
    await userEvent.click(screen.getByRole('button', { name: 'グラフ' }))
    await userEvent.click(screen.getByRole('button', { name: 'カレンダー' }))
    expect(screen.getByText('日')).toBeInTheDocument()
  })
})

describe('HistoryPage - カテゴリタブ', () => {
  it('デフォルト部位のタブが表示される', () => {
    renderHistoryPage()
    expect(screen.getByText('胸')).toBeInTheDocument()
    expect(screen.getByText('背中')).toBeInTheDocument()
    expect(screen.getByText('脚')).toBeInTheDocument()
  })

  it('部位タブをクリックすると選択状態になる', async () => {
    renderHistoryPage()
    const chestTab = screen.getByRole('button', { name: '胸' })
    await userEvent.click(chestTab)
    expect(chestTab.className).toContain('tabActive')
  })
})

describe('HistoryPage — カレンダー日付クリック × CalendarDayPopup', () => {
  it('records に記録がある日付をクリックするとポップアップが表示される', async () => {
    const user = userEvent.setup()
    renderHistoryPage()

    expect(screen.getByText('カレンダー')).toBeInTheDocument()

    // 22日のセル（記録あり）をクリック
    const dayCell = screen.getAllByText('22')[0]
    await user.click(dayCell)

    const overlay = screen.queryByTestId('popup-overlay')
    expect(overlay).toBeInTheDocument()
  })

  it('records に記録がない日付をクリックするとポップアップが表示されない', async () => {
    const user = userEvent.setup()
    renderHistoryPage()

    // 1日のセル（記録なし）をクリック
    const dayCells = screen.getAllByText('1')
    await user.click(dayCells[0])

    expect(screen.queryByTestId('popup-overlay')).not.toBeInTheDocument()
  })
})

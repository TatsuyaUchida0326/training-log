import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PageHeaderProvider } from '../../contexts/PageHeaderContext'
import HistoryPage from './HistoryPage'
import { setupFixedClock } from '../../test/fixedClock'
import { seedSettings } from '../../test/seed'
import type { TrainingRecord, Exercise, WeightUnit } from '../../types'

// ── フィクスチャ ──────────────────────────────────────────────────────────────

const DATE_WITH_RECORD = '2026-04-22'
const DATE_WITH_DELETED_EXERCISE = '2026-04-10'

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
  // 種目一覧から消えた種目の記録（画面には出ない想定）
  {
    id: 'rec-deleted',
    date: DATE_WITH_DELETED_EXERCISE,
    exerciseId: 'ex-deleted',
    sets: [{ id: 's4', weight: 50, reps: 10, memo: '' }],
  },
]

// ── モック ────────────────────────────────────────────────────────────────────

vi.mock('../../hooks/useTrainingRecords', () => ({
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

vi.mock('../../hooks/useExercises', () => ({
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

// カレンダーの表示月は実時間に依存するため 2026-04-16 に固定する
setupFixedClock(new Date(2026, 3, 16, 12))

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

  it('記録がない部位を選択してグラフビューにすると「記録がありません」が表示される', async () => {
    renderHistoryPage()
    // 腹筋はMOCK_RECORDSに記録がないのでグラフが空になる
    await userEvent.click(screen.getByRole('button', { name: '腹筋' }))
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

  it('種目一覧に無い種目の記録だけの日はポップアップが表示されない', async () => {
    const user = userEvent.setup()
    renderHistoryPage()

    // 10日のセル（削除済み種目の記録だけがある日）をクリック
    await user.click(screen.getAllByText('10')[0])

    expect(screen.queryByTestId('popup-overlay')).not.toBeInTheDocument()
  })
})

/**
 * lbs 設定のときグラフの値も lbs に換算する（セット数は換算しない）。
 *
 * recharts のツールチップはホバー時にしか描画されず jsdom では検証できないため、
 * 「Y軸の目盛が換算後の値まで伸びているか」で点の換算を確認する。
 * ツールチップの単位表示そのものは実機確認に委ねる。
 *
 * フィクスチャ（60kg × 10回 × 3セット）の期待値:
 *   最大重量 60kg → 132.3 lbs / 最大RM 80kg → 176.4 lbs / 総負荷量 1800kg → 3968（整数に丸める）
 */
describe('HistoryPage - グラフの重量単位', () => {
  function maxYAxisTick(chartTitle: string): number {
    const chartBlock = screen.getByText(chartTitle).parentElement as HTMLElement
    const tickValues = Array.from(chartBlock.querySelectorAll('svg text'))
      .map((tick) => Number(tick.textContent))
      .filter((value) => !Number.isNaN(value))
    return Math.max(...tickValues)
  }

  async function showGraphView(unit: WeightUnit): Promise<void> {
    seedSettings({ weightUnit: unit })
    renderHistoryPage()
    await userEvent.click(screen.getByRole('button', { name: 'グラフ' }))
  }

  it('lbs設定では最大重量グラフの目盛が lbs 換算値まで伸びる', async () => {
    await showGraphView('lbs')
    expect(maxYAxisTick('最大重量')).toBeGreaterThanOrEqual(132.3)
  })

  it('lbs設定では最大RMグラフの目盛が lbs 換算値まで伸びる', async () => {
    await showGraphView('lbs')
    expect(maxYAxisTick('最大RM')).toBeGreaterThanOrEqual(176.4)
  })

  it('lbs設定では総負荷量グラフの目盛が lbs 換算値まで伸びる', async () => {
    await showGraphView('lbs')
    expect(maxYAxisTick('総負荷量')).toBeGreaterThanOrEqual(3968)
  })

  it('lbs設定でもセット数グラフは換算されない', async () => {
    await showGraphView('lbs')
    expect(maxYAxisTick('セット数')).toBe(3)
  })

  it('kg設定では最大重量グラフの目盛が kg のまま表示される', async () => {
    await showGraphView('kg')
    expect(maxYAxisTick('最大重量')).toBeGreaterThanOrEqual(60)
    expect(maxYAxisTick('最大重量')).toBeLessThan(132.3)
  })

  it('kg設定では総負荷量グラフの目盛が kg のまま表示される', async () => {
    await showGraphView('kg')
    expect(maxYAxisTick('総負荷量')).toBeGreaterThanOrEqual(1800)
    expect(maxYAxisTick('総負荷量')).toBeLessThan(3968)
  })
})

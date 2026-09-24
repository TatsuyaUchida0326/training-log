import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import HomePage from './HomePage'
import { seedExercises, seedRecords, seedSettings, todayStr } from '../../test/seed'

beforeEach(() => {
  localStorage.clear()
})

function renderHomePage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/date/:dateStr" element={<div data-testid="detail-page" />} />
        <Route path="/date/:dateStr/exercises/:exerciseId" element={<div data-testid="entry-page" />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('HomePage', () => {
  it('カレンダーが表示される', () => {
    renderHomePage()
    expect(screen.getByText('日')).toBeInTheDocument()
  })

  it('日付をクリックすると DateDetailPage へ遷移する', async () => {
    renderHomePage()
    const dayCells = screen.getAllByText('1')
    await userEvent.click(dayCells[0])
    expect(screen.getByTestId('detail-page')).toBeInTheDocument()
  })

  it('記録がない場合は「まだ記録がありません」が表示される', () => {
    renderHomePage()
    expect(screen.getByText('まだ記録がありません')).toBeInTheDocument()
  })

  it('「今日のトレーニング」セクションが表示される', () => {
    renderHomePage()
    expect(screen.getByText('今日のトレーニング')).toBeInTheDocument()
  })

  it('体組成データがない場合 BodyTrendChart は表示されない', () => {
    renderHomePage()
    expect(screen.queryByTestId('weight-chart')).not.toBeInTheDocument()
    expect(screen.queryByTestId('bodyfat-chart')).not.toBeInTheDocument()
  })

  it('体重データがある場合 BodyTrendChart の体重グラフが表示される', () => {
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem(
      'strength-log-body-records',
      JSON.stringify([{ date: today, weight: 70, bodyFat: null, muscleMass: null, waist: null, memo: '' }])
    )
    renderHomePage()
    expect(screen.getByTestId('weight-chart')).toBeInTheDocument()
  })
})

/* ── 空セット除外・削除済み種目・lbs 表示のテスト用ヘルパー ── */

function seedBenchPress(): void {
  seedExercises([{ id: 'ex-bench', name: 'ベンチプレス', categoryId: '胸', isCustom: false }])
}

function seedTodayRecord(
  sets: { weight: number; reps: number }[],
  exerciseId = 'ex-bench',
): void {
  seedRecords([
    {
      id: 'rec-today',
      date: todayStr(),
      exerciseId,
      sets: sets.map((set, index) => ({
        id: `set-${index}`,
        weight: set.weight,
        reps: set.reps,
        memo: '',
      })),
    },
  ])
}

function trophyPanel(): HTMLElement {
  return screen.getByText('1RM更新').closest('.trophy-container') as HTMLElement
}

describe('HomePage - 空セットだけの記録は記録として扱わない', () => {
  it('空セットだけの記録ではカレンダーに記録マークが出ない', () => {
    seedBenchPress()
    seedTodayRecord([{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }])
    renderHomePage()
    expect(screen.queryAllByTestId('marked-dot')).toHaveLength(0)
  })

  it('空セットだけの記録では「今日のトレーニング」に種目が出ない', () => {
    seedBenchPress()
    seedTodayRecord([{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }])
    renderHomePage()
    expect(screen.queryByText('ベンチプレス')).not.toBeInTheDocument()
    expect(screen.getByText('まだ記録がありません')).toBeInTheDocument()
  })

  it('中身のあるセットがあればカレンダーに記録マークが出る', () => {
    seedBenchPress()
    seedTodayRecord([{ weight: 60, reps: 10 }, { weight: 0, reps: 0 }])
    renderHomePage()
    expect(screen.queryAllByTestId('marked-dot')).toHaveLength(1)
  })

  it('重さ0でも回数が入っていれば「今日のトレーニング」に表示される（自重種目）', () => {
    seedBenchPress()
    seedTodayRecord([{ weight: 0, reps: 20 }])
    renderHomePage()
    expect(screen.getByText('ベンチプレス')).toBeInTheDocument()
  })
})

describe('HomePage - トロフィーの重量単位', () => {
  it('lbs設定ではトロフィーのRMが lbs 換算値で表示される', () => {
    seedBenchPress()
    seedSettings({ weightUnit: 'lbs' })
    seedTodayRecord([{ weight: 60, reps: 10 }])
    renderHomePage()
    expect(within(trophyPanel()).getByText('176.4 lbs')).toBeInTheDocument()
  })

  it('kg設定ではトロフィーのRMが kg のまま表示される', () => {
    seedBenchPress()
    seedSettings({ weightUnit: 'kg' })
    seedTodayRecord([{ weight: 60, reps: 10 }])
    renderHomePage()
    expect(within(trophyPanel()).getByText('80 kg')).toBeInTheDocument()
  })
})

describe('HomePage - 削除済み種目の記録', () => {
  it('種目一覧に無い exerciseId の記録はカレンダーの印にもゲージにも数えない', () => {
    seedBenchPress()
    seedSettings({ requiredExercises: 1, requiredSets: 3 })
    seedTodayRecord(
      [
        { weight: 60, reps: 10 },
        { weight: 60, reps: 10 },
        { weight: 60, reps: 10 },
      ],
      'ex-deleted'
    )
    renderHomePage()
    expect(screen.queryAllByTestId('marked-dot')).toHaveLength(0)
    expect(screen.getByText('0 / 90')).toBeInTheDocument()
  })
})

describe('HomePage - アクセシビリティ（今日の種目カードはリンク）', () => {
  it('今日の種目カードが role="link" として取得でき、記録画面への href を持つ', () => {
    seedBenchPress()
    seedTodayRecord([{ weight: 60, reps: 10 }])
    renderHomePage()
    const link = screen.getByRole('link', { name: /ベンチプレス/ })
    expect(link).toHaveAttribute('href', `/date/${todayStr()}/exercises/ex-bench`)
  })

  it('リンクをクリックすると記録画面へ遷移する', async () => {
    seedBenchPress()
    seedTodayRecord([{ weight: 60, reps: 10 }])
    renderHomePage()
    await userEvent.click(screen.getByRole('link', { name: /ベンチプレス/ }))
    expect(screen.getByTestId('entry-page')).toBeInTheDocument()
  })
})

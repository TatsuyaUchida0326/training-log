import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import DateDetailPage from './DateDetailPage'
import { PageHeaderProvider, usePageHeader } from '../../contexts/PageHeaderContext'
import { seedExercises, seedRecords, seedSettings } from '../../test/seed'

function HeaderSpy() {
  const { header } = usePageHeader()
  return <div data-testid="page-title">{header.title}</div>
}

function renderWithRoute(dateStr: string) {
  return render(
    <PageHeaderProvider>
      <HeaderSpy />
      <MemoryRouter initialEntries={[`/date/${dateStr}`]}>
        <Routes>
          <Route path="/date/:dateStr" element={<DateDetailPage />} />
        </Routes>
      </MemoryRouter>
    </PageHeaderProvider>
  )
}

describe('DateDetailPage', () => {
  it('ヘッダータイトルは「トレーニング記録画面」で固定される', () => {
    renderWithRoute('2026-04-16')
    expect(screen.getByTestId('page-title')).toHaveTextContent('トレーニング記録画面')
  })

  it('有効な dateStr で日本語の日付が body に表示される', () => {
    renderWithRoute('2026-04-16')
    expect(screen.getByText('2026年4月16日（木）')).toBeInTheDocument()
  })

  it('別の日付でも正しく日本語表示される', () => {
    renderWithRoute('2026-01-01')
    expect(screen.getByText('2026年1月1日（木）')).toBeInTheDocument()
  })

  it('空状態メッセージが表示される', () => {
    renderWithRoute('2026-04-16')
    expect(
      screen.getByText('右下の ＋ から種目を追加してトレーニングを記録しましょう')
    ).toBeInTheDocument()
  })

  it('無効な dateStr でフォールバックテキストが表示される', () => {
    renderWithRoute('invalid-date')
    expect(screen.getByText('日付が正しくありません')).toBeInTheDocument()
  })

  it('記録がある種目名が表示される', () => {
    const dateStr = '2026-04-23'
    seedExercises([{ id: 'ex-bench', name: 'ベンチプレス', categoryId: '胸', isCustom: false }])
    seedRecords([
      {
        id: 'rec-1',
        date: dateStr,
        exerciseId: 'ex-bench',
        sets: [{ id: 's1', weight: 80, reps: 5, memo: '' }],
      },
    ])
    renderWithRoute(dateStr)
    expect(screen.getByText('ベンチプレス')).toBeInTheDocument()
  })
})

/* ── 空セット除外・削除済み種目・lbs 表示のテスト用ヘルパー ── */

const TARGET_DATE = '2026-04-23'

interface SeedSet {
  weight: number
  reps: number
}

function seedChestExercises(exercises: { id: string; name: string }[]): void {
  seedExercises(
    exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      categoryId: '胸',
      isCustom: false,
    }))
  )
}

function seedTargetDateRecords(records: { exerciseId: string; sets: SeedSet[] }[]): void {
  seedRecords(
    records.map((record, recordIndex) => ({
      id: `rec-${recordIndex}`,
      date: TARGET_DATE,
      exerciseId: record.exerciseId,
      sets: record.sets.map((set, setIndex) => ({
        id: `rec-${recordIndex}-set-${setIndex}`,
        weight: set.weight,
        reps: set.reps,
        memo: '',
      })),
    }))
  )
}

function statValue(label: string): string {
  return screen.getByText(label).nextElementSibling?.textContent ?? ''
}

describe('DateDetailPage - 空セットの除外', () => {
  beforeEach(() => {
    localStorage.clear()
    seedChestExercises([
      { id: 'ex-bench', name: 'ベンチプレス' },
      { id: 'ex-squat', name: 'スクワット' },
    ])
  })

  it('空セットだけの記録では種目カードが表示されず空状態メッセージが出る', () => {
    seedTargetDateRecords([{ exerciseId: 'ex-bench', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] }])
    renderWithRoute(TARGET_DATE)
    expect(screen.queryByText('ベンチプレス')).not.toBeInTheDocument()
    expect(
      screen.getByText('右下の ＋ から種目を追加してトレーニングを記録しましょう')
    ).toBeInTheDocument()
  })

  it('空セットだけの記録は合計種目数に数えない', () => {
    seedTargetDateRecords([{ exerciseId: 'ex-bench', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] }])
    renderWithRoute(TARGET_DATE)
    expect(statValue('合計種目数')).toBe('0')
  })

  it('空セットだけの種目を混ぜても合計種目数は中身のある種目だけ数える', () => {
    seedTargetDateRecords([
      { exerciseId: 'ex-bench', sets: [{ weight: 60, reps: 10 }, { weight: 0, reps: 0 }] },
      { exerciseId: 'ex-squat', sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
    ])
    renderWithRoute(TARGET_DATE)
    expect(statValue('合計種目数')).toBe('1')
    expect(screen.queryByText('スクワット')).not.toBeInTheDocument()
  })

  it('合計セット数は中身のあるセットだけ数える', () => {
    seedTargetDateRecords([
      {
        exerciseId: 'ex-bench',
        sets: [{ weight: 60, reps: 10 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }],
      },
    ])
    renderWithRoute(TARGET_DATE)
    expect(statValue('合計セット数')).toBe('1')
  })

  it('合計レップ数と負荷量は中身のあるセットだけで計算する', () => {
    seedTargetDateRecords([
      {
        exerciseId: 'ex-bench',
        sets: [{ weight: 60, reps: 10 }, { weight: 0, reps: 0 }, { weight: 0, reps: 0 }],
      },
    ])
    renderWithRoute(TARGET_DATE)
    expect(statValue('合計レップ数')).toBe('10')
    expect(statValue('負荷量(kg)')).toBe('600')
  })

  it('重さ0でも回数が入っていれば自重種目として数える', () => {
    seedTargetDateRecords([{ exerciseId: 'ex-bench', sets: [{ weight: 0, reps: 20 }] }])
    renderWithRoute(TARGET_DATE)
    expect(statValue('合計種目数')).toBe('1')
    expect(statValue('合計レップ数')).toBe('20')
    expect(screen.getByText('ベンチプレス')).toBeInTheDocument()
  })
})

describe('DateDetailPage - 削除済み種目の記録', () => {
  beforeEach(() => {
    localStorage.clear()
    seedChestExercises([{ id: 'ex-bench', name: 'ベンチプレス' }])
  })

  it('種目一覧に存在しない種目の記録は合計種目数に数えない', () => {
    seedTargetDateRecords([
      { exerciseId: 'ex-bench', sets: [{ weight: 60, reps: 10 }] },
      { exerciseId: 'ex-deleted', sets: [{ weight: 80, reps: 5 }, { weight: 80, reps: 5 }] },
    ])
    renderWithRoute(TARGET_DATE)
    expect(statValue('合計種目数')).toBe('1')
  })

  it('削除済み種目の記録だけの日は空状態メッセージが出る', () => {
    seedTargetDateRecords([{ exerciseId: 'ex-deleted', sets: [{ weight: 80, reps: 5 }] }])
    renderWithRoute(TARGET_DATE)
    expect(statValue('合計種目数')).toBe('0')
    expect(
      screen.getByText('右下の ＋ から種目を追加してトレーニングを記録しましょう')
    ).toBeInTheDocument()
  })
})

describe('DateDetailPage - lbs 設定の表示', () => {
  beforeEach(() => {
    localStorage.clear()
    seedChestExercises([{ id: 'ex-bench', name: 'ベンチプレス' }])
    seedTargetDateRecords([{ exerciseId: 'ex-bench', sets: [{ weight: 60, reps: 10 }] }])
  })

  it('lbs設定では重さ列が lbs 換算値で表示される', () => {
    seedSettings({ weightUnit: 'lbs' })
    renderWithRoute(TARGET_DATE)
    expect(screen.getByText('132.3 lbs')).toBeInTheDocument()
  })

  it('lbs設定ではRM列が lbs 換算値で表示される', () => {
    seedSettings({ weightUnit: 'lbs' })
    renderWithRoute(TARGET_DATE)
    expect(screen.getByText('176.4')).toBeInTheDocument()
  })

  it('kg設定ではRM列が kg のまま表示される', () => {
    seedSettings({ weightUnit: 'kg' })
    renderWithRoute(TARGET_DATE)
    expect(screen.getByText('80')).toBeInTheDocument()
  })
})

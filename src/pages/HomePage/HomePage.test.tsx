import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import HomePage from './HomePage'
import {
  makeBodyRecord,
  seedBodyRecords,
  seedBodySettings,
  seedExercises,
  seedRecords,
  seedSettings,
  todayStr,
} from '../../test/seed'
import { BODY_SETTINGS_KEY } from '../../test/storageKeys'

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

describe('HomePage - 目標までの残り', () => {
  const GOAL_LIST = { name: '目標までの残り' }

  it('目標を設定していなければ、記録があっても出ない（今の画面のまま）', () => {
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 68.2, bodyFat: 20, muscleMass: 35 })])
    renderHomePage()
    expect(screen.queryByRole('list', GOAL_LIST)).not.toBeInTheDocument()
    expect(screen.queryByText(/あと/)).not.toBeInTheDocument()
  })

  it('体組成のデータが何も無ければ出ない', () => {
    renderHomePage()
    expect(screen.queryByRole('list', GOAL_LIST)).not.toBeInTheDocument()
  })

  it('目標を設定していても、その項目の記録が一度も無ければ出ない', () => {
    seedBodySettings({ targetWeight: 65 })
    renderHomePage()
    expect(screen.queryByRole('list', GOAL_LIST)).not.toBeInTheDocument()
  })

  it('目標体重を設定すると「体重 あと 3.2 kg 減」が出る', () => {
    seedBodySettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 68.2 })])
    renderHomePage()
    const list = screen.getByRole('list', GOAL_LIST)
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(list).toHaveTextContent('体重')
    expect(list).toHaveTextContent(/68\.2\s*→\s*目標\s*65\.0\s*kg/)
    expect(list).toHaveTextContent(/あと\s*3\.2\s*kg\s*減/)
  })

  it('目標を超えていれば「達成」が出る', () => {
    seedBodySettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 64.5 })])
    renderHomePage()
    expect(screen.getByRole('list', GOAL_LIST)).toHaveTextContent('達成')
  })

  it('3項目の目標があれば3行出る。筋肉量(%)は kg に換算して比べる', () => {
    seedBodySettings({
      muscleMassUnit: '%',
      targetWeight: 65,
      targetBodyFat: 15,
      targetMuscleMassKg: 30,
      goalBaselines: { weight: 70, bodyFat: 22, muscleMass: 25 },
    })
    // 筋肉量 = 70kg × 40% = 28kg
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 70, bodyFat: 20, muscleMass: 40 })])
    renderHomePage()
    const rows = within(screen.getByRole('list', GOAL_LIST)).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('体重')
    expect(rows[1]).toHaveTextContent('体脂肪率')
    expect(rows[2]).toHaveTextContent('筋肉量')
    expect(rows[2]).toHaveTextContent(/あと\s*2\.0\s*kg\s*増/)
  })

  it('一番新しい日付の記録を使う（保存順は古い順でなくてもよい）', () => {
    seedBodySettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    seedBodyRecords([
      makeBodyRecord('2026-09-03', { weight: 66 }),
      makeBodyRecord('2026-09-01', { weight: 70 }),
    ])
    renderHomePage()
    expect(screen.getByRole('list', GOAL_LIST)).toHaveTextContent(/あと\s*1\.0\s*kg\s*減/)
  })

  it('目標の一覧はカレンダーより前（DOM 順で先）にある', () => {
    seedBodySettings({ targetWeight: 65, goalBaselines: { weight: 70 } })
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 68 })])
    renderHomePage()
    const list = screen.getByRole('list', GOAL_LIST)
    const weekdayHeader = screen.getByText('日') // カレンダーの曜日見出し
    expect(list.compareDocumentPosition(weekdayHeader) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('目標体重だけの人の画面でも、カレンダーと「今日のトレーニング」は今まで通り出る', () => {
    seedBodySettings({ targetWeight: 65 })
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 68 })])
    renderHomePage()
    expect(screen.getByText('日')).toBeInTheDocument()
    expect(screen.getByText('今日のトレーニング')).toBeInTheDocument()
  })

  it('goalBaselines の無い旧データ（目標体重だけ保存済み）でも読めて、差の向きで表示する', () => {
    localStorage.setItem(
      BODY_SETTINGS_KEY,
      JSON.stringify({ height: 0, targetWeight: 65, muscleMassUnit: '%', targetBodyFat: 0 }),
    )
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 68 })])
    renderHomePage()
    expect(screen.getByRole('list', GOAL_LIST)).toHaveTextContent(/あと\s*3\.0\s*kg\s*減/)
  })

  it('goalBaselines が壊れていても画面は落ちず、baseline 無しとして表示する', () => {
    localStorage.setItem(
      BODY_SETTINGS_KEY,
      JSON.stringify({
        height: 0,
        targetWeight: 65,
        muscleMassUnit: '%',
        targetBodyFat: 0,
        targetMuscleMassKg: 0,
        goalBaselines: 'broken',
      }),
    )
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 68 })])
    renderHomePage()
    expect(screen.getByRole('list', GOAL_LIST)).toHaveTextContent(/あと\s*3\.0\s*kg\s*減/)
  })
})

describe('HomePage - 目標までの残り（数値でない保存値）', () => {
  const GOAL_LIST = { name: '目標までの残り' }

  function seedRawBodySettings(overrides: Record<string, unknown>): void {
    localStorage.setItem(
      BODY_SETTINGS_KEY,
      JSON.stringify({
        height: 0,
        targetWeight: 0,
        muscleMassUnit: 'kg',
        targetBodyFat: 0,
        targetMuscleMassKg: 0,
        goalBaselines: {},
        ...overrides,
      }),
    )
  }

  function seedRawBodyRecords(records: unknown[]): void {
    seedBodyRecords(records as Parameters<typeof seedBodyRecords>[0])
  }

  it('目標体重が文字列でも画面は落ちず、その行は出ない', () => {
    seedRawBodySettings({ targetWeight: '65' })
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 68 })])
    expect(() => renderHomePage()).not.toThrow()
    expect(screen.queryByRole('list', GOAL_LIST)).not.toBeInTheDocument()
    expect(screen.getByText('今日のトレーニング')).toBeInTheDocument()
  })

  it('文字列の目標があっても、正常な目標の行は出る', () => {
    seedRawBodySettings({ targetWeight: '65', targetBodyFat: 15, goalBaselines: { bodyFat: 22 } })
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 68, bodyFat: 20 })])
    renderHomePage()
    const rows = within(screen.getByRole('list', GOAL_LIST)).getAllByRole('listitem')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('体脂肪率')
  })

  it('目標が null でも画面は落ちず、行は出ない', () => {
    seedRawBodySettings({ targetWeight: null })
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 68 })])
    expect(() => renderHomePage()).not.toThrow()
    expect(screen.queryByRole('list', GOAL_LIST)).not.toBeInTheDocument()
  })

  it('一番新しい記録の体重が文字列なら、その日は値なしとして古い日の値で出す', () => {
    seedRawBodySettings({ targetWeight: 65, goalBaselines: { weight: 72 } })
    seedRawBodyRecords([
      makeBodyRecord('2026-09-01', { weight: 70 }),
      { ...makeBodyRecord('2026-09-02'), weight: '68.2' },
    ])
    renderHomePage()
    expect(screen.getByRole('list', GOAL_LIST)).toHaveTextContent(/70\.0\s*→\s*目標\s*65\.0\s*kg/)
  })

  it('体重の記録が文字列だけなら画面は落ちず、体重の行は出ない', () => {
    seedRawBodySettings({ targetWeight: 65 })
    seedRawBodyRecords([{ ...makeBodyRecord('2026-09-02'), weight: '68.2' }])
    expect(() => renderHomePage()).not.toThrow()
    expect(screen.queryByRole('list', GOAL_LIST)).not.toBeInTheDocument()
  })

  it('weight のキーが無い記録があっても画面は落ちず、古い日の値で出す', () => {
    seedRawBodySettings({ targetWeight: 65, goalBaselines: { weight: 72 } })
    seedRawBodyRecords([
      makeBodyRecord('2026-09-01', { weight: 70 }),
      { date: '2026-09-02', bodyFat: 20, muscleMass: null, waist: null, memo: '' },
    ])
    renderHomePage()
    expect(screen.getByRole('list', GOAL_LIST)).toHaveTextContent(/70\.0\s*→\s*目標\s*65\.0\s*kg/)
  })
})

describe('HomePage - 目標が無いときの並び', () => {
  it('目標が無いとき、ページ先頭の要素はカレンダー（今までの画面のまま）', () => {
    seedBodyRecords([makeBodyRecord('2026-09-01', { weight: 68 })])
    const { container } = renderHomePage()
    const page = container.firstElementChild as HTMLElement
    expect(page.firstElementChild).toContainElement(screen.getByText('日'))
  })
})

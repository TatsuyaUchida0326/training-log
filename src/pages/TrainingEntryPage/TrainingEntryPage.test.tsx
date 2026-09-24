import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { PageHeaderProvider } from '../../contexts/PageHeaderContext'
import { HeaderSpy } from '../../test/HeaderSpy'
import TrainingEntryPage from './TrainingEntryPage'
import { readStoredRecords, seedExercises, seedRecords, seedSettings } from '../../test/seed'
import { repsInputs, weightInputs } from '../../test/inputs'

const EXERCISE_ID = 'ex-bench'
const DATE_STR = '2026-04-23'

function setupExercise() {
  seedExercises([{ id: EXERCISE_ID, name: 'ベンチプレス', categoryId: '胸', isCustom: false }])
}

function renderEntry(exerciseId = EXERCISE_ID, date = DATE_STR) {
  return render(
    <PageHeaderProvider>
      <HeaderSpy />
      <MemoryRouter initialEntries={[`/date/${date}/exercises/${exerciseId}`]}>
        <Routes>
          <Route path="/date/:dateStr" element={<div data-testid="detail-page" />} />
          <Route
            path="/date/:dateStr/exercises/:exerciseId"
            element={<TrainingEntryPage />}
          />
        </Routes>
      </MemoryRouter>
    </PageHeaderProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
  setupExercise()
})

describe('TrainingEntryPage - 表示', () => {
  it('種目名がヘッダーに表示される', () => {
    renderEntry()
    expect(screen.getByText('ベンチプレス')).toBeInTheDocument()
  })

  it('「セット」「重さ」「回数」カラムヘッダーが表示される', () => {
    renderEntry()
    expect(screen.getByText('セット')).toBeInTheDocument()
    expect(screen.getByText('重さ')).toBeInTheDocument()
    expect(screen.getByText('回数')).toBeInTheDocument()
  })

  it('RM はセット行の2段目に移り、カラムヘッダーには出さない', () => {
    renderEntry()
    expect(screen.queryByText('RM')).not.toBeInTheDocument()
  })

  it('重さ・回数の入力欄はセット番号つきのラベルを持つ', async () => {
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    expect(screen.getByLabelText('1セット目の重さ')).toBeInTheDocument()
    expect(screen.getByLabelText('1セット目の回数')).toBeInTheDocument()
    expect(screen.getByLabelText('3セット目の重さ')).toBeInTheDocument()
  })

  it('デフォルト3セットが表示される', async () => {
    renderEntry()
    await waitFor(() => {
      const deleteButtons = screen.getAllByLabelText('セット削除')
      expect(deleteButtons).toHaveLength(3)
    })
  })

  it('「セットを追加」ボタンが表示される', () => {
    renderEntry()
    expect(screen.getByText('セットを追加')).toBeInTheDocument()
  })

  it('ヘッダータイトルが「セットを記録」になる', () => {
    renderEntry()
    expect(screen.getByTestId('page-title')).toHaveTextContent('セットを記録')
  })

  it('ヘッダー左に戻るボタンが表示される', () => {
    renderEntry()
    expect(
      within(screen.getByTestId('page-header-left')).getByRole('button', { name: '戻る' })
    ).toBeInTheDocument()
  })

  it('「戻る」でその日の日付詳細へ遷移する', async () => {
    renderEntry()
    await userEvent.click(screen.getByRole('button', { name: '戻る' }))
    expect(screen.getByTestId('detail-page')).toBeInTheDocument()
  })

  it('存在しない種目IDの場合エラーメッセージが表示される', () => {
    renderEntry('nonexistent-id')
    expect(screen.getByText('種目が見つかりません')).toBeInTheDocument()
  })
})

describe('TrainingEntryPage - セット操作', () => {
  it('「セットを追加」でセット数が増える', async () => {
    renderEntry()
    await waitFor(() => {
      expect(screen.getAllByLabelText('セット削除')).toHaveLength(3)
    })
    await userEvent.click(screen.getByText('セットを追加'))
    await waitFor(() => {
      expect(screen.getAllByLabelText('セット削除')).toHaveLength(4)
    })
  })

  it('セット削除ボタンでセット数が減る', async () => {
    renderEntry()
    await waitFor(() => {
      expect(screen.getAllByLabelText('セット削除')).toHaveLength(3)
    })
    await userEvent.click(screen.getAllByLabelText('セット削除')[0])
    await waitFor(() => {
      expect(screen.getAllByLabelText('セット削除')).toHaveLength(2)
    })
  })
})

describe('TrainingEntryPage - 1RM 計算', () => {
  it('重さ0・回数0 のとき RM欄に「—」が表示される', async () => {
    renderEntry()
    await waitFor(() => {
      const dashes = screen.getAllByText('—')
      expect(dashes.length).toBeGreaterThanOrEqual(3)
    })
  })

  it('重さと回数を入力すると RM が計算される（Epley式）', async () => {
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    // weight=100, reps=10 → RM = 100 * (1 + 10/30) = 133.3
    fireEvent.blur(weightInputs()[0], { target: { value: '100' } })
    fireEvent.blur(repsInputs()[0], { target: { value: '10' } })
    await waitFor(() => {
      expect(screen.getByText('133.3 kg')).toBeInTheDocument()
    })
  })
})

describe('TrainingEntryPage - 1RM トースト', () => {
  it('歴代最高を超えたとき「1RM 更新！」トーストが表示される', async () => {
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    fireEvent.blur(weightInputs()[0], { target: { value: '100' } })
    fireEvent.blur(repsInputs()[0], { target: { value: '10' } })
    await waitFor(() => {
      expect(screen.getByText('1RM 更新！')).toBeInTheDocument()
    })
  })

  it('同じRM値を入力してもトーストは表示されない（厳密 > 比較）', async () => {
    // 先に既存記録をセット（RM 133.3相当）
    seedRecords([
      {
        id: 'rec-prev',
        date: '2026-04-01',
        exerciseId: EXERCISE_ID,
        sets: [{ id: 's1', weight: 100, reps: 10, memo: '' }],
      },
    ])
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    // 同じ 100kg × 10reps を入力 → RM = 133.3 = 133.3 → 更新にならない
    fireEvent.blur(weightInputs()[0], { target: { value: '100' } })
    fireEvent.blur(repsInputs()[0], { target: { value: '10' } })
    await waitFor(() => {
      expect(screen.queryByText('1RM 更新！')).not.toBeInTheDocument()
    })
  })
})

describe('TrainingEntryPage - Last Record 表示', () => {
  it('前回記録がある場合「Last Record」セクションが表示される', async () => {
    seedRecords([
      {
        id: 'rec-prev',
        date: '2026-04-20',
        exerciseId: EXERCISE_ID,
        sets: [{ id: 's1', weight: 80, reps: 8, memo: '' }],
      },
    ])
    renderEntry()
    await waitFor(() => {
      expect(screen.getByText(/Last Record/)).toBeInTheDocument()
    })
  })

  it('前回記録がない場合「Last Record」セクションが表示されない', async () => {
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    expect(screen.queryByText(/Last Record/)).not.toBeInTheDocument()
  })
})

/* ── 空セット除外・lbs 表示のテスト用ヘルパー ── */

function seedRecord(sets: { weight: number; reps: number }[]): void {
  seedRecords([
    {
      id: `rec-${EXERCISE_ID}-${DATE_STR}`,
      date: DATE_STR,
      exerciseId: EXERCISE_ID,
      sets: sets.map((set, index) => ({
        id: `seed-${index}`,
        weight: set.weight,
        reps: set.reps,
        memo: '',
      })),
    },
  ])
}

describe('TrainingEntryPage - 開いただけでは空の記録を保存しない', () => {
  it('記録が無い日に画面を開いても localStorage に記録が作られない', async () => {
    renderEntry()
    await waitFor(() => {
      expect(screen.getAllByLabelText('セット削除')).toHaveLength(3)
    })
    expect(readStoredRecords()).toEqual([])
  })

  it('記録が無い日に画面を開くと設定の既定セット数ぶんの下書き行が表示される', async () => {
    seedSettings({ defaultSets: 4 })
    renderEntry()
    await waitFor(() => {
      expect(screen.getAllByLabelText('セット削除')).toHaveLength(4)
    })
    expect(readStoredRecords()).toEqual([])
  })

  it('重さを入力して欄を離れた時点で記録が作られ、その値が保存される', async () => {
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    fireEvent.blur(weightInputs()[0], { target: { value: '60' } })
    await waitFor(() => {
      expect(readStoredRecords()).toHaveLength(1)
    })
    expect(readStoredRecords()[0].sets[0].weight).toBe(60)
  })

  it('入力で作られた記録は日付・種目ID・既定セット数を持つ', async () => {
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    fireEvent.blur(weightInputs()[0], { target: { value: '60' } })
    await waitFor(() => {
      expect(readStoredRecords()).toHaveLength(1)
    })
    const record = readStoredRecords()[0]
    expect(record.date).toBe(DATE_STR)
    expect(record.exerciseId).toBe(EXERCISE_ID)
    expect(record.sets).toHaveLength(3)
  })

  it('回数だけ入力して欄を離れても記録が作られる（自重種目）', async () => {
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    fireEvent.blur(repsInputs()[0], { target: { value: '12' } })
    await waitFor(() => {
      expect(readStoredRecords()).toHaveLength(1)
    })
    expect(readStoredRecords()[0].sets[0].reps).toBe(12)
    expect(readStoredRecords()[0].sets[0].weight).toBe(0)
  })

  it('2セット目だけ入力したとき1セット目は空のまま保存される', async () => {
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    fireEvent.blur(weightInputs()[1], { target: { value: '70' } })
    await waitFor(() => {
      expect(readStoredRecords()).toHaveLength(1)
    })
    const record = readStoredRecords()[0]
    expect(record.sets).toHaveLength(3)
    expect(record.sets[0].weight).toBe(0)
    expect(record.sets[1].weight).toBe(70)
  })

  it('空欄のまま欄を離れただけでは記録が作られない', async () => {
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    fireEvent.blur(weightInputs()[0], { target: { value: '' } })
    fireEvent.blur(repsInputs()[0], { target: { value: '' } })
    await waitFor(() => {
      expect(screen.getAllByLabelText('セット削除')).toHaveLength(3)
    })
    expect(readStoredRecords()).toEqual([])
  })

  it('「セットを追加」を押しただけでは記録が作られない', async () => {
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    await userEvent.click(screen.getByText('セットを追加'))
    await waitFor(() => {
      expect(screen.getAllByLabelText('セット削除')).toHaveLength(4)
    })
    expect(readStoredRecords()).toEqual([])
  })

  it('既に記録がある日に開いても既定セット数まで行が増えない', async () => {
    seedRecord([{ weight: 80, reps: 10 }])
    renderEntry()
    await waitFor(() => {
      expect(screen.getAllByLabelText('セット削除')).toHaveLength(1)
    })
    expect(readStoredRecords()[0].sets).toHaveLength(1)
  })
})

describe('TrainingEntryPage - 空欄にしたら0として保存する', () => {
  it('値が入っている重さ欄を空にして離れると0が保存される', async () => {
    seedRecord([{ weight: 60, reps: 10 }])
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    fireEvent.blur(weightInputs()[0], { target: { value: '' } })
    await waitFor(() => {
      expect(readStoredRecords()[0].sets[0].weight).toBe(0)
    })
  })

  it('値が入っている回数欄を空にして離れると0が保存される', async () => {
    seedRecord([{ weight: 60, reps: 10 }])
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    fireEvent.blur(repsInputs()[0], { target: { value: '' } })
    await waitFor(() => {
      expect(readStoredRecords()[0].sets[0].reps).toBe(0)
    })
  })

  it('重さを空にしても回数の値は元のまま残る', async () => {
    seedRecord([{ weight: 60, reps: 10 }])
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    fireEvent.blur(weightInputs()[0], { target: { value: '' } })
    await waitFor(() => {
      expect(readStoredRecords()[0].sets[0].weight).toBe(0)
    })
    expect(readStoredRecords()[0].sets[0].reps).toBe(10)
  })
})

describe('TrainingEntryPage - lbs 設定での重さ入力', () => {
  it('lbs設定では保存値35kgのセットが重さ欄に77.2として表示される', async () => {
    seedSettings({ weightUnit: 'lbs' })
    seedRecord([{ weight: 35, reps: 10 }])
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    expect(weightInputs()[0].value).toBe('77.2')
  })

  it('lbs設定で表示値のまま欄を出入りしても保存値は35kgのまま変わらない', async () => {
    seedSettings({ weightUnit: 'lbs' })
    seedRecord([{ weight: 35, reps: 10 }])
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    fireEvent.blur(weightInputs()[0], { target: { value: '77.2' } })
    await waitFor(() => {
      expect(readStoredRecords()[0].sets[0].weight).toBe(35)
    })
  })

  it('lbs設定で値を変えずに欄を出入りしても1RM更新の演出は出ない', async () => {
    seedSettings({ weightUnit: 'lbs' })
    seedRecord([{ weight: 32.5, reps: 10 }])
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    // 32.5kg は lbs 表示で 71.7。往復換算のズレ（32.52kg）で RM が 43.3 → 43.4 に化ける値
    fireEvent.blur(weightInputs()[0], { target: { value: '71.7' } })
    await waitFor(() => {
      expect(readStoredRecords()[0].sets[0].weight).toBe(32.5)
    })
    expect(screen.queryByText('1RM 更新！')).not.toBeInTheDocument()
  })

  it('lbs設定で別の値を入力して欄を離れるとkg換算して保存される', async () => {
    seedSettings({ weightUnit: 'lbs' })
    seedRecord([{ weight: 35, reps: 10 }])
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    fireEvent.blur(weightInputs()[0], { target: { value: '110' } })
    await waitFor(() => {
      expect(readStoredRecords()[0].sets[0].weight).toBe(49.9)
    })
  })
})

describe('TrainingEntryPage - RM 欄の単位表示', () => {
  it('lbs設定ではRM欄が lbs 換算値で表示される', async () => {
    seedSettings({ weightUnit: 'lbs' })
    seedRecord([{ weight: 60, reps: 10 }])
    renderEntry()
    await waitFor(() => {
      expect(screen.getByText('176.4 lbs')).toBeInTheDocument()
    })
  })

  it('kg設定ではRM欄が kg のまま表示される', async () => {
    seedSettings({ weightUnit: 'kg' })
    seedRecord([{ weight: 60, reps: 10 }])
    renderEntry()
    await waitFor(() => {
      expect(screen.getByText('80 kg')).toBeInTheDocument()
    })
  })
})

describe('TrainingEntryPage - アクセシビリティ（メモ欄のラベル）', () => {
  it('1セット目のメモ欄が getByLabelText("1セット目のメモ") で取得できる', async () => {
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    expect(screen.getByLabelText('1セット目のメモ')).toBeInTheDocument()
  })

  it('3セット目のメモ欄が getByLabelText("3セット目のメモ") で取得できる', async () => {
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    expect(screen.getByLabelText('3セット目のメモ')).toBeInTheDocument()
  })

  it('先に重さ・回数を入力して記録ができたあと、getByLabelText で取得したメモ欄に入力すると保存される', async () => {
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    // メモ単独では記録を作らない仕様のため、先に重さ・回数を入力して記録を作っておく
    fireEvent.blur(weightInputs()[0], { target: { value: '60' } })
    fireEvent.blur(repsInputs()[0], { target: { value: '10' } })
    fireEvent.blur(screen.getByLabelText('1セット目のメモ'), { target: { value: '調子が良い' } })
    await waitFor(() => {
      expect(readStoredRecords()[0]?.sets[0]?.memo).toBe('調子が良い')
    })
  })
})

describe('TrainingEntryPage - 1RM 更新演出は role="status" 領域に描画される', () => {
  it('演出が出ていないときも role="status" の領域が常に存在する', async () => {
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('1RM 更新時、role="status" の領域内に「1RM 更新！」が入る', async () => {
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    fireEvent.blur(weightInputs()[0], { target: { value: '100' } })
    fireEvent.blur(repsInputs()[0], { target: { value: '10' } })
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('1RM 更新！')
    })
  })
})

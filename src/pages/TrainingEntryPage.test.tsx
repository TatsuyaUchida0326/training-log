import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { PageHeaderProvider } from '../contexts/PageHeaderContext'
import TrainingEntryPage from './TrainingEntryPage'

const EXERCISE_ID = 'ex-bench'
const DATE_STR = '2026-04-23'

function setupExercise() {
  localStorage.setItem(
    'strength-log-exercises',
    JSON.stringify([{ id: EXERCISE_ID, name: 'ベンチプレス', categoryId: '胸', isCustom: false }])
  )
}

function renderEntry(exerciseId = EXERCISE_ID, date = DATE_STR) {
  return render(
    <PageHeaderProvider>
      <MemoryRouter initialEntries={[`/date/${date}/exercises/${exerciseId}`]}>
        <Routes>
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

  it('「セット」「重さ」「回数」「RM」カラムヘッダーが表示される', () => {
    renderEntry()
    expect(screen.getByText('セット')).toBeInTheDocument()
    expect(screen.getByText('重さ')).toBeInTheDocument()
    expect(screen.getByText('回数')).toBeInTheDocument()
    expect(screen.getByText('RM')).toBeInTheDocument()
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

  it('戻るボタンが表示される', () => {
    renderEntry()
    expect(screen.getByText('戻る')).toBeInTheDocument()
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
    const weightInputs = screen.getAllByPlaceholderText('0').filter(
      (el) => (el as HTMLInputElement).inputMode === 'decimal'
    )
    const repsInputs = screen.getAllByPlaceholderText('0').filter(
      (el) => (el as HTMLInputElement).inputMode === 'numeric'
    )
    fireEvent.blur(weightInputs[0], { target: { value: '100' } })
    fireEvent.blur(repsInputs[0], { target: { value: '10' } })
    await waitFor(() => {
      expect(screen.getByText('133.3 kg')).toBeInTheDocument()
    })
  })
})

describe('TrainingEntryPage - 1RM トースト', () => {
  it('歴代最高を超えたとき「1RM 更新！」トーストが表示される', async () => {
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    const weightInputs = screen.getAllByPlaceholderText('0').filter(
      (el) => (el as HTMLInputElement).inputMode === 'decimal'
    )
    const repsInputs = screen.getAllByPlaceholderText('0').filter(
      (el) => (el as HTMLInputElement).inputMode === 'numeric'
    )
    fireEvent.blur(weightInputs[0], { target: { value: '100' } })
    fireEvent.blur(repsInputs[0], { target: { value: '10' } })
    await waitFor(() => {
      expect(screen.getByText('1RM 更新！')).toBeInTheDocument()
    })
  })

  it('同じRM値を入力してもトーストは表示されない（厳密 > 比較）', async () => {
    // 先に既存記録をセット（RM 133.3相当）
    localStorage.setItem(
      'strength-log-records',
      JSON.stringify([
        {
          id: 'rec-prev',
          date: '2026-04-01',
          exerciseId: EXERCISE_ID,
          sets: [{ id: 's1', weight: 100, reps: 10, memo: '' }],
        },
      ])
    )
    renderEntry()
    await waitFor(() => screen.getAllByLabelText('セット削除'))
    // 同じ 100kg × 10reps を入力 → RM = 133.3 = 133.3 → 更新にならない
    const weightInputs = screen.getAllByPlaceholderText('0').filter(
      (el) => (el as HTMLInputElement).inputMode === 'decimal'
    )
    const repsInputs = screen.getAllByPlaceholderText('0').filter(
      (el) => (el as HTMLInputElement).inputMode === 'numeric'
    )
    fireEvent.blur(weightInputs[0], { target: { value: '100' } })
    fireEvent.blur(repsInputs[0], { target: { value: '10' } })
    await waitFor(() => {
      expect(screen.queryByText('1RM 更新！')).not.toBeInTheDocument()
    })
  })
})

describe('TrainingEntryPage - Last Record 表示', () => {
  it('前回記録がある場合「Last Record」セクションが表示される', async () => {
    localStorage.setItem(
      'strength-log-records',
      JSON.stringify([
        {
          id: 'rec-prev',
          date: '2026-04-20',
          exerciseId: EXERCISE_ID,
          sets: [{ id: 's1', weight: 80, reps: 8, memo: '' }],
        },
      ])
    )
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

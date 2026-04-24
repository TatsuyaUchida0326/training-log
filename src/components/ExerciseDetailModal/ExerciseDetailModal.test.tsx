import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ExerciseDetailModal from './ExerciseDetailModal'
import type { WgerStatus, WgerExerciseData } from '../../hooks/useWgerExercise'

// ---------- useWgerExercise モック ----------

const mockFetch = vi.fn()
let mockStatus: WgerStatus = 'idle'
let mockData: WgerExerciseData | null = null

vi.mock('../../hooks/useWgerExercise', () => ({
  useWgerExercise: (_jaName: string) => ({
    status: mockStatus,
    data: mockData,
    fetch: mockFetch,
  }),
}))

// ---------- ヘルパー ----------

function renderModal(exerciseName = 'ベンチプレス', onClose = vi.fn()) {
  return render(
    <ExerciseDetailModal exerciseName={exerciseName} onClose={onClose} />
  )
}

// ---------- テスト本体 ----------

describe('ExerciseDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStatus = 'idle'
    mockData = null
  })

  // ---- 1. ローディング中に「読み込み中」テキストが表示される ----
  it('status="loading" のとき「読み込み中」テキストが表示される', () => {
    mockStatus = 'loading'

    renderModal()

    expect(screen.getByText(/読み込み中/)).toBeInTheDocument()
  })

  // ---- 2. 成功時に種目名が表示される ----
  it('status="ok" のとき種目名が表示される', () => {
    mockStatus = 'ok'
    mockData = {
      muscles: ['大胸筋'],
      musclesSecondary: ['上腕三頭筋'],
      descriptionJa: 'バーベルを使った胸のトレーニング。',
    }

    renderModal('ベンチプレス')

    expect(screen.getByText('ベンチプレス')).toBeInTheDocument()
  })

  // ---- 3. 成功時に筋肉名が表示される ----
  it('status="ok" のとき主動筋・補助筋の筋肉名が表示される', () => {
    mockStatus = 'ok'
    mockData = {
      muscles: ['大胸筋'],
      musclesSecondary: ['上腕三頭筋'],
      descriptionJa: 'バーベルを使った胸のトレーニング。',
    }

    renderModal()

    expect(screen.getByText(/大胸筋/)).toBeInTheDocument()
    expect(screen.getByText(/上腕三頭筋/)).toBeInTheDocument()
  })

  // ---- 4. 成功時に説明文が表示される ----
  it('status="ok" のとき説明文が表示される', () => {
    mockStatus = 'ok'
    mockData = {
      muscles: ['大胸筋'],
      musclesSecondary: ['上腕三頭筋'],
      descriptionJa: 'バーベルを使った胸のトレーニング。',
    }

    renderModal()

    expect(screen.getByText(/バーベルを使った胸のトレーニング/)).toBeInTheDocument()
  })

  // ---- 5. エラー時に「詳細情報を取得できませんでした」が表示される ----
  it('status="error" のとき「詳細情報を取得できませんでした」が表示される', () => {
    mockStatus = 'error'
    mockData = null

    renderModal()

    expect(screen.getByText(/詳細情報を取得できませんでした/)).toBeInTheDocument()
  })

  // ---- 6. 閉じるボタンをクリックすると onClose が呼ばれる ----
  it('閉じるボタンをクリックすると onClose が呼ばれる', async () => {
    mockStatus = 'ok'
    mockData = {
      muscles: [],
      musclesSecondary: [],
      descriptionJa: '説明文。',
    }
    const onClose = vi.fn()

    renderModal('ベンチプレス', onClose)

    // 「閉じる」または × など、role="button" で onClose を発火するボタンを探す
    const closeButton = screen.getByRole('button', { name: /閉じる|×|close/i })
    await userEvent.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // ---- 7. マウント時に fetch() が自動で呼ばれる ----
  it('マウント時に fetch() が自動で呼ばれる', () => {
    mockStatus = 'loading'

    renderModal()

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

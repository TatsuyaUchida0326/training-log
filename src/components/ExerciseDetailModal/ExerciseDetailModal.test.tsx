import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ExerciseDetailModal from './ExerciseDetailModal'
import type { WgerStatus, WgerExerciseData } from '../../hooks/useWgerExercise'
import type { Exercise } from '../../types'

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

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'default-0',
    name: 'ベンチプレス',
    categoryId: '胸',
    isCustom: false,
    ...overrides,
  }
}

function renderModal(exerciseOverrides: Partial<Exercise> = {}, onClose = vi.fn()) {
  return render(
    <ExerciseDetailModal exercise={makeExercise(exerciseOverrides)} onClose={onClose} />
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

    renderModal()

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

    renderModal({}, onClose)

    const closeButton = screen.getByRole('button', { name: /閉じる|×|close/i })
    await userEvent.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // ---- 7. マウント時に fetch() が自動で呼ばれる（デフォルト種目の場合）----
  it('デフォルト種目のとき、マウント時に fetch() が自動で呼ばれる', () => {
    mockStatus = 'loading'

    renderModal({ isCustom: false })

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  // ---- 8. カスタム種目で muscles が保存されている場合は API を呼ばずに表示 ----
  it('カスタム種目で muscles が保存されている場合は API を呼ばずに筋肉名が表示される', () => {
    // mockStatus は idle のまま、fetch は呼ばれないはず
    renderModal({
      isCustom: true,
      muscles: ['大胸筋'],
      musclesSecondary: ['三角筋前部'],
      description: 'カスタム種目の説明文。',
    })

    expect(mockFetch).not.toHaveBeenCalled()
    expect(screen.getByText(/大胸筋/)).toBeInTheDocument()
    expect(screen.getByText(/三角筋前部/)).toBeInTheDocument()
    expect(screen.getByText(/カスタム種目の説明文/)).toBeInTheDocument()
  })

  // ---- 9. カスタム種目でデータがない場合は案内メッセージが表示される ----
  it('カスタム種目でデータがない場合は「種目追加時に情報を入力すると表示されます」が表示される', () => {
    renderModal({ isCustom: true })

    expect(screen.getByText(/種目追加時に情報を入力すると表示されます/)).toBeInTheDocument()
  })

  // ---- D. デフォルト種目で thumbnailUrl がある場合 → <img> が表示される ----
  it('status="ok" かつ thumbnailUrl がある場合、<img> が表示される', () => {
    mockStatus = 'ok'
    mockData = {
      muscles: [],
      musclesSecondary: [],
      descriptionJa: '',
      thumbnailUrl: 'https://example.com/img.jpg',
    }

    renderModal({ isCustom: false })

    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg')
  })

  // ---- E. デフォルト種目で thumbnailUrl が空文字の場合 → <img> が表示されない ----
  it('status="ok" かつ thumbnailUrl が空文字の場合、<img> が表示されない', () => {
    mockStatus = 'ok'
    mockData = {
      muscles: [],
      musclesSecondary: [],
      descriptionJa: '',
      thumbnailUrl: '',
    }

    renderModal({ isCustom: false })

    expect(screen.queryByRole('img')).toBeNull()
  })

  // ---- F. デフォルト種目（isCustom: false）の場合 → 「フォーム動画を見る」リンクが表示される ----
  it('デフォルト種目のとき「フォーム動画を見る」リンクが表示され、YouTube へのリンクになっている', () => {
    mockStatus = 'ok'
    mockData = {
      muscles: [],
      musclesSecondary: [],
      descriptionJa: '',
      thumbnailUrl: '',
    }

    renderModal({ isCustom: false })

    const link = screen.getByText(/フォーム動画を見る/)
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', expect.stringContaining('youtube.com'))
    expect(link.closest('a')).toHaveAttribute('rel', expect.stringContaining('noopener noreferrer'))
  })

  // ---- G. カスタム種目（isCustom: true）の場合 → 「フォーム動画を見る」リンクが表示されない ----
  it('カスタム種目のとき「フォーム動画を見る」リンクが表示されない', () => {
    renderModal({ isCustom: true })

    expect(screen.queryByText(/フォーム動画を見る/)).toBeNull()
  })
})

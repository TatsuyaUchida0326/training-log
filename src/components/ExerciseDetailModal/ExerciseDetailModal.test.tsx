import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ExerciseDetailModal from './ExerciseDetailModal'
import type { ExerciseDetailStatus, ExerciseDetail } from '../../hooks/useExerciseDetail'
import type { Exercise } from '../../types'

const mockLoad = vi.fn()
let mockStatus: ExerciseDetailStatus = 'idle'
let mockData: ExerciseDetail | null = null

vi.mock('../../hooks/useExerciseDetail', () => ({
  useExerciseDetail: (_jaName: string) => ({
    status: mockStatus,
    data: mockData,
    load: mockLoad,
  }),
}))

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

describe('ExerciseDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStatus = 'idle'
    mockData = null
  })

  it('status="loading" のとき「読み込み中」テキストが表示される', () => {
    mockStatus = 'loading'

    renderModal()

    expect(screen.getByText(/読み込み中/)).toBeInTheDocument()
  })

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

  it('status="error" のとき「詳細情報を取得できませんでした」が表示される', () => {
    mockStatus = 'error'
    mockData = null

    renderModal()

    expect(screen.getByText(/詳細情報を取得できませんでした/)).toBeInTheDocument()
  })

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

  it('デフォルト種目のとき、マウント時に load() が自動で呼ばれる', () => {
    mockStatus = 'loading'

    renderModal({ isCustom: false })

    expect(mockLoad).toHaveBeenCalledTimes(1)
  })

  it('カスタム種目で muscles が保存されている場合は API を呼ばずに筋肉名が表示される', () => {
    renderModal({
      isCustom: true,
      muscles: ['大胸筋'],
      musclesSecondary: ['三角筋前部'],
      description: 'カスタム種目の説明文。',
    })

    expect(mockLoad).not.toHaveBeenCalled()
    expect(screen.getByText(/大胸筋/)).toBeInTheDocument()
    expect(screen.getByText(/三角筋前部/)).toBeInTheDocument()
    expect(screen.getByText(/カスタム種目の説明文/)).toBeInTheDocument()
  })

  it('カスタム種目でデータがない場合は「種目追加時に情報を入力すると表示されます」が表示される', () => {
    renderModal({ isCustom: true })

    expect(screen.getByText(/種目追加時に情報を入力すると表示されます/)).toBeInTheDocument()
  })

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

  it('カスタム種目のとき「フォーム動画を見る」リンクが表示され、YouTube 検索URLになっている', () => {
    renderModal({ isCustom: true, name: 'マイオリジナル種目' })

    const link = screen.getByText(/フォーム動画を見る/)
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', expect.stringContaining('youtube.com/results?search_query='))
  })
})

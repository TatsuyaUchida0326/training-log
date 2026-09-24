import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ExerciseAddPage from './ExerciseAddPage'
import { PageHeaderProvider } from '../../contexts/PageHeaderContext'
import { HeaderSpy } from '../../test/HeaderSpy'

const mockAddExercise = vi.fn()

vi.mock('../../hooks/useExercises', () => ({
  useExercises: () => ({
    exercises: [],
    getCategoryExercises: vi.fn(),
    addExercise: mockAddExercise,
    deleteExercise: vi.fn(),
  }),
}))

function renderPage() {
  return render(
    <PageHeaderProvider>
      <HeaderSpy />
      <MemoryRouter initialEntries={['/date/2026-04-16/exercises/add']}>
        <Routes>
          <Route path="/date/:dateStr/exercises/add" element={<ExerciseAddPage />} />
          <Route
            path="/date/:dateStr/exercises/select"
            element={<div data-testid="select-page" />}
          />
        </Routes>
      </MemoryRouter>
    </PageHeaderProvider>
  )
}

/** ヘッダー右に置かれた「登録」ボタン */
function registerButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: '登録' }) as HTMLButtonElement
}

/** 必須項目（部位・種目名）を埋める */
async function fillRequiredFields() {
  const inputs = screen.getAllByRole('textbox')
  await userEvent.type(inputs[0], '胸')
  await userEvent.type(inputs[1], 'テスト種目')
}

describe('ExerciseAddPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ヘッダータイトルが「種目を追加」になる', () => {
    renderPage()
    expect(screen.getByTestId('page-title')).toHaveTextContent('種目を追加')
  })

  it('ヘッダー左の「戻る」で種目選択画面へ遷移する', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: '戻る' }))
    expect(screen.getByTestId('select-page')).toBeInTheDocument()
  })

  it('「部位」ラベルが表示される', () => {
    renderPage()
    expect(screen.getByText('部位')).toBeInTheDocument()
  })

  it('「種目名」ラベルが表示される', () => {
    renderPage()
    expect(screen.getByText('種目名')).toBeInTheDocument()
  })

  it('部位のinputが表示される', () => {
    renderPage()
    const inputs = screen.getAllByRole('textbox')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
  })

  it('種目名のinputが表示される', () => {
    renderPage()
    const inputs = screen.getAllByRole('textbox')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
  })

  it('ヘッダー右に「登録」ボタンが表示される', () => {
    renderPage()
    expect(within(screen.getByTestId('page-header-right')).getByText('登録')).toBeInTheDocument()
  })

  it('未入力のあいだ「登録」ボタンは無効', () => {
    renderPage()
    expect(registerButton()).toBeDisabled()
  })

  it('部位だけの入力では「登録」ボタンは無効のまま', async () => {
    renderPage()
    await userEvent.type(screen.getAllByRole('textbox')[0], '胸')
    expect(registerButton()).toBeDisabled()
  })

  it('部位と種目名を入力すると「登録」ボタンが有効になる', async () => {
    renderPage()
    await fillRequiredFields()
    expect(registerButton()).toBeEnabled()
  })

  it('入力して登録するとaddExerciseが呼ばれる', async () => {
    renderPage()
    await fillRequiredFields()
    await userEvent.click(registerButton())
    expect(mockAddExercise).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'テスト種目',
        categoryId: '胸',
      })
    )
  })

  it('任意項目まで入力しても最新の値が登録される', async () => {
    renderPage()
    await fillRequiredFields()
    await userEvent.type(screen.getAllByRole('textbox')[2], '大胸筋')
    await userEvent.click(registerButton())
    expect(mockAddExercise).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'テスト種目',
        categoryId: '胸',
        muscles: ['大胸筋'],
      })
    )
  })

  it('登録後に選択画面に戻る', async () => {
    renderPage()
    await fillRequiredFields()
    await userEvent.click(registerButton())
    expect(screen.getByTestId('select-page')).toBeInTheDocument()
  })
})

describe('ExerciseAddPage - アクセシビリティ（ラベル関連付け）', () => {
  it('部位・種目名・対象筋肉・補助筋の入力欄が getByLabelText で取得できる', () => {
    renderPage()
    expect(screen.getByLabelText('部位')).toBeInTheDocument()
    expect(screen.getByLabelText('種目名')).toBeInTheDocument()
    expect(screen.getByLabelText('対象筋肉')).toBeInTheDocument()
    expect(screen.getByLabelText('補助筋')).toBeInTheDocument()
  })

  it('説明の textarea が getByLabelText で取得できる', () => {
    renderPage()
    const description = screen.getByLabelText('説明')
    expect(description).toBeInTheDocument()
    expect(description.tagName).toBe('TEXTAREA')
  })

  it('getByLabelText(部位) と getByLabelText(種目名) に入力すると「登録」が有効になる', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText('部位'), '胸')
    await userEvent.type(screen.getByLabelText('種目名'), 'テスト種目')
    expect(registerButton()).toBeEnabled()
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ExerciseAddPage from './ExerciseAddPage'

const mockAddExercise = vi.fn()

vi.mock('../hooks/useExercises', () => ({
  useExercises: () => ({
    exercises: [],
    getCategoryExercises: vi.fn(),
    addExercise: mockAddExercise,
    deleteExercise: vi.fn(),
  }),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/date/2026-04-16/exercises/add']}>
      <Routes>
        <Route path="/date/:dateStr/exercises/add" element={<ExerciseAddPage />} />
        <Route path="/date/:dateStr/exercises/select" element={<div data-testid="select-page" />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ExerciseAddPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('「種目を追加」タイトルが表示される', () => {
    renderPage()
    expect(screen.getByText('種目を追加')).toBeInTheDocument()
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

  it('「登録」ボタンが表示される', () => {
    renderPage()
    expect(screen.getByText('登録')).toBeInTheDocument()
  })

  it('入力して登録するとaddExerciseが呼ばれる', async () => {
    renderPage()
    const inputs = screen.getAllByRole('textbox')
    await userEvent.type(inputs[0], '胸')
    await userEvent.type(inputs[1], 'テスト種目')
    await userEvent.click(screen.getByText('登録'))
    expect(mockAddExercise).toHaveBeenCalledWith({
      name: 'テスト種目',
      categoryId: '胸',
    })
  })

  it('登録後に選択画面に戻る', async () => {
    renderPage()
    const inputs = screen.getAllByRole('textbox')
    await userEvent.type(inputs[0], '胸')
    await userEvent.type(inputs[1], 'テスト種目')
    await userEvent.click(screen.getByText('登録'))
    expect(screen.getByTestId('select-page')).toBeInTheDocument()
  })
})

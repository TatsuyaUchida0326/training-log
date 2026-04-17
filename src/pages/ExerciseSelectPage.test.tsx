import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ExerciseSelectPage from './ExerciseSelectPage'

const mockDeleteExercise = vi.fn()

vi.mock('../hooks/useExercises', () => ({
  useExercises: () => ({
    exercises: [
      { id: '1', name: 'ベンチプレス', categoryId: '胸', isCustom: false },
      { id: '2', name: 'ペックフライ', categoryId: '胸', isCustom: false },
      { id: '3', name: 'チェストプレス', categoryId: '胸', isCustom: false },
      { id: '4', name: 'インクラインベンチプレス', categoryId: '胸', isCustom: false },
      { id: '5', name: 'デッドリフト', categoryId: '背中', isCustom: false },
    ],
    getCategoryExercises: (cat: string) => [
      { id: '1', name: 'ベンチプレス', categoryId: '胸', isCustom: false },
      { id: '2', name: 'ペックフライ', categoryId: '胸', isCustom: false },
      { id: '3', name: 'チェストプレス', categoryId: '胸', isCustom: false },
      { id: '4', name: 'インクラインベンチプレス', categoryId: '胸', isCustom: false },
      { id: '5', name: 'デッドリフト', categoryId: '背中', isCustom: false },
    ].filter((e) => e.categoryId === cat),
    addExercise: vi.fn(),
    deleteExercise: mockDeleteExercise,
  }),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/date/2026-04-16/exercises/select']}>
      <Routes>
        <Route path="/date/:dateStr/exercises/select" element={<ExerciseSelectPage />} />
        <Route path="/date/:dateStr/exercises/add" element={<div data-testid="add-page" />} />
        <Route path="/date/:dateStr" element={<div data-testid="detail-page" />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ExerciseSelectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('「種目を選択」タイトルが表示される', () => {
    renderPage()
    expect(screen.getByText('種目を選択')).toBeInTheDocument()
  })

  it('「胸」カテゴリーヘッダーが表示される', () => {
    renderPage()
    expect(screen.getByText(/^胸/)).toBeInTheDocument()
  })

  it('「ベンチプレス」が表示される', () => {
    renderPage()
    expect(screen.getByText('ベンチプレス')).toBeInTheDocument()
  })

  it('胸カテゴリーに4件以上あるとき「すべて表示」が表示される', () => {
    renderPage()
    expect(screen.getByText('すべて表示')).toBeInTheDocument()
  })

  it('「すべて表示」クリック後に「閉じる」ボタンが表示される', async () => {
    renderPage()
    await userEvent.click(screen.getByText('すべて表示'))
    expect(screen.getByText('閉じる')).toBeInTheDocument()
  })

  it('「閉じる」クリックで「すべて表示」に戻る', async () => {
    renderPage()
    await userEvent.click(screen.getByText('すべて表示'))
    await userEvent.click(screen.getByText('閉じる'))
    expect(screen.getByText('すべて表示')).toBeInTheDocument()
  })

  it('「部位・種目を追加」ボタンが表示される', () => {
    renderPage()
    expect(screen.getByText('部位・種目を追加')).toBeInTheDocument()
  })

  it('「部位・種目を追加」クリックで追加画面に遷移する', async () => {
    renderPage()
    await userEvent.click(screen.getByText('部位・種目を追加'))
    expect(screen.getByTestId('add-page')).toBeInTheDocument()
  })

  it('「Edit」ボタンをクリックすると削除ボタンが表示される', async () => {
    renderPage()
    await userEvent.click(screen.getByText('Edit'))
    expect(screen.getAllByRole('button', { name: '削除' }).length).toBeGreaterThan(0)
  })

  it('編集モードで「End」ボタンが表示される', async () => {
    renderPage()
    await userEvent.click(screen.getByText('Edit'))
    expect(screen.getByText('End')).toBeInTheDocument()
  })

  it('削除ボタンをクリックすると deleteExercise が呼ばれる', async () => {
    renderPage()
    await userEvent.click(screen.getByText('Edit'))
    const deleteButtons = screen.getAllByRole('button', { name: '削除' })
    await userEvent.click(deleteButtons[0])
    expect(mockDeleteExercise).toHaveBeenCalledTimes(1)
  })
})

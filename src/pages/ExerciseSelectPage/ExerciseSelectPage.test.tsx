import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ExerciseSelectPage from './ExerciseSelectPage'
import { PageHeaderProvider, usePageHeader } from '../../contexts/PageHeaderContext'
import { seedRecords } from '../../test/seed'

function HeaderSpy() {
  const { header } = usePageHeader()
  return <div data-testid="page-title">{header.title}</div>
}

const mockDeleteExercise = vi.fn()

vi.mock('../../hooks/useExercises', () => ({
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
    <PageHeaderProvider>
      <HeaderSpy />
      <MemoryRouter initialEntries={['/date/2026-04-16/exercises/select']}>
        <Routes>
          <Route path="/date/:dateStr/exercises/select" element={<ExerciseSelectPage />} />
          <Route path="/date/:dateStr/exercises/add" element={<div data-testid="add-page" />} />
          <Route path="/date/:dateStr" element={<div data-testid="detail-page" />} />
        </Routes>
      </MemoryRouter>
    </PageHeaderProvider>
  )
}

describe('ExerciseSelectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('「メニュー画面」タイトルが表示される', () => {
    renderPage()
    expect(screen.getByTestId('page-title')).toHaveTextContent('メニュー画面')
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

  it('削除ボタンをクリックし確認ダイアログで承諾すると deleteExercise が呼ばれる', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()
    await userEvent.click(screen.getByText('Edit'))
    const deleteButtons = screen.getAllByRole('button', { name: '削除' })
    await userEvent.click(deleteButtons[0])
    expect(mockDeleteExercise).toHaveBeenCalledTimes(1)
    confirmSpy.mockRestore()
  })
})

/**
 * 種目の削除は取り消せないため、記録件数を示した確認ダイアログを挟む。
 * useTrainingRecords はモックせず、localStorage の記録をそのまま読ませる。
 */
describe('ExerciseSelectPage - 種目削除の確認ダイアログ', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>

  /** 1番目の種目（ベンチプレス）に、中身のある記録と空セットだけの記録を用意する */
  function seedRecordsForFirstExercise(filledCount: number, emptyCount = 0): void {
    const dayOf = (index: number) => String(index + 1).padStart(2, '0')
    const filledRecords = Array.from({ length: filledCount }, (_, index) => ({
      id: `rec-filled-${index}`,
      date: `2026-04-${dayOf(index)}`,
      exerciseId: '1',
      sets: [{ id: `set-${index}`, weight: 60, reps: 10, memo: '' }],
    }))
    const emptyRecords = Array.from({ length: emptyCount }, (_, index) => ({
      id: `rec-empty-${index}`,
      date: `2026-05-${dayOf(index)}`,
      exerciseId: '1',
      sets: [{ id: `empty-${index}`, weight: 0, reps: 0, memo: '' }],
    }))
    seedRecords([...filledRecords, ...emptyRecords])
  }

  async function renderAndClickFirstDelete(): Promise<void> {
    renderPage()
    await userEvent.click(screen.getByText('Edit'))
    await userEvent.click(screen.getAllByRole('button', { name: '削除' })[0])
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
  })

  afterEach(() => {
    confirmSpy.mockRestore()
  })

  it('編集モードで削除ボタンを押すと確認ダイアログが呼ばれる', async () => {
    seedRecordsForFirstExercise(2)
    await renderAndClickFirstDelete()
    expect(confirmSpy).toHaveBeenCalledTimes(1)
  })

  it('確認メッセージに削除対象の種目名が含まれる', async () => {
    seedRecordsForFirstExercise(2)
    await renderAndClickFirstDelete()
    expect(String(confirmSpy.mock.calls[0][0])).toContain('ベンチプレス')
  })

  it('確認メッセージにその種目の記録件数が含まれる', async () => {
    seedRecordsForFirstExercise(2)
    await renderAndClickFirstDelete()
    expect(String(confirmSpy.mock.calls[0][0])).toMatch(/2\s*件/)
  })

  it('確認ダイアログでキャンセルすると種目は削除されない', async () => {
    seedRecordsForFirstExercise(2)
    await renderAndClickFirstDelete()
    expect(mockDeleteExercise).not.toHaveBeenCalled()
  })

  it('確認ダイアログで承諾すると種目が削除される', async () => {
    confirmSpy.mockReturnValue(true)
    seedRecordsForFirstExercise(2)
    await renderAndClickFirstDelete()
    expect(mockDeleteExercise).toHaveBeenCalledWith('1')
  })

  it('記録が1件も無い種目でも確認ダイアログが出る', async () => {
    await renderAndClickFirstDelete()
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(mockDeleteExercise).not.toHaveBeenCalled()
  })

  it('空セットだけの記録は件数に数えない', async () => {
    seedRecordsForFirstExercise(2, 3)
    await renderAndClickFirstDelete()
    expect(String(confirmSpy.mock.calls[0][0])).toMatch(/2\s*件/)
  })
})

import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import DateDetailPage from './DateDetailPage'

function renderWithRoute(dateStr: string) {
  return render(
    <MemoryRouter initialEntries={[`/date/${dateStr}`]}>
      <Routes>
        <Route path="/date/:dateStr" element={<DateDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('DateDetailPage', () => {
  it('有効な dateStr で日本語の日付が表示される', () => {
    renderWithRoute('2026-04-16')
    expect(screen.getByText('2026年4月16日（木）')).toBeInTheDocument()
  })

  it('別の日付でも正しく日本語表示される', () => {
    renderWithRoute('2026-01-01')
    expect(screen.getByText('2026年1月1日（木）')).toBeInTheDocument()
  })

  it('空状態メッセージが表示される', () => {
    renderWithRoute('2026-04-16')
    expect(
      screen.getByText('種目を追加してトレーニングを記録しましょう')
    ).toBeInTheDocument()
  })

  it('無効な dateStr でフォールバックテキストが表示される', () => {
    renderWithRoute('invalid-date')
    expect(screen.getByText('日付が正しくありません')).toBeInTheDocument()
  })
})

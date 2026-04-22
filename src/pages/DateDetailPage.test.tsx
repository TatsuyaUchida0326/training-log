import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import DateDetailPage from './DateDetailPage'
import { PageHeaderProvider, usePageHeader } from '../contexts/PageHeaderContext'

function HeaderSpy() {
  const { header } = usePageHeader()
  return <div data-testid="page-title">{header.title}</div>
}

function renderWithRoute(dateStr: string) {
  return render(
    <PageHeaderProvider>
      <HeaderSpy />
      <MemoryRouter initialEntries={[`/date/${dateStr}`]}>
        <Routes>
          <Route path="/date/:dateStr" element={<DateDetailPage />} />
        </Routes>
      </MemoryRouter>
    </PageHeaderProvider>
  )
}

describe('DateDetailPage', () => {
  it('有効な dateStr で日本語の日付が表示される', () => {
    renderWithRoute('2026-04-16')
    expect(screen.getByTestId('page-title')).toHaveTextContent('2026年4月16日（木）')
  })

  it('別の日付でも正しく日本語表示される', () => {
    renderWithRoute('2026-01-01')
    expect(screen.getByTestId('page-title')).toHaveTextContent('2026年1月1日（木）')
  })

  it('空状態メッセージが表示される', () => {
    renderWithRoute('2026-04-16')
    expect(
      screen.getByText('右下の ＋ から種目を追加してトレーニングを記録しましょう')
    ).toBeInTheDocument()
  })

  it('無効な dateStr でフォールバックテキストが表示される', () => {
    renderWithRoute('invalid-date')
    expect(screen.getByText('日付が正しくありません')).toBeInTheDocument()
  })
})

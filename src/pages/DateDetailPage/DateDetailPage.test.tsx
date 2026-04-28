import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import DateDetailPage from './DateDetailPage'
import { PageHeaderProvider, usePageHeader } from '../../contexts/PageHeaderContext'

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
  it('ヘッダータイトルは「トレーニング記録画面」で固定される', () => {
    renderWithRoute('2026-04-16')
    expect(screen.getByTestId('page-title')).toHaveTextContent('トレーニング記録画面')
  })

  it('有効な dateStr で日本語の日付が body に表示される', () => {
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
      screen.getByText('右下の ＋ から種目を追加してトレーニングを記録しましょう')
    ).toBeInTheDocument()
  })

  it('無効な dateStr でフォールバックテキストが表示される', () => {
    renderWithRoute('invalid-date')
    expect(screen.getByText('日付が正しくありません')).toBeInTheDocument()
  })

  it('記録がある種目名が表示される', () => {
    const dateStr = '2026-04-23'
    localStorage.setItem(
      'strength-log-exercises',
      JSON.stringify([{ id: 'ex-bench', name: 'ベンチプレス', categoryId: '胸', isCustom: false }])
    )
    localStorage.setItem(
      'strength-log-records',
      JSON.stringify([
        {
          id: 'rec-1',
          date: dateStr,
          exerciseId: 'ex-bench',
          sets: [{ id: 's1', weight: 80, reps: 5, memo: '' }],
        },
      ])
    )
    renderWithRoute(dateStr)
    expect(screen.getByText('ベンチプレス')).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { PageHeaderProvider } from '../contexts/PageHeaderContext'
import HomePage from './HomePage'
import DateDetailPage from './DateDetailPage'
import HistoryPage from './HistoryPage'
import SettingsPage from './SettingsPage'

// Sidebar が必要とするタブ情報を持つラッパー
function AppRoutes({ initialPath }: { initialPath: string }) {
  return (
    <PageHeaderProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/date/:dateStr" element={<DateDetailPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    </PageHeaderProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('ルーティング', () => {
  it('/ → HomePageが表示される', () => {
    render(<AppRoutes initialPath="/" />)
    // ホームページはカレンダーを持つ
    expect(screen.getByText('日')).toBeInTheDocument()
  })

  it('/date/2026-04-23 → DateDetailPageが表示される', () => {
    render(<AppRoutes initialPath="/date/2026-04-23" />)
    expect(
      screen.getByText('右下の ＋ から種目を追加してトレーニングを記録しましょう')
    ).toBeInTheDocument()
  })

  it('/history → HistoryPageが表示される', () => {
    render(<AppRoutes initialPath="/history" />)
    expect(screen.getByRole('button', { name: 'カレンダー' })).toBeInTheDocument()
  })

  it('/settings → SettingsPageが表示される', () => {
    render(<AppRoutes initialPath="/settings" />)
    expect(screen.getByText('重量単位')).toBeInTheDocument()
  })
})

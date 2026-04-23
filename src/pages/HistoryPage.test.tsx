import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { PageHeaderProvider } from '../contexts/PageHeaderContext'
import HistoryPage from './HistoryPage'

beforeEach(() => {
  localStorage.clear()
})

function renderHistoryPage() {
  return render(
    <PageHeaderProvider>
      <MemoryRouter initialEntries={['/history']}>
        <Routes>
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/date/:dateStr" element={<div data-testid="detail-page" />} />
        </Routes>
      </MemoryRouter>
    </PageHeaderProvider>
  )
}

describe('HistoryPage - タブ表示', () => {
  it('「ALL」タブが表示される', () => {
    renderHistoryPage()
    // 部位タブのALL
    const allTabs = screen.getAllByText('ALL')
    expect(allTabs.length).toBeGreaterThanOrEqual(1)
  })

  it('「カレンダー」「グラフ」切り替えボタンが表示される', () => {
    renderHistoryPage()
    expect(screen.getByRole('button', { name: 'カレンダー' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'グラフ' })).toBeInTheDocument()
  })

  it('初期状態でカレンダービューが表示される', () => {
    renderHistoryPage()
    // カレンダーは曜日ヘッダーを持つ
    expect(screen.getByText('日')).toBeInTheDocument()
    expect(screen.getByText('月')).toBeInTheDocument()
  })
})

describe('HistoryPage - ビュー切り替え', () => {
  it('「グラフ」ボタンクリックでグラフビューに切り替わる', async () => {
    renderHistoryPage()
    await userEvent.click(screen.getByRole('button', { name: 'グラフ' }))
    // カレンダーが消える
    expect(screen.queryByText('日')).not.toBeInTheDocument()
  })

  it('「グラフ」ビューで記録がない場合「記録がありません」が表示される', async () => {
    renderHistoryPage()
    await userEvent.click(screen.getByRole('button', { name: 'グラフ' }))
    expect(screen.getByText('記録がありません')).toBeInTheDocument()
  })

  it('「カレンダー」ボタンでカレンダービューに戻る', async () => {
    renderHistoryPage()
    await userEvent.click(screen.getByRole('button', { name: 'グラフ' }))
    await userEvent.click(screen.getByRole('button', { name: 'カレンダー' }))
    expect(screen.getByText('日')).toBeInTheDocument()
  })
})

describe('HistoryPage - カテゴリタブ', () => {
  it('デフォルト9部位のタブが表示される', () => {
    renderHistoryPage()
    expect(screen.getByText('胸')).toBeInTheDocument()
    expect(screen.getByText('背中')).toBeInTheDocument()
    expect(screen.getByText('脚')).toBeInTheDocument()
  })

  it('部位タブをクリックすると選択状態になる', async () => {
    renderHistoryPage()
    const chestTab = screen.getByRole('button', { name: '胸' })
    await userEvent.click(chestTab)
    expect(chestTab.className).toContain('tabActive')
  })
})

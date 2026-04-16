import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import BottomNav from './BottomNav'
import type { BottomNavProps } from '../../types'

// react-router-dom の Link を使うため MemoryRouter でラップするヘルパー
function renderWithRouter(props: BottomNavProps) {
  return render(
    <MemoryRouter>
      <BottomNav {...props} />
    </MemoryRouter>
  )
}

describe('BottomNav', () => {
  // テスト1: 4つのタブが表示される
  it('ホーム・履歴・体組成・設定の4タブが表示される', () => {
    renderWithRouter({ activeTab: 'home' })

    expect(screen.getByText('ホーム')).toBeInTheDocument()
    expect(screen.getByText('履歴')).toBeInTheDocument()
    expect(screen.getByText('体組成')).toBeInTheDocument()
    expect(screen.getByText('設定')).toBeInTheDocument()
  })

  // テスト2: activeTab="home" のとき、ホームタブがアクティブスタイルを持つ
  it('activeTab="home" のとき、ホームタブが data-active="true" を持つ', () => {
    renderWithRouter({ activeTab: 'home' })

    const homeTab = screen.getByTestId('tab-home')
    const historyTab = screen.getByTestId('tab-history')
    const bodyTab = screen.getByTestId('tab-body')

    expect(homeTab).toHaveAttribute('data-active', 'true')
    expect(historyTab).toHaveAttribute('data-active', 'false')
    expect(bodyTab).toHaveAttribute('data-active', 'false')
  })

  // テスト3: activeTab="history" のとき、履歴タブがアクティブスタイルを持つ
  it('activeTab="history" のとき、履歴タブが data-active="true" を持つ', () => {
    renderWithRouter({ activeTab: 'history' })

    const homeTab = screen.getByTestId('tab-home')
    const historyTab = screen.getByTestId('tab-history')
    const bodyTab = screen.getByTestId('tab-body')

    expect(homeTab).toHaveAttribute('data-active', 'false')
    expect(historyTab).toHaveAttribute('data-active', 'true')
    expect(bodyTab).toHaveAttribute('data-active', 'false')
  })

  // テスト4: activeTab="body" のとき、体組成タブがアクティブスタイルを持つ
  it('activeTab="body" のとき、体組成タブが data-active="true" を持つ', () => {
    renderWithRouter({ activeTab: 'body' })

    const homeTab = screen.getByTestId('tab-home')
    const historyTab = screen.getByTestId('tab-history')
    const bodyTab = screen.getByTestId('tab-body')

    expect(homeTab).toHaveAttribute('data-active', 'false')
    expect(historyTab).toHaveAttribute('data-active', 'false')
    expect(bodyTab).toHaveAttribute('data-active', 'true')
  })

  // 補足テスト: 各タブが正しいリンク先を持つ
  it('ホームタブは "/" へのリンクを持つ', () => {
    renderWithRouter({ activeTab: 'home' })
    const homeTab = screen.getByTestId('tab-home')
    expect(homeTab.closest('a')).toHaveAttribute('href', '/')
  })

  it('履歴タブは "/history" へのリンクを持つ', () => {
    renderWithRouter({ activeTab: 'home' })
    const historyTab = screen.getByTestId('tab-history')
    expect(historyTab.closest('a')).toHaveAttribute('href', '/history')
  })

  it('体組成タブは "/body" へのリンクを持つ', () => {
    renderWithRouter({ activeTab: 'home' })
    const bodyTab = screen.getByTestId('tab-body')
    expect(bodyTab.closest('a')).toHaveAttribute('href', '/body')
  })

  it('設定タブは "/settings" へのリンクを持つ', () => {
    renderWithRouter({ activeTab: 'home' })
    const settingsTab = screen.getByTestId('tab-settings')
    expect(settingsTab.closest('a')).toHaveAttribute('href', '/settings')
  })

  it('activeTab="settings" のとき、設定タブが data-active="true" を持つ', () => {
    renderWithRouter({ activeTab: 'settings' })
    expect(screen.getByTestId('tab-settings')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('tab-home')).toHaveAttribute('data-active', 'false')
  })
})

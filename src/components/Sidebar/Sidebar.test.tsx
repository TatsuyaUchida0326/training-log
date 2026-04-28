import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import Sidebar from './Sidebar'
import type { SidebarProps } from '../../types'

function renderWithRouter(props: SidebarProps) {
  return render(
    <MemoryRouter>
      <Sidebar {...props} />
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  it('ホーム・履歴・体組成・設定の4タブが表示される', () => {
    renderWithRouter({ activeTab: 'home' })

    expect(screen.getByText('ホーム')).toBeInTheDocument()
    expect(screen.getByText('履歴')).toBeInTheDocument()
    expect(screen.getByText('体組成')).toBeInTheDocument()
    expect(screen.getByText('設定')).toBeInTheDocument()
  })

  it('"Strength Log" ロゴが表示される', () => {
    renderWithRouter({ activeTab: 'home' })
    expect(screen.getByText('Strength Log')).toBeInTheDocument()
  })

  it('activeTab="home" のとき、ホームタブが data-active="true" を持つ', () => {
    renderWithRouter({ activeTab: 'home' })

    expect(screen.getByTestId('tab-home')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('tab-history')).toHaveAttribute('data-active', 'false')
    expect(screen.getByTestId('tab-body')).toHaveAttribute('data-active', 'false')
    expect(screen.getByTestId('tab-settings')).toHaveAttribute('data-active', 'false')
  })

  it('activeTab="history" のとき、履歴タブが data-active="true" を持つ', () => {
    renderWithRouter({ activeTab: 'history' })

    expect(screen.getByTestId('tab-home')).toHaveAttribute('data-active', 'false')
    expect(screen.getByTestId('tab-history')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('tab-body')).toHaveAttribute('data-active', 'false')
  })

  it('activeTab="body" のとき、体組成タブが data-active="true" を持つ', () => {
    renderWithRouter({ activeTab: 'body' })

    expect(screen.getByTestId('tab-home')).toHaveAttribute('data-active', 'false')
    expect(screen.getByTestId('tab-history')).toHaveAttribute('data-active', 'false')
    expect(screen.getByTestId('tab-body')).toHaveAttribute('data-active', 'true')
  })

  it('activeTab="settings" のとき、設定タブが data-active="true" を持つ', () => {
    renderWithRouter({ activeTab: 'settings' })

    expect(screen.getByTestId('tab-settings')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('tab-home')).toHaveAttribute('data-active', 'false')
  })

  it('ホームタブは "/" へのリンクを持つ', () => {
    renderWithRouter({ activeTab: 'home' })
    expect(screen.getByTestId('tab-home').closest('a')).toHaveAttribute('href', '/')
  })

  it('履歴タブは "/history" へのリンクを持つ', () => {
    renderWithRouter({ activeTab: 'home' })
    expect(screen.getByTestId('tab-history').closest('a')).toHaveAttribute('href', '/history')
  })

  it('体組成タブは "/body" へのリンクを持つ', () => {
    renderWithRouter({ activeTab: 'home' })
    expect(screen.getByTestId('tab-body').closest('a')).toHaveAttribute('href', '/body')
  })

  it('設定タブは "/settings" へのリンクを持つ', () => {
    renderWithRouter({ activeTab: 'home' })
    expect(screen.getByTestId('tab-settings').closest('a')).toHaveAttribute('href', '/settings')
  })
})

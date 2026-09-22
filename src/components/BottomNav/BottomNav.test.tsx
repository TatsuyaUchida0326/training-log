import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import BottomNav from './BottomNav'
import type { TabName } from '../../types'

function renderWithRouter(activeTab: TabName) {
  return render(
    <MemoryRouter>
      <BottomNav activeTab={activeTab} />
    </MemoryRouter>
  )
}

describe('BottomNav - ラベル表示', () => {
  it('ホーム・履歴・体組成・設定の4タブが表示される', () => {
    renderWithRouter('home')

    expect(screen.getByText('ホーム')).toBeInTheDocument()
    expect(screen.getByText('履歴')).toBeInTheDocument()
    expect(screen.getByText('体組成')).toBeInTheDocument()
    expect(screen.getByText('設定')).toBeInTheDocument()
  })
})

describe('BottomNav - リンク先', () => {
  it('ホームタブは "/" へのリンクを持つ', () => {
    renderWithRouter('home')
    expect(screen.getByTestId('bottom-nav-home')).toHaveAttribute('href', '/')
  })

  it('履歴タブは "/history" へのリンクを持つ', () => {
    renderWithRouter('home')
    expect(screen.getByTestId('bottom-nav-history')).toHaveAttribute('href', '/history')
  })

  it('体組成タブは "/body" へのリンクを持つ', () => {
    renderWithRouter('home')
    expect(screen.getByTestId('bottom-nav-body')).toHaveAttribute('href', '/body')
  })

  it('設定タブは "/settings" へのリンクを持つ', () => {
    renderWithRouter('home')
    expect(screen.getByTestId('bottom-nav-settings')).toHaveAttribute('href', '/settings')
  })
})

describe('BottomNav - アクティブ表示', () => {
  it('activeTab のタブだけが aria-current="page" を持つ', () => {
    renderWithRouter('history')

    expect(screen.getByTestId('bottom-nav-history')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByTestId('bottom-nav-home')).not.toHaveAttribute('aria-current')
    expect(screen.getByTestId('bottom-nav-body')).not.toHaveAttribute('aria-current')
    expect(screen.getByTestId('bottom-nav-settings')).not.toHaveAttribute('aria-current')
  })

  it('activeTab="body" のとき体組成タブが aria-current="page" を持つ', () => {
    renderWithRouter('body')

    expect(screen.getByTestId('bottom-nav-body')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByTestId('bottom-nav-home')).not.toHaveAttribute('aria-current')
  })

  it('activeTab のタブは data-active="true"、それ以外は "false" になる', () => {
    renderWithRouter('settings')

    expect(screen.getByTestId('bottom-nav-settings')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('bottom-nav-home')).toHaveAttribute('data-active', 'false')
    expect(screen.getByTestId('bottom-nav-history')).toHaveAttribute('data-active', 'false')
    expect(screen.getByTestId('bottom-nav-body')).toHaveAttribute('data-active', 'false')
  })
})

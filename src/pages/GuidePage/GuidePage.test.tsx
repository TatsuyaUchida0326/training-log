import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import GuidePage from './GuidePage'
import { PageHeaderProvider } from '../../contexts/PageHeaderContext'
import { HeaderSpy } from '../../test/HeaderSpy'

const SECTION_TITLES = [
  'はじめに',
  'トレーニングを記録する',
  '継続力ゲージの仕組み',
  '1RM（推定値）とトロフィー',
  '履歴の見方',
  '体組成を記録する',
  '種目を追加する・消す',
  '設定でできること',
  'データについて（大切）',
]

function renderPage() {
  return render(
    <PageHeaderProvider>
      <HeaderSpy />
      <MemoryRouter initialEntries={['/settings/guide']}>
        <Routes>
          <Route path="/settings/guide" element={<GuidePage />} />
          <Route path="/settings" element={<div data-testid="settings-page" />} />
        </Routes>
      </MemoryRouter>
    </PageHeaderProvider>
  )
}

/** 見出しの文字列から、その見出しが属する開閉ブロックを取り出す */
function sectionOf(title: string): HTMLDetailsElement {
  const summary = screen.getByText(title)
  return summary.closest('details') as HTMLDetailsElement
}

describe('GuidePage', () => {
  it('ヘッダータイトルが「使い方」になる', () => {
    renderPage()
    expect(screen.getByTestId('page-title')).toHaveTextContent('使い方')
  })

  it('9つのセクション見出しがすべて表示される', () => {
    renderPage()
    SECTION_TITLES.forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument()
    })
  })

  it('開閉ブロックはセクションの数だけある', () => {
    const { container } = renderPage()
    expect(container.querySelectorAll('details')).toHaveLength(SECTION_TITLES.length)
  })

  it('見出しは summary 要素で、キーボードでも開ける', () => {
    renderPage()
    SECTION_TITLES.forEach((title) => {
      expect(screen.getByText(title).tagName).toBe('SUMMARY')
    })
  })

  it('「はじめに」は最初から開いている', () => {
    renderPage()
    expect(sectionOf('はじめに').open).toBe(true)
  })

  it('「はじめに」以外は最初は閉じている', () => {
    renderPage()
    SECTION_TITLES.filter((title) => title !== 'はじめに').forEach((title) => {
      expect(sectionOf(title).open).toBe(false)
    })
  })

  it('「継続力ゲージの仕組み」を開くとブロックが開く', async () => {
    renderPage()
    await userEvent.click(screen.getByText('継続力ゲージの仕組み'))
    expect(sectionOf('継続力ゲージの仕組み').open).toBe(true)
  })

  it('「継続力ゲージの仕組み」に +1 の条件（種目数・セット数）が書かれている', async () => {
    renderPage()
    await userEvent.click(screen.getByText('継続力ゲージの仕組み'))

    const section = sectionOf('継続力ゲージの仕組み')
    expect(section).toHaveTextContent('「継続達成セット数」以上こなした種目')
    expect(section).toHaveTextContent('「継続達成種目数」以上')
    expect(section).toHaveTextContent('「3セット以上やった種目が3つ以上ある日」が達成です。')
  })

  it('「継続力ゲージの仕組み」に10日でリセットされることが書かれている', async () => {
    renderPage()
    await userEvent.click(screen.getByText('継続力ゲージの仕組み'))

    const section = sectionOf('継続力ゲージの仕組み')
    expect(section).toHaveTextContent('達成した日から 10日 空くと 0 に戻ります。')
  })

  it('回数が0のセットは数えないことが書かれている', async () => {
    renderPage()
    await userEvent.click(screen.getByText('継続力ゲージの仕組み'))
    expect(screen.getByText('回数が 0 のセットは数えません（画面を開いただけ、では増えません）')).toBeInTheDocument()
  })

  it('ヘッダー左の「戻る」で設定画面へ戻る', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: '戻る' }))
    expect(screen.getByTestId('settings-page')).toBeInTheDocument()
  })

  it('インライン style を使っていない', () => {
    const { container } = renderPage()
    expect(container.querySelectorAll('[style]')).toHaveLength(0)
  })
})

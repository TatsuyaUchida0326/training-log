import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { PageHeaderProvider } from '../../contexts/PageHeaderContext'
import BodyPage from './BodyPage'
import { makeContest, seedContests } from '../../test/contests'

function renderBodyPage() {
  return render(
    <PageHeaderProvider>
      <BodyPage />
    </PageHeaderProvider>,
  )
}

function isBefore(first: HTMLElement, second: HTMLElement): boolean {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)
}

beforeEach(() => {
  localStorage.clear()
})

describe('BodyPage — 大会・イベントのカード', () => {
  it('見出し「大会・イベント」が出る', () => {
    renderBodyPage()
    expect(screen.getByText('大会・イベント')).toBeInTheDocument()
  })

  it('「基本情報」カードと「計測値」カードの間にある', () => {
    renderBodyPage()
    const basic = screen.getByText('基本情報')
    const contests = screen.getByText('大会・イベント')
    const measurements = screen.getByText('計測値')
    expect(isBefore(basic, contests)).toBe(true)
    expect(isBefore(contests, measurements)).toBe(true)
  })

  it('追加フォーム（名前・日付・ボタン）が出る', () => {
    renderBodyPage()
    expect(screen.getByLabelText('大会の名前')).toBeInTheDocument()
    expect(screen.getByLabelText('大会の日付')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '大会を追加' })).toBeInTheDocument()
  })

  it('保存済みの大会が行として出る', () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17')])
    renderBodyPage()
    expect(screen.getByLabelText('ボディコンテストの名前')).toHaveValue('ボディコンテスト')
  })

  it('大会カードを足しても、既存のカード（基本情報・計測値・計算値）は今まで通り出る', () => {
    renderBodyPage()
    expect(screen.getByText('基本情報')).toBeInTheDocument()
    expect(screen.getByText('計測値')).toBeInTheDocument()
    expect(screen.getByText('計算値')).toBeInTheDocument()
    expect(screen.getByLabelText('目標体重')).toBeInTheDocument()
  })
})

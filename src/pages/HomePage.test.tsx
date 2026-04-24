import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import HomePage from './HomePage'

beforeEach(() => {
  localStorage.clear()
})

function renderHomePage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/date/:dateStr" element={<div data-testid="detail-page" />} />
        <Route path="/date/:dateStr/exercises/:exerciseId" element={<div data-testid="entry-page" />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('HomePage', () => {
  it('カレンダーが表示される', () => {
    renderHomePage()
    expect(screen.getByText('日')).toBeInTheDocument()
  })

  it('日付をクリックすると DateDetailPage へ遷移する', async () => {
    renderHomePage()
    const dayCells = screen.getAllByText('1')
    await userEvent.click(dayCells[0])
    expect(screen.getByTestId('detail-page')).toBeInTheDocument()
  })

  it('記録がない場合は「まだ記録がありません」が表示される', () => {
    renderHomePage()
    expect(screen.getByText('まだ記録がありません')).toBeInTheDocument()
  })

  it('「今日のトレーニング」セクションが表示される', () => {
    renderHomePage()
    expect(screen.getByText('今日のトレーニング')).toBeInTheDocument()
  })

  it('体組成データがない場合 BodyTrendChart は表示されない', () => {
    renderHomePage()
    expect(screen.queryByTestId('weight-chart')).not.toBeInTheDocument()
    expect(screen.queryByTestId('bodyfat-chart')).not.toBeInTheDocument()
  })

  it('体重データがある場合 BodyTrendChart の体重グラフが表示される', () => {
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem(
      'strength-log-body-records',
      JSON.stringify([{ date: today, weight: 70, bodyFat: null, muscleMass: null, waist: null, memo: '' }])
    )
    renderHomePage()
    expect(screen.getByTestId('weight-chart')).toBeInTheDocument()
  })
})

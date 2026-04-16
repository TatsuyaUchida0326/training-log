import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import HomePage from './HomePage'

function renderHomePage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/date/:dateStr" element={<div data-testid="detail-page" />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('HomePage', () => {
  it('日付をクリックすると /date/YYYY-MM-DD に遷移する', async () => {
    renderHomePage()
    // 今月の "1" の日付セルをクリック
    const dayCells = screen.getAllByText('1')
    await userEvent.click(dayCells[0])
    expect(screen.getByTestId('detail-page')).toBeInTheDocument()
  })
})

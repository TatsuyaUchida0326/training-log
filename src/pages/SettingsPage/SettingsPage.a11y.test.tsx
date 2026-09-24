import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import SettingsPage from './SettingsPage'

/**
 * 重量単位 kg/lbs トグルの aria-pressed 挙動は、実際の状態遷移を検証したいため
 * ../../hooks/useSettings をモックしない実物のフックで描画する
 * （SettingsPage.test.tsx はファイル全体で useSettings をモックしているため、この検証だけ別ファイルに分ける）。
 */
function renderSettingsPage() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/guide" element={<div data-testid="guide-page" />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('SettingsPage — 重量単位トグルの aria-pressed', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('既定（kg）では kg ボタンが aria-pressed="true"、lbs ボタンが "false"', () => {
    renderSettingsPage()
    expect(screen.getByRole('button', { name: 'kg' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'lbs' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('lbs ボタンを押すと lbs が aria-pressed="true"、kg が "false" に入れ替わる', async () => {
    const user = userEvent.setup()
    renderSettingsPage()
    await user.click(screen.getByRole('button', { name: 'lbs' }))
    expect(screen.getByRole('button', { name: 'lbs' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'kg' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('lbs に切り替えたあと kg を押すと元に戻る', async () => {
    const user = userEvent.setup()
    renderSettingsPage()
    await user.click(screen.getByRole('button', { name: 'lbs' }))
    await user.click(screen.getByRole('button', { name: 'kg' }))
    expect(screen.getByRole('button', { name: 'kg' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'lbs' })).toHaveAttribute('aria-pressed', 'false')
  })
})

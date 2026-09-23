import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ErrorPage from './ErrorPage'

const mockRouteError = vi.fn<() => unknown>()

vi.mock('react-router-dom', () => ({
  useRouteError: () => mockRouteError(),
}))

describe('ErrorPage', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>
  let reloadMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.clear()
    mockRouteError.mockReturnValue(new Error('records is not iterable'))
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    reloadMock = vi.fn()
    // window.location は読み取り専用のため Object.defineProperty で上書きする
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('見出しが表示される', () => {
    render(<ErrorPage />)
    expect(screen.getByText('読み込めませんでした')).toBeInTheDocument()
  })

  it('2つの選択肢が表示される', () => {
    render(<ErrorPage />)
    expect(screen.getByRole('button', { name: 'アプリを再読み込み' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'データを初期化して再読み込み' })
    ).toBeInTheDocument()
  })

  it('「アプリを再読み込み」はデータを消さずにリロードする', async () => {
    localStorage.setItem('strength-log-records', '[]')
    render(<ErrorPage />)

    await userEvent.click(screen.getByRole('button', { name: 'アプリを再読み込み' }))

    expect(localStorage.getItem('strength-log-records')).toBe('[]')
    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it('「データを初期化して再読み込み」は確認のうえ全消去してリロードする', async () => {
    localStorage.setItem('strength-log-records', '[]')
    render(<ErrorPage />)

    await userEvent.click(screen.getByRole('button', { name: 'データを初期化して再読み込み' }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(localStorage.getItem('strength-log-records')).toBeNull()
    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it('確認をキャンセルするとデータは消えない', async () => {
    confirmSpy.mockReturnValue(false)
    localStorage.setItem('strength-log-records', '[]')
    render(<ErrorPage />)

    await userEvent.click(screen.getByRole('button', { name: 'データを初期化して再読み込み' }))

    expect(localStorage.getItem('strength-log-records')).toBe('[]')
    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('原因の手がかりを1行だけ出す', () => {
    render(<ErrorPage />)
    expect(screen.getByText('records is not iterable')).toBeInTheDocument()
  })

  it('原因が分からないときも表示が崩れない', () => {
    mockRouteError.mockReturnValue(undefined)
    render(<ErrorPage />)
    expect(screen.getByText('原因は特定できませんでした')).toBeInTheDocument()
  })
})

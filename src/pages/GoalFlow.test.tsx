import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { PageHeaderProvider } from '../contexts/PageHeaderContext'
import BodyPage from './BodyPage/BodyPage'
import HomePage from './HomePage/HomePage'
import { makeBodyRecord, seedBodyRecords, seedBodySettings } from '../test/seed'

/**
 * 「体組成画面で目標を決める → ホームの一番上に残りが出る」を、保存データを介してつなぐ。
 * 画面は別々にマウントし直す（実際の画面遷移と同じ。状態の受け渡しは localStorage だけ）。
 */

const GOAL_LIST = { name: '目標までの残り' }

beforeEach(() => {
  localStorage.clear()
})

function visitBodyPage() {
  return render(
    <PageHeaderProvider>
      <BodyPage />
    </PageHeaderProvider>,
  )
}

function visitHomePage() {
  return render(
    <PageHeaderProvider>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </PageHeaderProvider>,
  )
}

/** 体組成画面で入力欄に値を入れて blur し、画面を閉じる */
function enterOnBodyPage(label: string, value: string): void {
  const { unmount } = visitBodyPage()
  fireEvent.blur(screen.getByLabelText(label), { target: { value } })
  unmount()
}

describe('目標の設定からホーム表示まで', () => {
  it('目標体重を入れると、ホームに「あと 3.2 kg 減」が出る', () => {
    seedBodyRecords([makeBodyRecord('2020-01-01', { weight: 68.2 })])
    enterOnBodyPage('目標体重', '65')

    visitHomePage()
    expect(screen.getByRole('list', GOAL_LIST)).toHaveTextContent(/体重.*あと\s*3\.2\s*kg\s*減/)
  })

  it('目標を入れたあとに体重が増えても「減らす目標」のまま（あと 5.0 kg 減）', () => {
    seedBodyRecords([makeBodyRecord('2020-01-01', { weight: 68.2 })])
    enterOnBodyPage('目標体重', '65')
    enterOnBodyPage('体重', '70') // 今日の記録。最新の体重は 70

    visitHomePage()
    expect(screen.getByRole('list', GOAL_LIST)).toHaveTextContent(/あと\s*5\.0\s*kg\s*減/)
  })

  it('目標を入れたあとに目標を超えると「達成」になる', () => {
    seedBodyRecords([makeBodyRecord('2020-01-01', { weight: 68.2 })])
    enterOnBodyPage('目標体重', '65')
    enterOnBodyPage('体重', '64.5')

    visitHomePage()
    const list = screen.getByRole('list', GOAL_LIST)
    expect(list).toHaveTextContent('達成')
    expect(list).not.toHaveTextContent('あと')
  })

  it('増やす目標（筋肉量）は「あと ◯ kg 増」になる', () => {
    seedBodyRecords([makeBodyRecord('2020-01-01', { weight: 70, muscleMass: 36 })])
    seedBodySettings({ muscleMassUnit: 'kg' })
    enterOnBodyPage('目標筋肉量', '40')

    visitHomePage()
    expect(screen.getByRole('list', GOAL_LIST)).toHaveTextContent(/筋肉量.*あと\s*4\.0\s*kg\s*増/)
  })

  it('目標を空に戻すと、ホームから残りの表示が消える', () => {
    seedBodyRecords([makeBodyRecord('2020-01-01', { weight: 68.2 })])
    enterOnBodyPage('目標体重', '65')
    enterOnBodyPage('目標体重', '')

    visitHomePage()
    expect(screen.queryByRole('list', GOAL_LIST)).not.toBeInTheDocument()
  })

  it('一度も目標を入れなければ、体組成の記録があってもホームには出ない', () => {
    seedBodyRecords([makeBodyRecord('2020-01-01', { weight: 68.2, bodyFat: 20 })])
    enterOnBodyPage('身長', '170')

    visitHomePage()
    expect(screen.queryByRole('list', GOAL_LIST)).not.toBeInTheDocument()
  })

  it('目標を先に入れ、そのあと記録した人: 68.2 → ホームは「あと 3.2 kg 減」、64.5 を記録すると「達成」', () => {
    enterOnBodyPage('目標体重', '65') // 記録はまだ無い
    enterOnBodyPage('体重', '68.2')

    const first = visitHomePage()
    expect(screen.getByRole('list', GOAL_LIST)).toHaveTextContent(/あと\s*3\.2\s*kg\s*減/)
    first.unmount()

    enterOnBodyPage('体重', '64.5')

    visitHomePage()
    const list = screen.getByRole('list', GOAL_LIST)
    expect(list).toHaveTextContent('達成')
    expect(list).not.toHaveTextContent('あと')
  })

  it('目標を先に入れた人が、増えた体重を記録しても「減らす目標」のまま', () => {
    enterOnBodyPage('目標体重', '65')
    enterOnBodyPage('体重', '68.2')
    enterOnBodyPage('体重', '70')

    visitHomePage()
    expect(screen.getByRole('list', GOAL_LIST)).toHaveTextContent(/あと\s*5\.0\s*kg\s*減/)
  })
})

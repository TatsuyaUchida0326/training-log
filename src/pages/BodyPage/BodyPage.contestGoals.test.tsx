import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { PageHeaderProvider } from '../../contexts/PageHeaderContext'
import BodyPage from './BodyPage'
import { makeContest, readStoredContests, seedContests, withTargets } from '../../test/contests'
import { makeBodyRecord, readStoredBodySettings, seedBodyRecords, seedBodySettings } from '../../test/seed'

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

describe('BodyPage — 基本情報の「ふだんの目標」の見出し', () => {
  it('見出し「ふだんの目標」が1つだけ出る', () => {
    renderBodyPage()
    expect(screen.getByText('ふだんの目標')).toBeInTheDocument()
    expect(screen.getAllByText('ふだんの目標')).toHaveLength(1)
  })

  it('「基本情報」カードの中にあり、大会・イベントのカードには入らない', () => {
    renderBodyPage()
    const heading = screen.getByText('ふだんの目標')
    const basicCard = screen.getByText('基本情報').parentElement as HTMLElement
    const contestCard = screen.getByText('大会・イベント').parentElement as HTMLElement
    expect(basicCard).toContainElement(heading)
    expect(contestCard).not.toContainElement(heading)
  })

  it('身長の行と目標体重の行の間にある', () => {
    renderBodyPage()
    const heading = screen.getByText('ふだんの目標')
    expect(isBefore(screen.getByLabelText('身長'), heading)).toBe(true)
    expect(isBefore(heading, screen.getByLabelText('目標体重'))).toBe(true)
  })

  it('3つの目標の欄（目標体重・目標体脂肪率・目標筋肉量）は同じラベルのまま、見出しより後ろに並ぶ', () => {
    renderBodyPage()
    const heading = screen.getByText('ふだんの目標')
    const weight = screen.getByLabelText('目標体重')
    const bodyFat = screen.getByLabelText('目標体脂肪率')
    const muscle = screen.getByLabelText('目標筋肉量')
    expect(isBefore(heading, weight)).toBe(true)
    expect(isBefore(weight, bodyFat)).toBe(true)
    expect(isBefore(bodyFat, muscle)).toBe(true)
    expect(isBefore(muscle, screen.getByText('大会・イベント'))).toBe(true)
  })

  it('身長の欄は見出しの前のまま、ラベル「身長」で出る', () => {
    renderBodyPage()
    expect(screen.getByLabelText('身長')).toBeInTheDocument()
  })
})

describe('BodyPage — ふだんの目標の挙動は今までどおり', () => {
  it('目標体重を blur すると設定の targetWeight に保存され、baseline も入る', () => {
    seedBodyRecords([makeBodyRecord('2020-01-01', { weight: 68.2 })])
    renderBodyPage()
    fireEvent.blur(screen.getByLabelText('目標体重'), { target: { value: '65' } })
    const stored = readStoredBodySettings()
    expect(stored.targetWeight).toBe(65)
    expect(stored.goalBaselines).toEqual({ weight: 68.2 })
  })

  it('保存済みのふだんの目標が欄に入る', () => {
    seedBodySettings({ targetWeight: 65, targetBodyFat: 12, targetMuscleMassKg: 40 })
    renderBodyPage()
    expect(screen.getByLabelText('目標体重')).toHaveValue(65)
    expect(screen.getByLabelText('目標体脂肪率')).toHaveValue(12)
    expect(screen.getByLabelText('目標筋肉量')).toHaveValue(40)
  })

  it('目標体重を空にすると 0（未設定）で保存される', () => {
    seedBodySettings({ targetWeight: 65 })
    renderBodyPage()
    fireEvent.blur(screen.getByLabelText('目標体重'), { target: { value: '' } })
    expect(readStoredBodySettings().targetWeight).toBe(0)
  })
})

describe('BodyPage — 大会の目標とふだんの目標は別々', () => {
  it('大会に目標を入れても、ふだんの目標（設定）は変わらない', async () => {
    seedBodySettings({ targetWeight: 65 })
    seedContests([makeContest('ボディコンテスト', '2026-10-17', 'a')])
    renderBodyPage()
    await userEvent.click(screen.getByRole('button', { name: 'ボディコンテストの目標を入れる' }))
    fireEvent.blur(screen.getByLabelText('ボディコンテストの目標体重'), { target: { value: '60' } })

    expect(readStoredContests()[0].targets).toEqual({ weight: 60 })
    expect(readStoredBodySettings().targetWeight).toBe(65)
  })

  it('ふだんの目標を変えても、大会の目標は変わらない', () => {
    const saved = withTargets(makeContest('ボディコンテスト', '2026-10-17', 'a'), { weight: 60 }, { weight: '2026-10-01' })
    seedContests([saved])
    renderBodyPage()
    fireEvent.blur(screen.getByLabelText('目標体重'), { target: { value: '70' } })

    expect(readStoredBodySettings().targetWeight).toBe(70)
    expect(readStoredContests()).toEqual([saved])
  })

  it('大会の目標の欄が開いていても、「目標体重」で取れる欄はふだんの目標の1つだけ', () => {
    seedContests([withTargets(makeContest('ボディコンテスト', '2026-10-17', 'a'), { weight: 60 })])
    renderBodyPage()
    expect(screen.getByLabelText('目標体重')).toHaveValue(null) // ふだんの目標は未設定のまま
    expect(screen.getByLabelText('ボディコンテストの目標体重')).toHaveValue(60)
  })

  it('大会の目標の欄は「大会・イベント」のカードの中に出る', () => {
    seedContests([makeContest('ボディコンテスト', '2026-10-17', 'a')])
    renderBodyPage()
    const contestCard = screen.getByText('大会・イベント').parentElement as HTMLElement
    expect(contestCard).toContainElement(screen.getByRole('button', { name: 'ボディコンテストの目標を入れる' }))
  })
})

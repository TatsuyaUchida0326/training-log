import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PageHeaderProvider } from '../../contexts/PageHeaderContext'
import BodyPage from './BodyPage'
import { bodyInput, makeContest, readStoredContests, seedContests, withTargets } from '../../test/contests'
import { setupFixedClock } from '../../test/fixedClock'
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

// 目標を入れた日（起点の date）が実時間に依存するため、今日を 2026-10-05（月）に固定する
setupFixedClock(new Date(2026, 9, 5, 12))

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
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
    await userEvent.click(screen.getByRole('button', { name: 'この大会の目標を入れる（ボディコンテスト）' }))
    fireEvent.blur(screen.getByLabelText('ボディコンテストの目標体重'), { target: { value: '60' } })

    expect(readStoredContests()[0].targets).toEqual({ weight: 60 })
    expect(readStoredBodySettings().targetWeight).toBe(65)
  })

  it('ふだんの目標を変えても、大会の目標は変わらない', () => {
    const saved = withTargets(makeContest('ボディコンテスト', '2026-10-17', 'a'), { weight: 60 }, { weight: { date: '2026-10-01', value: 70 } })
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
    expect(contestCard).toContainElement(screen.getByRole('button', { name: 'この大会の目標を入れる（ボディコンテスト）' }))
  })
})

describe('BodyPage — 大会の目標の起点（targetOrigins）は、体組成の記録から決まる', () => {
  const OPEN = { name: 'この大会の目標を入れる（ボディコンテスト）' }

  async function setUpContestGoal(): Promise<void> {
    seedContests([makeContest('ボディコンテスト', '2026-10-17', 'a')])
    renderBodyPage()
    await userEvent.click(screen.getByRole('button', OPEN))
  }

  it('すでに記録があるとき、目標を入れると、最新の値が起点の value に入る', async () => {
    seedBodyRecords([makeBodyRecord('2026-10-03', { weight: 68.2 })])
    await setUpContestGoal()
    fireEvent.blur(screen.getByLabelText('ボディコンテストの目標体重'), { target: { value: '65' } })
    expect(readStoredContests()[0].targetOrigins).toEqual({ weight: { date: '2026-10-05', value: 68.2 } })
  })

  it('記録の単位が % のとき、体重 × 筋肉量% / 100 の kg が起点の value に入る', async () => {
    seedBodySettings({ muscleMassUnit: '%' })
    seedBodyRecords([makeBodyRecord('2026-10-03', { weight: 70, muscleMass: 40 })])
    await setUpContestGoal()
    fireEvent.blur(screen.getByLabelText('ボディコンテストの目標筋肉量'), { target: { value: '30' } })
    expect(readStoredContests()[0].targetOrigins?.muscleMass).toEqual({ date: '2026-10-05', value: 28 })
  })

  it('記録より先に目標を入れた場合、起点は { date } だけ', async () => {
    await setUpContestGoal()
    fireEvent.blur(screen.getByLabelText('ボディコンテストの目標体重'), { target: { value: '65' } })
    expect(readStoredContests()[0].targetOrigins).toEqual({ weight: { date: '2026-10-05' } })
  })

  it('そのあと体組成画面で値を記録すると、起点の value が埋まる（date は目標を入れた日のまま）', async () => {
    await setUpContestGoal()
    fireEvent.blur(screen.getByLabelText('ボディコンテストの目標体重'), { target: { value: '65' } })
    fireEvent.blur(bodyInput('体重'), { target: { value: '68.2' } })
    expect(readStoredContests()[0].targetOrigins).toEqual({ weight: { date: '2026-10-05', value: 68.2 } })
  })

  it('埋めたあとに体重を記録し直しても、起点の value は最初の記録のまま', async () => {
    await setUpContestGoal()
    fireEvent.blur(screen.getByLabelText('ボディコンテストの目標体重'), { target: { value: '65' } })
    fireEvent.blur(bodyInput('体重'), { target: { value: '68.2' } })
    fireEvent.blur(bodyInput('体重'), { target: { value: '67.9' } })
    expect(readStoredContests()[0].targetOrigins?.weight?.value).toBe(68.2)
  })

  it('値を埋めるのは、その項目に目標がある大会だけ（体脂肪率を記録しても体重だけの大会には起点が増えない）', async () => {
    await setUpContestGoal()
    fireEvent.blur(screen.getByLabelText('ボディコンテストの目標体重'), { target: { value: '65' } })
    fireEvent.blur(bodyInput('体脂肪'), { target: { value: '20' } })
    const origins = readStoredContests()[0].targetOrigins
    expect(Object.keys(origins ?? {})).toEqual(['weight'])
    expect(origins?.weight?.value).toBeUndefined()
  })

  it('ふだんの目標を変えても、大会の起点は変わらない', async () => {
    seedBodyRecords([makeBodyRecord('2026-10-03', { weight: 68.2 })])
    seedContests([
      withTargets(makeContest('ボディコンテスト', '2026-10-17', 'a'), { weight: 60 }, { weight: { date: '2026-10-01', value: 70 } }),
    ])
    renderBodyPage()
    fireEvent.blur(screen.getByLabelText('目標体重'), { target: { value: '65' } })
    expect(readStoredContests()[0].targetOrigins).toEqual({ weight: { date: '2026-10-01', value: 70 } })
  })

  it('過ぎた大会を体組成画面で削除すると、次の大会の起点が引き継がれる（再現2）', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    seedBodyRecords([
      makeBodyRecord('2026-09-01', { weight: 68 }),
      makeBodyRecord('2026-10-01', { weight: 62 }),
      makeBodyRecord('2026-10-05', { weight: 62.5 }),
    ])
    seedContests([
      withTargets(makeContest('秋の大会', '2026-10-01', 'autumn'), { weight: 62 }),
      withTargets(makeContest('冬の大会', '2026-12-01', 'winter'), { weight: 66 }, { weight: { date: '2026-09-01', value: 68 } }),
    ])
    renderBodyPage()
    await userEvent.click(screen.getByRole('button', { name: '秋の大会を削除' }))
    expect(readStoredContests().map((contest) => contest.id)).toEqual(['winter'])
    expect(readStoredContests()[0].targetOrigins).toEqual({ weight: { date: '2026-10-01', value: 62 } })
  })
})

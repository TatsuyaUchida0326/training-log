import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import BodyTrendChart from './BodyTrendChart'
import type { BodyRecord } from '../../types'

// recharts はテスト環境で SVG として描画される。
// グラフの存在確認は data-testid ラッパー要素で行い、
// SVG 内部のグラフ要素へのアサーションは行わない。

const RECORDS_WITH_DATA: BodyRecord[] = [
  { date: '2026-04-01', weight: 75, bodyFat: 20, muscleMass: null, waist: null, memo: '' },
  { date: '2026-04-10', weight: 74, bodyFat: 19, muscleMass: null, waist: null, memo: '' },
  { date: '2026-04-20', weight: 73, bodyFat: 18, muscleMass: null, waist: null, memo: '' },
]

const RECORDS_WEIGHT_ONLY: BodyRecord[] = [
  { date: '2026-04-01', weight: 75, bodyFat: null, muscleMass: null, waist: null, memo: '' },
]

const RECORDS_BODYFAT_ONLY: BodyRecord[] = [
  { date: '2026-04-01', weight: null, bodyFat: 20, muscleMass: null, waist: null, memo: '' },
]

const RECORDS_EMPTY: BodyRecord[] = []

describe('BodyTrendChart', () => {
  it('weight データがある場合、体重グラフセクションが表示される', () => {
    render(
      <BodyTrendChart
        records={RECORDS_WITH_DATA}
        targetWeight={0}
        targetBodyFat={0}
      />
    )
    expect(screen.getByTestId('weight-chart')).toBeInTheDocument()
  })

  it('bodyFat データがある場合、体脂肪率グラフセクションが表示される', () => {
    render(
      <BodyTrendChart
        records={RECORDS_WITH_DATA}
        targetWeight={0}
        targetBodyFat={0}
      />
    )
    expect(screen.getByTestId('bodyfat-chart')).toBeInTheDocument()
  })

  it('weight が全て null の場合、体重グラフが表示されない', () => {
    render(
      <BodyTrendChart
        records={RECORDS_BODYFAT_ONLY}
        targetWeight={0}
        targetBodyFat={0}
      />
    )
    expect(screen.queryByTestId('weight-chart')).not.toBeInTheDocument()
  })

  it('bodyFat が全て null の場合、体脂肪率グラフが表示されない', () => {
    render(
      <BodyTrendChart
        records={RECORDS_WEIGHT_ONLY}
        targetWeight={0}
        targetBodyFat={0}
      />
    )
    expect(screen.queryByTestId('bodyfat-chart')).not.toBeInTheDocument()
  })

  it('records が空の場合、体重グラフも体脂肪率グラフも表示されない', () => {
    const { container } = render(
      <BodyTrendChart
        records={RECORDS_EMPTY}
        targetWeight={0}
        targetBodyFat={0}
      />
    )
    expect(screen.queryByTestId('weight-chart')).not.toBeInTheDocument()
    expect(screen.queryByTestId('bodyfat-chart')).not.toBeInTheDocument()
    // コンテナ自体が存在しないか、中身が空であることを確認
    expect(container.firstChild).toBeNull()
  })

  it('targetWeight>0 の場合、「目標」ラベルが体重グラフ内に表示される', () => {
    render(
      <BodyTrendChart
        records={RECORDS_WITH_DATA}
        targetWeight={70}
        targetBodyFat={0}
      />
    )
    const weightChart = screen.getByTestId('weight-chart')
    expect(weightChart).toBeInTheDocument()
    // ReferenceLine の label が DOM に現れることを確認
    // within を使わずとも、体脂肪率グラフには targetBodyFat=0 で参照線なし、
    // かつ targetWeight>0 で体重グラフ側のみ「目標」が出るので screen でも取得可能。
    // ただし bodyFat グラフも存在するため、念のため体重グラフ内で確認する。
    expect(weightChart.textContent).toContain('目標')
  })

  it('targetBodyFat>0 の場合、「目標」ラベルが体脂肪率グラフ内に表示される', () => {
    render(
      <BodyTrendChart
        records={RECORDS_WITH_DATA}
        targetWeight={0}
        targetBodyFat={15}
      />
    )
    const bodyfatChart = screen.getByTestId('bodyfat-chart')
    expect(bodyfatChart).toBeInTheDocument()
    expect(bodyfatChart.textContent).toContain('目標')
  })

  it('targetWeight=0 の場合、「目標」ラベルが体重グラフ内に表示されない', () => {
    render(
      <BodyTrendChart
        records={RECORDS_WITH_DATA}
        targetWeight={0}
        targetBodyFat={0}
      />
    )
    const weightChart = screen.getByTestId('weight-chart')
    expect(weightChart.textContent).not.toContain('目標')
  })
})

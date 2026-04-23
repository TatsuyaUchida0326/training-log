import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ContinuityGauge from './ContinuityGauge'

describe('ContinuityGauge', () => {
  it('継続力ゲージのラベルが表示される', () => {
    render(<ContinuityGauge current={10} />)
    expect(screen.getByText('継続力ゲージ')).toBeInTheDocument()
  })

  it('現在値と最大値が表示される', () => {
    render(<ContinuityGauge current={30} />)
    expect(screen.getByText('30 / 90')).toBeInTheDocument()
  })

  it('hinttextが表示される（デフォルト設定）', () => {
    render(<ContinuityGauge current={10} />)
    expect(screen.getByText('3種目・3セット以上で+1 ／ 10日休むとリセット')).toBeInTheDocument()
  })

  it('requiredExercises=5, requiredSets=4 のヒントが反映される', () => {
    render(<ContinuityGauge current={5} requiredExercises={5} requiredSets={4} />)
    expect(screen.getByText('5種目・4セット以上で+1 ／ 10日休むとリセット')).toBeInTheDocument()
  })

  it('current=0 でもエラーなく表示される', () => {
    render(<ContinuityGauge current={0} />)
    expect(screen.getByText('継続力ゲージ')).toBeInTheDocument()
    expect(screen.getByText('0 / 90')).toBeInTheDocument()
  })

  it('current が 90 以上のとき「継続力MAX」ラベルが表示される', () => {
    render(<ContinuityGauge current={90} />)
    expect(screen.getByText('🔥 継続力MAX')).toBeInTheDocument()
  })

  it('MAXのときカウンターとヒントが非表示になる', () => {
    render(<ContinuityGauge current={90} />)
    expect(screen.queryByText('90 / 90')).not.toBeInTheDocument()
    expect(screen.queryByText(/種目・.*セット以上/)).not.toBeInTheDocument()
  })

  it('current=89 では「継続力MAX」ではなく通常ラベルが表示される', () => {
    render(<ContinuityGauge current={89} />)
    expect(screen.getByText('継続力ゲージ')).toBeInTheDocument()
    expect(screen.queryByText('🔥 継続力MAX')).not.toBeInTheDocument()
  })

  it('current > max でも 100% 以上にならない（スタイルで確認）', () => {
    render(<ContinuityGauge current={200} max={90} />)
    const fill = document.querySelector('.gauge-fill') as HTMLElement
    expect(fill.style.width).toBe('100%')
  })
})

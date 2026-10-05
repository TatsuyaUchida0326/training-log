import { render, screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import GoalCard from './GoalCard'
import type { GoalProgress } from '../../utils/goals'

const WEIGHT_DECREASE: GoalProgress = {
  metric: 'weight',
  current: 68.2,
  target: 65,
  remaining: 3.2,
  status: 'decrease',
}

const BODY_FAT_DECREASE: GoalProgress = {
  metric: 'bodyFat',
  current: 20,
  target: 15,
  remaining: 5,
  status: 'decrease',
}

const MUSCLE_INCREASE: GoalProgress = {
  metric: 'muscleMass',
  current: 38.5,
  target: 39.5,
  remaining: 1,
  status: 'increase',
}

function getRows(): HTMLElement[] {
  return within(screen.getByRole('list', { name: '目標までの残り' })).getAllByRole('listitem')
}

describe('GoalCard — 目標が無いとき', () => {
  it('goals が空なら何も描画しない', () => {
    const { container } = render(<GoalCard goals={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('goals が空ならリストも出ない', () => {
    render(<GoalCard goals={[]} />)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})

describe('GoalCard — className', () => {
  it('className を渡すと ul に付く（余白は呼び出し側が決める）', () => {
    render(<GoalCard goals={[WEIGHT_DECREASE]} className="spacing" />)
    expect(screen.getByRole('list', { name: '目標までの残り' })).toHaveClass('spacing')
  })

  it('className を渡さなくても描画できる', () => {
    render(<GoalCard goals={[WEIGHT_DECREASE]} />)
    expect(screen.getByRole('list', { name: '目標までの残り' })).toBeInTheDocument()
  })

  it('goals が空なら className があっても何も描画しない', () => {
    const { container } = render(<GoalCard goals={[]} className="spacing" />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('GoalCard — リスト構造', () => {
  it('role="list" を明示している（Safari は list-style: none でリストの役割を外すため）', () => {
    render(<GoalCard goals={[WEIGHT_DECREASE]} />)
    expect(screen.getByRole('list', { name: '目標までの残り' })).toHaveAttribute('role', 'list')
  })

  it('「目標までの残り」という名前のリストが出る', () => {
    render(<GoalCard goals={[WEIGHT_DECREASE]} />)
    expect(screen.getByRole('list', { name: '目標までの残り' })).toBeInTheDocument()
  })

  it('1項目につき1行（listitem）', () => {
    render(<GoalCard goals={[WEIGHT_DECREASE, BODY_FAT_DECREASE, MUSCLE_INCREASE]} />)
    expect(getRows()).toHaveLength(3)
  })

  it('1項目だけなら1行', () => {
    render(<GoalCard goals={[BODY_FAT_DECREASE]} />)
    expect(getRows()).toHaveLength(1)
  })

  it('渡した順に並ぶ', () => {
    render(<GoalCard goals={[WEIGHT_DECREASE, BODY_FAT_DECREASE, MUSCLE_INCREASE]} />)
    const rows = getRows()
    expect(rows[0]).toHaveTextContent('体重')
    expect(rows[1]).toHaveTextContent('体脂肪率')
    expect(rows[2]).toHaveTextContent('筋肉量')
  })
})

describe('GoalCard — 行の表示', () => {
  it('体重（減らす）: 項目名・現在 → 目標・あと ◯ kg 減', () => {
    render(<GoalCard goals={[WEIGHT_DECREASE]} />)
    const [row] = getRows()
    expect(row).toHaveTextContent('体重')
    expect(row).toHaveTextContent(/68\.2\s*→\s*目標\s*65\.0\s*kg/)
    expect(row).toHaveTextContent(/あと\s*3\.2\s*kg\s*減/)
  })

  it('筋肉量（増やす）: あと ◯ kg 増', () => {
    render(<GoalCard goals={[MUSCLE_INCREASE]} />)
    const [row] = getRows()
    expect(row).toHaveTextContent('筋肉量')
    expect(row).toHaveTextContent(/38\.5\s*→\s*目標\s*39\.5\s*kg/)
    expect(row).toHaveTextContent(/あと\s*1\.0\s*kg\s*増/)
  })

  it('体脂肪率: 現在 → 目標 の単位は %', () => {
    render(<GoalCard goals={[BODY_FAT_DECREASE]} />)
    const [row] = getRows()
    expect(row).toHaveTextContent('体脂肪率')
    expect(row).toHaveTextContent(/20\.0\s*→\s*目標\s*15\.0\s*%/)
    expect(row).not.toHaveTextContent('kg')
  })

  it('体脂肪率の残りは「あと 5.0 % 減」と % 付きで出る', () => {
    render(<GoalCard goals={[BODY_FAT_DECREASE]} />)
    expect(getRows()[0]).toHaveTextContent(/あと\s*5\.0\s*%\s*減/)
  })

  it('数値は常に小数1桁（整数の 70 → 70.0、残り 5 → 5.0）', () => {
    render(
      <GoalCard
        goals={[{ metric: 'weight', current: 70, target: 65, remaining: 5, status: 'decrease' }]}
      />,
    )
    const [row] = getRows()
    expect(row).toHaveTextContent(/70\.0\s*→\s*目標\s*65\.0\s*kg/)
    expect(row).toHaveTextContent(/あと\s*5\.0\s*kg\s*減/)
  })

  it('達成: 「達成」が出て「あと」は出ない', () => {
    render(
      <GoalCard
        goals={[{ metric: 'weight', current: 64.8, target: 65, remaining: 0, status: 'achieved' }]}
      />,
    )
    const [row] = getRows()
    expect(row).toHaveTextContent('達成')
    expect(row).not.toHaveTextContent('あと')
    expect(row).toHaveTextContent(/64\.8\s*→\s*目標\s*65\.0\s*kg/)
  })

  it('未達成の行には「達成」が出ない', () => {
    render(<GoalCard goals={[WEIGHT_DECREASE]} />)
    expect(getRows()[0]).not.toHaveTextContent('達成')
  })

  it('達成の行と未達成の行が混在しても、行ごとに表示が分かれる', () => {
    const achieved: GoalProgress = {
      metric: 'bodyFat',
      current: 14.9,
      target: 15,
      remaining: 0,
      status: 'achieved',
    }
    render(<GoalCard goals={[WEIGHT_DECREASE, achieved]} />)
    const rows = getRows()
    expect(rows[0]).toHaveTextContent(/あと\s*3\.2\s*kg\s*減/)
    expect(rows[0]).not.toHaveTextContent('達成')
    expect(rows[1]).toHaveTextContent('達成')
    expect(rows[1]).not.toHaveTextContent('あと')
  })
})

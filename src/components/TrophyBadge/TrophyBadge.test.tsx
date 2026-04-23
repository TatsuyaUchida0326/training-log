import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TrophyBadge from './TrophyBadge'
import type { TrophyRecord } from './TrophyBadge'

const TROPHIES: TrophyRecord[] = [
  { exerciseName: 'ベンチプレス', rm: 80, date: '2026-04-01' },
  { exerciseName: 'スクワット', rm: 100, date: '2026-04-10' },
]

describe('TrophyBadge', () => {
  it('「1RM更新」タイトルが表示される', () => {
    render(<TrophyBadge trophies={[]} />)
    expect(screen.getByText('1RM更新')).toBeInTheDocument()
  })

  it('trophies が空のとき空状態メッセージが表示される', () => {
    render(<TrophyBadge trophies={[]} />)
    expect(screen.getByText(/1RM更新で/)).toBeInTheDocument()
    expect(screen.getByText(/🏆 獲得！/)).toBeInTheDocument()
  })

  it('trophies があるとき種目名が表示される', () => {
    render(<TrophyBadge trophies={TROPHIES} />)
    expect(screen.getByText('ベンチプレス')).toBeInTheDocument()
    expect(screen.getByText('スクワット')).toBeInTheDocument()
  })

  it('trophies があるとき RM 値が表示される', () => {
    render(<TrophyBadge trophies={TROPHIES} />)
    expect(screen.getByText('80 kg')).toBeInTheDocument()
    expect(screen.getByText('100 kg')).toBeInTheDocument()
  })

  it('trophies があるとき日付が表示される', () => {
    render(<TrophyBadge trophies={TROPHIES} />)
    expect(screen.getByText('2026-04-01')).toBeInTheDocument()
    expect(screen.getByText('2026-04-10')).toBeInTheDocument()
  })

  it('trophies があるとき空状態メッセージが表示されない', () => {
    render(<TrophyBadge trophies={TROPHIES} />)
    expect(screen.queryByText(/1RM更新で/)).not.toBeInTheDocument()
  })

  it('複数のトロフィーがリストとして表示される', () => {
    render(<TrophyBadge trophies={TROPHIES} />)
    const items = screen.getAllByText('🏆')
    expect(items).toHaveLength(2)
  })
})

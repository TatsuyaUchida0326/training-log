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
    render(<TrophyBadge trophies={[]} unit="kg" />)
    expect(screen.getByText('1RM更新')).toBeInTheDocument()
  })

  it('trophies が空のとき空状態メッセージが表示される', () => {
    render(<TrophyBadge trophies={[]} unit="kg" />)
    expect(screen.getByText(/1RM更新で/)).toBeInTheDocument()
    expect(screen.getByText(/🏆 獲得！/)).toBeInTheDocument()
  })

  it('trophies があるとき種目名が表示される', () => {
    render(<TrophyBadge trophies={TROPHIES} unit="kg" />)
    expect(screen.getByText('ベンチプレス')).toBeInTheDocument()
    expect(screen.getByText('スクワット')).toBeInTheDocument()
  })

  it('trophies があるとき RM 値が表示される', () => {
    render(<TrophyBadge trophies={TROPHIES} unit="kg" />)
    expect(screen.getByText('80 kg')).toBeInTheDocument()
    expect(screen.getByText('100 kg')).toBeInTheDocument()
  })

  it('trophies があるとき日付が表示される', () => {
    render(<TrophyBadge trophies={TROPHIES} unit="kg" />)
    expect(screen.getByText('2026-04-01')).toBeInTheDocument()
    expect(screen.getByText('2026-04-10')).toBeInTheDocument()
  })

  it('trophies があるとき空状態メッセージが表示されない', () => {
    render(<TrophyBadge trophies={TROPHIES} unit="kg" />)
    expect(screen.queryByText(/1RM更新で/)).not.toBeInTheDocument()
  })

  it('複数のトロフィーがリストとして表示される', () => {
    render(<TrophyBadge trophies={TROPHIES} unit="kg" />)
    const items = screen.getAllByText('🏆')
    expect(items).toHaveLength(2)
  })
})

/** 重量単位の設定を props で受け取り、RM を換算して表示する */
describe('TrophyBadge - 重量単位', () => {
  it('lbs設定では RM 値が lbs に換算されて表示される', () => {
    render(<TrophyBadge trophies={TROPHIES} unit="lbs" />)
    expect(screen.getByText('176.4 lbs')).toBeInTheDocument()
    expect(screen.getByText('220.5 lbs')).toBeInTheDocument()
  })

  it('lbs設定では kg の数値が表示されない', () => {
    render(<TrophyBadge trophies={TROPHIES} unit="lbs" />)
    expect(screen.queryByText('80 kg')).not.toBeInTheDocument()
    expect(screen.queryByText('100 kg')).not.toBeInTheDocument()
  })

  it('RM が 0 の種目でも単位付きで表示が壊れない（境界値）', () => {
    render(<TrophyBadge trophies={[{ exerciseName: '懸垂', rm: 0, date: '2026-04-05' }]} unit="lbs" />)
    expect(screen.getByText('0 lbs')).toBeInTheDocument()
  })
})

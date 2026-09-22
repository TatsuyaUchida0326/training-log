import { afterEach, beforeEach, vi } from 'vitest'

/**
 * テスト中の「今日」を固定する。カレンダーの表示月や「今日」ボタンは実時間に依存するため。
 *
 * toFake を Date に絞るのは userEvent のタイマーとぶつけないため。
 */
export function setupFixedClock(date: Date): void {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(date)
  })

  afterEach(() => {
    vi.useRealTimers()
  })
}

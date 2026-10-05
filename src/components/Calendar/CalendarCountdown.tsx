import { Flag } from 'lucide-react'
import type { ContestCountdown } from '../../types'
import styles from './CalendarCountdown.module.css'

interface CalendarCountdownProps {
  countdown: ContestCountdown
}

/** 一番近い大会までの残り日数。当日は「今日は{名前}」、それ以外は「{名前}まで あと ◯ 日」 */
export default function CalendarCountdown({ countdown }: CalendarCountdownProps) {
  const { contest, daysLeft } = countdown
  return (
    <div data-testid="calendar-countdown" className={styles.countdown}>
      <Flag size={14} aria-hidden="true" className={styles.countdownIcon} />
      {daysLeft === 0 ? (
        <>
          <span className={styles.countdownPrefix}>今日は</span>
          <span className={styles.countdownName}>{contest.name}</span>
        </>
      ) : (
        <>
          <span className={styles.countdownName}>{contest.name}</span>
          <span className={styles.countdownSuffix}>
            まで あと <strong>{daysLeft}</strong> 日
          </span>
        </>
      )}
    </div>
  )
}

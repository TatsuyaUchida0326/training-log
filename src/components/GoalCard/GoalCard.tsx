import type { GoalMetric } from '../../types'
import type { GoalProgress } from '../../utils/goals'
import styles from './GoalCard.module.css'

interface GoalCardProps {
  goals: GoalProgress[]
}

const METRIC_LABELS: Record<GoalMetric, string> = {
  weight: '体重',
  bodyFat: '体脂肪率',
  muscleMass: '筋肉量',
}

const METRIC_UNITS: Record<GoalMetric, string> = {
  weight: 'kg',
  bodyFat: '%',
  muscleMass: 'kg',
}

const DIRECTION_LABELS = { decrease: '減', increase: '増' } as const

/** 数値は常に小数1桁（70 → 70.0）で、桁数を揃えて読みやすくする */
function formatValue(value: number): string {
  return value.toFixed(1)
}

/**
 * ホームの一番上に出す「目標までの残り」。目標が無ければ何も描画しない。
 * 1項目1行。ほかの行（大会のカウントダウンなど）を足すときは、同じリストに行を足す。
 */
export default function GoalCard({ goals }: GoalCardProps) {
  if (goals.length === 0) return null

  return (
    <ul className={styles.card} aria-label="目標までの残り">
      {goals.map((goal) => {
        const unit = METRIC_UNITS[goal.metric]
        return (
          <li key={goal.metric} className={styles.row}>
            <div className={styles.label}>
              <span className={styles.name}>{METRIC_LABELS[goal.metric]}</span>
              <span className={styles.detail}>
                {formatValue(goal.current)} → 目標 {formatValue(goal.target)} {unit}
              </span>
            </div>
            {goal.status === 'achieved' ? (
              <span className={styles.achieved}>達成</span>
            ) : (
              <span className={styles.remaining}>
                あと <span className={styles.remainingValue}>{formatValue(goal.remaining)}</span>{' '}
                {unit} {DIRECTION_LABELS[goal.status]}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

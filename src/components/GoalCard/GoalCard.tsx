import type { ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import type { ContestCountdown, GoalMetric } from '../../types'
import { formatDateWithWeekday } from '../../utils/date'
import type { GoalDirection, GoalProgress } from '../../utils/goals'
import styles from './GoalCard.module.css'

interface GoalCardProps {
  goals: GoalProgress[]
  countdowns?: ContestCountdown[] // これからの大会（近い順）。無ければ大会の欄は出ない
  className?: string // 余白など、置き場所に応じた見た目は呼び出し側が決める
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

const DIRECTION_LABELS: Record<GoalDirection, string> = { decrease: '減', increase: '増' }

/** 数値は常に小数1桁（70 → 70.0）で、桁数を揃えて読みやすくする */
function formatOneDecimal(value: number): string {
  return value.toFixed(1)
}

/** ホームに行として出す大会の数。それ以上は「ほか N 件」にまとめる */
const MAX_CONTEST_ROWS = 3

/** 今年の日付には年を付けない（「10月17日（土）」）。今年以外は年を前に付ける */
function formatContestDate(date: string): string {
  const parsed = parseISO(date)
  const text = formatDateWithWeekday(parsed)
  return parsed.getFullYear() === new Date().getFullYear() ? text : `${format(parsed, 'yyyy年')}${text}`
}

/** 大会と目標で共有する行。左に名前と補足、右に残りを出す */
function Row({
  name,
  nameClassName,
  detail,
  children,
}: {
  name: string
  nameClassName?: string
  detail: string
  children: ReactNode
}) {
  return (
    <li className={styles.row}>
      <div className={styles.label}>
        <span className={nameClassName ? `${styles.name} ${nameClassName}` : styles.name}>{name}</span>
        <span className={styles.detail}>{detail}</span>
      </div>
      {children}
    </li>
  )
}

/**
 * ホームの一番上に出す、大会と目標の残りのカード。どちらも無ければ何も描画しない。
 * 上に大会（近い順に上限の件数まで）、下に目標。どちらも同じ行の作りで、大会の先頭だけ数字を大きくする。
 */
export default function GoalCard({ goals, countdowns = [], className }: GoalCardProps) {
  if (goals.length === 0 && countdowns.length === 0) return null

  const shownCountdowns = countdowns.slice(0, MAX_CONTEST_ROWS)
  const hiddenCount = countdowns.length - shownCountdowns.length

  return (
    <div className={className ? `${styles.card} ${className}` : styles.card}>
      {shownCountdowns.length > 0 && (
        // role="list" を明示するのは、Safari が list-style: none のリストを「リスト」として読み上げなくなるため
        <ul role="list" aria-label="大会までの残り日数" className={styles.list}>
          {shownCountdowns.map(({ contest, daysLeft }, index) => {
            const valueClassName = index === 0 ? styles.leadValue : styles.remainingValue
            return (
              <Row
                key={contest.id}
                name={contest.name}
                nameClassName={styles.contestName}
                detail={formatContestDate(contest.date)}
              >
                <span className={styles.remaining}>
                  {daysLeft === 0 ? (
                    <span className={valueClassName}>今日</span>
                  ) : (
                    <>
                      あと{' '}
                      <span className={valueClassName}>{daysLeft}</span>{' '}
                      日
                    </>
                  )}
                </span>
              </Row>
            )
          })}
        </ul>
      )}
      {hiddenCount > 0 && (
        <Link to="/body" className={styles.moreContestsLink}>
          ほか {hiddenCount} 件
        </Link>
      )}
      {goals.length > 0 && (
        <ul role="list" aria-label="目標までの残り" className={styles.list}>
          {goals.map((goal) => {
            const unit = METRIC_UNITS[goal.metric]
            return (
              <Row
                key={goal.metric}
                name={METRIC_LABELS[goal.metric]}
                detail={`${formatOneDecimal(goal.current)} → 目標 ${formatOneDecimal(goal.target)} ${unit}`}
              >
                {goal.status === 'achieved' ? (
                  <span className={styles.achieved}>達成</span>
                ) : (
                  <span className={styles.remaining}>
                    あと <span className={styles.remainingValue}>{formatOneDecimal(goal.remaining)}</span>{' '}
                    {unit} {DIRECTION_LABELS[goal.status]}
                  </span>
                )}
              </Row>
            )
          })}
        </ul>
      )}
    </div>
  )
}

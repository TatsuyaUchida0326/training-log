import type { ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import type { ContestCountdown } from '../../types'
import { formatDateWithWeekday } from '../../utils/date'
import { METRIC_LABELS, METRIC_UNITS } from '../../utils/goalMetrics'
import type { GoalDirection, GoalProgress } from '../../utils/goals'
import styles from './GoalCard.module.css'

interface GoalCardProps {
  goals: GoalProgress[]
  countdowns?: ContestCountdown[] // これからの大会（近い順）。無ければ大会の欄は出ない
  className?: string // 余白など、置き場所に応じた見た目は呼び出し側が決める
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

/**
 * 大会と目標で共有する行。左に名前と補足、右に残りを出す。
 * 入れ子が無い行は、名前と残りを行（li）の直下に並べる。
 * nested を渡すと（その大会の目標を大会の行の下に置くため）、1行目の名前と残りだけを div で囲み、その下に入れ子を置く。
 */
function Row({
  name,
  nameClassName,
  detail,
  nested,
  children,
}: {
  name: string
  nameClassName?: string
  detail: string
  nested?: ReactNode
  children: ReactNode
}) {
  const line = (
    <>
      <div className={styles.label}>
        <span className={nameClassName ? `${styles.name} ${nameClassName}` : styles.name}>{name}</span>
        <span className={styles.detail}>{detail}</span>
      </div>
      {children}
    </>
  )
  if (!nested) return <li className={styles.row}>{line}</li>
  return (
    <li className={`${styles.row} ${styles.rowWithNested}`}>
      <div className={styles.rowLine}>{line}</div>
      {nested}
    </li>
  )
}

/** 目標の行。独立したリストでも、大会の行の入れ子でも同じ文言・同じ並びで出す */
function GoalRows({ goals }: { goals: GoalProgress[] }) {
  return (
    <>
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
    </>
  )
}

/**
 * ホームの一番上に出す、大会と目標の残りのカード。どちらも無ければ何も描画しない。
 * 上に大会（近い順に上限の件数まで）、下に目標。どちらも同じ行の作りで、大会の先頭だけ数字を大きくする。
 * 目標に大会の目標が1つでもあるときは、独立したリストにせず、一番近い大会の行の中に入れ子で出す
 * （その大会の目標だと分かるように。大会の目標が無い項目＝ふだんの目標も同じ入れ子に並べる）。
 */
export default function GoalCard({ goals, countdowns = [], className }: GoalCardProps) {
  if (goals.length === 0 && countdowns.length === 0) return null

  const shownCountdowns = countdowns.slice(0, MAX_CONTEST_ROWS)
  const hiddenCount = countdowns.length - shownCountdowns.length
  // 目標が大会の目標のとき、その大会の行（contestId が一致する行）の中に入れ子で出す。位置（先頭）では決めない。
  // 一致する行が表示されていなければ、独立したリストにする
  const goalContestId = goals.find((goal) => goal.contestId !== undefined)?.contestId
  const shouldNestGoals = shownCountdowns.some(({ contest }) => contest.id === goalContestId)

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
                nested={
                  shouldNestGoals && contest.id === goalContestId ? (
                    <ul role="list" aria-label={`${contest.name}の目標までの残り`} className={styles.nestedList}>
                      <GoalRows goals={goals} />
                    </ul>
                  ) : undefined
                }
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
      {goals.length > 0 && !shouldNestGoals && (
        <ul role="list" aria-label="目標までの残り" className={styles.list}>
          <GoalRows goals={goals} />
        </ul>
      )}
    </div>
  )
}

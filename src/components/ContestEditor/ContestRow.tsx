import { useState } from 'react'
import { X } from 'lucide-react'
import type { Contest, GoalMetric } from '../../types'
import {
  MAX_CONTEST_DATE,
  MAX_CONTEST_NAME_LENGTH,
  MIN_CONTEST_DATE,
  hasContestTargets,
  isValidContestDate,
  isValidContestName,
} from '../../utils/contests'
import { GOAL_METRICS, METRIC_LABELS, METRIC_UNITS } from '../../utils/goalMetrics'
import { parsePositiveNumber } from '../../utils/number'
import styles from './ContestEditor.module.css'

interface ContestRowProps {
  contest: Contest
  isEnded: boolean // 日付が過ぎている
  onUpdate: (changes: Partial<Pick<Contest, 'name' | 'date'>>) => void
  onTargetChange: (metric: GoalMetric, target: number) => void // 0 は「目標を消す」
  onRemove: () => void
  onDateFocus: () => void
  onDateBlur: () => void
}

/** 登録済みの大会1件。名前は blur で、日付は有効な日付になった時点で保存する */
export default function ContestRow({
  contest,
  isEnded,
  onUpdate,
  onTargetChange,
  onRemove,
  onDateFocus,
  onDateBlur,
}: ContestRowProps) {
  // 日付欄は打っている途中の値（年が 0002 など）も表示するので、入力中の値を保存済みの日付とは別に持つ
  const [dateText, setDateText] = useState(contest.date)
  // 目標の欄は、目標が1つでもあれば最初から開く。無い大会はボタンで開く（開いたあと全部消しても、触っている欄は閉じない）
  const [isTargetsOpen, setIsTargetsOpen] = useState(() => hasContestTargets(contest))
  const hasTargets = hasContestTargets(contest)

  // 値が変わったときだけ保存する。同じ値で blur し直すと、目標を入れた日（向きの起点）が今日に変わってしまうため
  function handleTargetBlur(metric: GoalMetric, input: HTMLInputElement) {
    const target = parsePositiveNumber(input.value)
    // 保存した値に表示をそろえる（0 や数値でない入力は空に戻す）
    input.value = target > 0 ? String(target) : ''
    if (target === (contest.targets?.[metric] ?? 0)) return
    onTargetChange(metric, target)
  }

  return (
    <li className={styles.row}>
      <input
        className={`${styles.input} ${styles.nameInput}`}
        type="text"
        maxLength={MAX_CONTEST_NAME_LENGTH}
        aria-label={`${contest.name}の名前`}
        defaultValue={contest.name}
        onBlur={(event) => {
          const trimmed = event.currentTarget.value.trim()
          const isValid = isValidContestName(trimmed)
          // 空にされたら元の名前に戻す
          event.currentTarget.value = isValid ? trimmed : contest.name
          if (isValid) onUpdate({ name: trimmed })
        }}
      />
      <div className={styles.rowMeta}>
        {/* blur を待たずに保存するのは、スマホのピッカーで選んですぐアプリを閉じても残すため */}
        <input
          className={`${styles.input} ${styles.dateInput}`}
          type="date"
          min={MIN_CONTEST_DATE}
          max={MAX_CONTEST_DATE}
          aria-label={`${contest.name}の日付`}
          value={dateText}
          onFocus={onDateFocus}
          onChange={(event) => {
            setDateText(event.target.value)
            if (isValidContestDate(event.target.value)) onUpdate({ date: event.target.value })
          }}
          onBlur={() => {
            // 途中の値や空のまま離れたら、保存してある日付に戻す
            if (!isValidContestDate(dateText)) setDateText(contest.date)
            onDateBlur()
          }}
        />
        {isEnded && <span className={styles.ended}>終了</span>}
        <button
          type="button"
          className={styles.removeButton}
          aria-label={`${contest.name}を削除`}
          onClick={onRemove}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      {!hasTargets && (
        <button
          type="button"
          className={styles.targetsToggle}
          aria-label={`${contest.name}の目標を入れる`}
          aria-expanded={isTargetsOpen}
          onClick={() => setIsTargetsOpen((open) => !open)}
        >
          この大会の目標を入れる
        </button>
      )}
      {(hasTargets || isTargetsOpen) && (
        <div role="group" aria-label={`${contest.name}の目標`} className={styles.targets}>
          <p className={styles.targetsHeading}>この大会の目標（入れなくてもよい）</p>
          <div className={styles.targetsGrid}>
            {GOAL_METRICS.map((metric) => (
              <div key={metric} className={styles.targetField}>
                <span className={styles.targetLabel} aria-hidden="true">{METRIC_LABELS[metric]}</span>
                <div className={styles.targetInputRow}>
                  <input
                    className={`${styles.input} ${styles.targetInput}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    aria-label={`${contest.name}の目標${METRIC_LABELS[metric]}`}
                    defaultValue={contest.targets?.[metric] ?? ''}
                    onBlur={(event) => handleTargetBlur(metric, event.currentTarget)}
                  />
                  <span className={styles.targetUnit}>{METRIC_UNITS[metric]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </li>
  )
}

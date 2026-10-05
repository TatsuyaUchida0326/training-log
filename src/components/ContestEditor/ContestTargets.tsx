import { useEffect, useId, useRef, useState } from 'react'
import type { Contest, GoalMetric } from '../../types'
import { hasContestTargets } from '../../utils/contests'
import { GOAL_METRICS, METRIC_LABELS, METRIC_UNITS } from '../../utils/goalMetrics'
import { parsePositiveNumber } from '../../utils/number'
import styles from './ContestEditor.module.css'

interface ContestTargetsProps {
  contest: Contest
  onTargetChange: (metric: GoalMetric, target: number) => void // 0 は「目標を消す」
}

/**
 * 大会ごとの目標の欄。目標が1つでもあれば最初から開き、無い大会はボタンで開く。
 * ボタンは目標が1つも無く欄が閉じているときだけ出す。開いたあとは、全部の項目を空にしても欄は開いたまま。
 * 名前・日付・削除の行の下の段に出す（幅によらず、削除ボタンの位置を行ごとにずらさないため）。
 */
export default function ContestTargets({ contest, onTargetChange }: ContestTargetsProps) {
  const [isOpen, setIsOpen] = useState(() => hasContestTargets(contest))
  const idPrefix = useId()
  const firstInputRef = useRef<HTMLInputElement>(null)
  // ボタンで開いたときだけ、先頭の欄へフォーカスを移す（最初から開いているときは動かさない）
  const shouldFocusFirstInput = useRef(false)

  // ボタンは押すと消える。消えるとフォーカスが body に落ちるので、描画後に先頭の欄へ移す
  useEffect(() => {
    if (isOpen && shouldFocusFirstInput.current) {
      firstInputRef.current?.focus()
      shouldFocusFirstInput.current = false
    }
  }, [isOpen])

  // 値が変わったときだけ保存する。同じ値で blur し直すと、起点（目標を入れた・変えた日と値）が上書きされてしまうため
  function handleBlur(metric: GoalMetric, input: HTMLInputElement) {
    const target = parsePositiveNumber(input.value)
    // 保存する値に表示をそろえる（0・負数・数値でない入力は空に戻す）
    input.value = target > 0 ? String(target) : ''
    if (target === (contest.targets?.[metric] ?? 0)) return
    onTargetChange(metric, target)
  }

  if (!isOpen && !hasContestTargets(contest)) {
    return (
      <div className={styles.below}>
        <button
          type="button"
          className={styles.targetsToggle}
          onClick={() => {
            shouldFocusFirstInput.current = true
            setIsOpen(true)
          }}
        >
          この大会の目標を入れる
          {/* 見える文字を読み上げ名の先頭に含めたまま、どの大会かを足す */}
          <span className={styles.visuallyHidden}>（{contest.name}）</span>
        </button>
      </div>
    )
  }

  return (
    <div className={styles.below}>
      <div role="group" aria-label={`${contest.name}の目標`}>
        <p className={styles.targetsHeading}>この大会の目標（入れなくてもよい）</p>
        <div className={styles.targetsGrid}>
          {GOAL_METRICS.map((metric) => {
            const inputId = `${idPrefix}-${metric}`
            return (
              <div key={metric} className={styles.targetField}>
                <label className={styles.targetLabel} htmlFor={inputId}>
                  {METRIC_LABELS[metric]}
                </label>
                <div className={styles.targetInputRow}>
                  <input
                    id={inputId}
                    ref={metric === GOAL_METRICS[0] ? firstInputRef : undefined}
                    className={`${styles.input} ${styles.targetInput}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    aria-label={`${contest.name}の目標${METRIC_LABELS[metric]}`}
                    defaultValue={contest.targets?.[metric] ?? ''}
                    onBlur={(event) => handleBlur(metric, event.currentTarget)}
                  />
                  <span className={styles.targetUnit}>{METRIC_UNITS[metric]}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

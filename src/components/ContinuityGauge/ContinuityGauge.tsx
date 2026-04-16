import './ContinuityGauge.css'

interface ContinuityGaugeProps {
  current: number
  max?: number
  requiredExercises?: number  // 達成に必要な種目数（デフォルト3・設定で変更可）
  requiredSets?: number       // 達成に必要なセット数（デフォルト3・設定で変更可）
  resetDays?: number          // 休止でリセットされる日数（デフォルト10・設定で変更可）
}

const MAX = 90

function getStage(current: number): string {
  if (current >= 90) return 'rainbow'
  if (current >= 81) return 'red'
  if (current >= 61) return 'purple'
  if (current >= 41) return 'yellow'
  if (current >= 21) return 'green'
  return 'blue'
}

export default function ContinuityGauge({
  current,
  max = MAX,
  requiredExercises = 3,
  requiredSets = 3,
  resetDays = 10,
}: ContinuityGaugeProps) {
  const percent = Math.min((current / max) * 100, 100)
  const isMaxed = current >= max
  const stage = getStage(current)

  return (
    <div className={`gauge-container gauge-container--${stage}`}>
      <div className="gauge-header">
        <span className="gauge-label">
          {isMaxed ? '🔥 継続力MAX' : '継続力ゲージ'}
        </span>
        {!isMaxed && (
          <span className="gauge-count">{current} / {max}</span>
        )}
      </div>

      <div className="gauge-track">
        <div
          className={`gauge-fill gauge-fill--${stage}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {!isMaxed && (
        <p className="gauge-hint">
          {requiredExercises}種目・{requiredSets}セット以上で+1 ／ {resetDays}日休むとリセット
        </p>
      )}
    </div>
  )
}

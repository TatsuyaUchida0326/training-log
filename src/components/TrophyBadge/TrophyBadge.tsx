import './TrophyBadge.css'

export interface TrophyRecord {
  exerciseName: string
  rm: number
  date: string
}

interface TrophyBadgeProps {
  trophies: TrophyRecord[]
}

export default function TrophyBadge({ trophies }: TrophyBadgeProps) {
  return (
    <div className="trophy-container">
      <div className="trophy-header">
        <span className="trophy-title">1RM更新</span>
      </div>

      {trophies.length === 0 ? (
        <p className="trophy-empty">
          1RM更新で<br />🏆 獲得！
        </p>
      ) : (
        <ul className="trophy-list">
          {trophies.map((t, i) => (
            <li key={i} className="trophy-item">
              <div className="trophy-icon-wrap">
                <span className="trophy-icon">🏆</span>
              </div>
              <div className="trophy-info">
                <span className="trophy-name">{t.exerciseName}</span>
                <span className="trophy-value">{t.rm} kg</span>
              </div>
              <span className="trophy-date">{t.date}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

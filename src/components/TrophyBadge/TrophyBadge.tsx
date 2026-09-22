import { displayWeight } from '../../utils/training'
import type { WeightUnit } from '../../types'
import './TrophyBadge.css'

export interface TrophyRecord {
  exerciseName: string
  rm: number
  date: string
}

interface TrophyBadgeProps {
  trophies: TrophyRecord[]
  unit: WeightUnit
}

export default function TrophyBadge({ trophies, unit }: TrophyBadgeProps) {
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
          {trophies.map((trophy, index) => (
            <li key={index} className="trophy-item">
              <div className="trophy-icon-wrap">
                <span className="trophy-icon">🏆</span>
              </div>
              <div className="trophy-info">
                <span className="trophy-name">{trophy.exerciseName}</span>
                <span className="trophy-value">{displayWeight(trophy.rm, unit)} {unit}</span>
              </div>
              <span className="trophy-date">{trophy.date}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

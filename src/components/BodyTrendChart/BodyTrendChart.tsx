import { format } from 'date-fns'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import type { BodyRecord } from '../../types'
import styles from './BodyTrendChart.module.css'

interface BodyTrendChartProps {
  records: BodyRecord[]
  targetWeight: number   // 0 = 未設定
  targetBodyFat: number  // 0 = 未設定
}

export default function BodyTrendChart({ records, targetWeight, targetBodyFat }: BodyTrendChartProps) {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date))

  const weightPoints = sorted
    .filter((r) => r.weight !== null)
    .slice(-30)
    .map((r) => ({ date: format(new Date(r.date), 'M/d'), value: r.weight as number }))

  const bodyFatPoints = sorted
    .filter((r) => r.bodyFat !== null)
    .slice(-30)
    .map((r) => ({ date: format(new Date(r.date), 'M/d'), value: r.bodyFat as number }))

  if (weightPoints.length === 0 && bodyFatPoints.length === 0) {
    return null
  }

  const weightChartWidth = Math.max(weightPoints.length * 52 + 60, 260)
  const bodyFatChartWidth = Math.max(bodyFatPoints.length * 52 + 60, 260)

  return (
    <div className={styles.wrap}>
      {weightPoints.length > 0 && (
        <div className={styles.chartBlock} data-testid="weight-chart">
          <div className={styles.chartTitle}>
            体重
            {targetWeight > 0 && (
              <span className={styles.targetLabel}>目標 {targetWeight} kg</span>
            )}
          </div>
          <div className={styles.chartScroll}>
            <LineChart
              width={weightChartWidth}
              height={130}
              data={weightPoints}
              margin={{ top: 6, right: 12, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
              <Tooltip />
              {targetWeight > 0 && (
                <ReferenceLine
                  y={targetWeight}
                  stroke="#93c5fd"
                  label={{ value: '目標', position: 'right', fontSize: 10 }}
                />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </div>
        </div>
      )}

      {bodyFatPoints.length > 0 && (
        <div className={styles.chartBlock} data-testid="bodyfat-chart">
          <div className={styles.chartTitle}>
            体脂肪率
            {targetBodyFat > 0 && (
              <span className={styles.targetLabel}>目標 {targetBodyFat} %</span>
            )}
          </div>
          <div className={styles.chartScroll}>
            <LineChart
              width={bodyFatChartWidth}
              height={130}
              data={bodyFatPoints}
              margin={{ top: 6, right: 12, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
              <Tooltip />
              {targetBodyFat > 0 && (
                <ReferenceLine
                  y={targetBodyFat}
                  stroke="#fcd34d"
                  label={{ value: '目標', position: 'right', fontSize: 10 }}
                />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#f59e0b"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </div>
        </div>
      )}
    </div>
  )
}

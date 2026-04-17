import { useState, useMemo, useEffect } from 'react'
import { addMonths, subMonths, format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { usePageHeader } from '../contexts/PageHeaderContext'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import Calendar from '../components/Calendar/Calendar'
import { useTrainingRecords } from '../hooks/useTrainingRecords'
import { useExercises } from '../hooks/useExercises'
import { CATEGORIES } from '../data/defaultExercises'
import { calcHistoryStats } from '../utils/historyStats'
import type { GraphPoint } from '../utils/historyStats'
import styles from './HistoryPage.module.css'

type ViewMode = 'calendar' | 'graph'
const ALL = 'ALL'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL)
  const [selectedExercise, setSelectedExercise] = useState<string>(ALL)
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')

  const { setHeader } = usePageHeader()
  useEffect(() => {
    setHeader({ title: 'トレーニング記録', centered: true })
  }, [setHeader])

  const { records } = useTrainingRecords()
  const { exercises } = useExercises()

  // 部位タブ（デフォルト9 + カスタム）
  const customCategories = [
    ...new Set(exercises.map((e) => e.categoryId)),
  ].filter((c) => !CATEGORIES.includes(c))
  const allCategories = [ALL, ...CATEGORIES, ...customCategories]

  // 種目タブ（選択中の部位に属する種目）
  const exercisesInCategory = useMemo(() => {
    if (selectedCategory === ALL) return exercises
    return exercises.filter((e) => e.categoryId === selectedCategory)
  }, [exercises, selectedCategory])

  function handleCategorySelect(cat: string) {
    setSelectedCategory(cat)
    setSelectedExercise(ALL)
  }

  // フィルタ済みレコード
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedExercise !== ALL) return r.exerciseId === selectedExercise
      if (selectedCategory !== ALL) {
        const ex = exercises.find((e) => e.id === r.exerciseId)
        return ex?.categoryId === selectedCategory
      }
      return true
    })
  }, [records, exercises, selectedCategory, selectedExercise])

  const stats = useMemo(() => calcHistoryStats(filteredRecords), [filteredRecords])

  return (
    <div className={styles.page}>
      {/* 部位タブ */}
      <div className={styles.tabRow}>
        {allCategories.map((cat) => (
          <button
            key={cat}
            className={`${styles.tab} ${selectedCategory === cat ? styles.tabActive : ''}`}
            onClick={() => handleCategorySelect(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 種目タブ */}
      <div className={styles.tabRow}>
        <button
          className={`${styles.tab} ${selectedExercise === ALL ? styles.tabActive : ''}`}
          onClick={() => setSelectedExercise(ALL)}
        >
          ALL
        </button>
        {exercisesInCategory.map((ex) => (
          <button
            key={ex.id}
            className={`${styles.tab} ${selectedExercise === ex.id ? styles.tabActive : ''}`}
            onClick={() => setSelectedExercise(ex.id)}
          >
            {ex.name}
          </button>
        ))}
      </div>

      {/* カレンダー / グラフ 切り替え */}
      <div className={styles.toggleRow}>
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleBtn} ${viewMode === 'calendar' ? styles.toggleActive : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            カレンダー
          </button>
          <button
            className={`${styles.toggleBtn} ${viewMode === 'graph' ? styles.toggleActive : ''}`}
            onClick={() => setViewMode('graph')}
          >
            グラフ
          </button>
        </div>
      </div>

      {/* カレンダービュー */}
      {viewMode === 'calendar' && (
        <div className={styles.calendarWrap}>
          <Calendar
            currentDate={currentDate}
            onPrevMonth={() => setCurrentDate((d) => subMonths(d, 1))}
            onNextMonth={() => setCurrentDate((d) => addMonths(d, 1))}
            onToday={() => setCurrentDate(new Date())}
            selectedDate={selectedDate}
            onDateSelect={(date) => {
                setSelectedDate(date)
                navigate(`/date/${format(date, 'yyyy-MM-dd')}`)
              }}
            markedDates={stats.trainedDates}
          />
        </div>
      )}

      {/* グラフビュー */}
      {viewMode === 'graph' && (
        <div className={styles.graphArea}>
          {stats.maxWeight.length === 0 ? (
            <p className={styles.emptyText}>記録がありません</p>
          ) : (
            <>
              <ChartBlock title="最大重量" data={stats.maxWeight} unit="kg" color="#22c55e" />
              <ChartBlock title="最大RM" data={stats.maxRM} unit="kg" color="#3b82f6" />
              <ChartBlock title="セット数" data={stats.totalSets} unit="set" color="#f59e0b" />
              <ChartBlock title="総負荷量" data={stats.totalVolume} unit="kg" color="#8b5cf6" />
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ── グラフブロック ── */
interface ChartBlockProps {
  title: string
  data: GraphPoint[]
  unit: string
  color: string
}

// 1データ点あたりの幅（px）
const PX_PER_POINT = 52

function ChartBlock({ title, data, unit, color }: ChartBlockProps) {
  const formatted = data.map((d) => ({
    date: format(new Date(d.date), 'M/d'),
    value: d.value,
  }))

  const chartWidth = Math.max(formatted.length * PX_PER_POINT + 60, 300)

  return (
    <div className={styles.chartBlock}>
      <div className={styles.chartTitle}>{title}</div>
      <div className={styles.chartScroll}>
        <LineChart
          width={chartWidth}
          height={200}
          data={formatted}
          margin={{ top: 8, right: 24, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            formatter={(value) => [`${value} ${unit}`, title]}
            labelStyle={{ fontSize: 12, color: '#374151' }}
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </div>
    </div>
  )
}

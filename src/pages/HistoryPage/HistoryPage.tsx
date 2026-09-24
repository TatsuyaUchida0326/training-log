import { useState, useMemo, useEffect } from 'react'
import { Dumbbell } from 'lucide-react'
import { addMonths, subMonths, format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { usePageHeader } from '../../contexts/PageHeaderContext'
import { useChartWidth } from '../../hooks/useChartWidth'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import Calendar from '../../components/Calendar/Calendar'
import CalendarDayPopup from '../../components/CalendarDayPopup/CalendarDayPopup'
import { useTrainingRecords } from '../../hooks/useTrainingRecords'
import { useExercises } from '../../hooks/useExercises'
import { useSettings } from '../../hooks/useSettings'
import { CATEGORIES } from '../../data/defaultExercises'
import {
  displayWeight,
  displayVolume,
  hasFilledSets,
  recordsOfExistingExercises,
} from '../../utils/training'
import { calcHistoryStats } from '../../utils/historyStats'
import type { GraphPoint } from '../../utils/historyStats'
import styles from './HistoryPage.module.css'

type ViewMode = 'calendar' | 'graph'
const ALL = 'ALL'

/** グラフの点（kg 保存）を表示用の値に換算する */
function toDisplayPoints(points: GraphPoint[], convert: (kg: number) => number): GraphPoint[] {
  return points.map((point) => ({ date: point.date, value: convert(point.value) }))
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL)
  const [selectedExercise, setSelectedExercise] = useState<string>(ALL)
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [popupDate, setPopupDate] = useState<string | null>(null)

  const { setHeader } = usePageHeader()
  useEffect(() => {
    setHeader({ title: '履歴', centered: true })
  }, [setHeader])

  const { records } = useTrainingRecords()
  const { exercises } = useExercises()
  const { settings } = useSettings()
  const unit = settings.weightUnit

  // 削除済み種目の記録はカレンダーの印にもグラフにも出さない
  const visibleRecords = useMemo(
    () => recordsOfExistingExercises(records, exercises),
    [records, exercises],
  )

  // 部位タブ（既定の部位 + ユーザーが追加した部位）
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
    return visibleRecords.filter((record) => {
      if (selectedExercise !== ALL) return record.exerciseId === selectedExercise
      if (selectedCategory !== ALL) {
        const ex = exercises.find((e) => e.id === record.exerciseId)
        return ex?.categoryId === selectedCategory
      }
      return true
    })
  }, [visibleRecords, exercises, selectedCategory, selectedExercise])

  const stats = useMemo(() => calcHistoryStats(filteredRecords), [filteredRecords])

  // 重量系グラフ（最大重量・最大RM・総負荷量）は設定の単位に換算して描画する
  const toDisplayWeight = (kg: number) => displayWeight(kg, unit)
  const maxWeightPoints = useMemo(
    () => toDisplayPoints(stats.maxWeight, toDisplayWeight),
    [stats.maxWeight, unit],
  )
  const maxRMPoints = useMemo(
    () => toDisplayPoints(stats.maxRM, toDisplayWeight),
    [stats.maxRM, unit],
  )
  const totalVolumePoints = useMemo(
    () => toDisplayPoints(stats.totalVolume, (kg) => displayVolume(kg, unit)),
    [stats.totalVolume, unit],
  )

  return (
    <div className={styles.page}>
      {/* 部位タブ */}
      <div className={styles.tabRow}>
        {allCategories.map((cat) => (
          <button
            key={cat}
            className={`${styles.tab} ${selectedCategory === cat ? styles.tabActive : ''}`}
            aria-pressed={selectedCategory === cat}
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
          aria-pressed={selectedExercise === ALL}
          onClick={() => setSelectedExercise(ALL)}
        >
          ALL
        </button>
        {exercisesInCategory.map((ex) => (
          <button
            key={ex.id}
            className={`${styles.tab} ${selectedExercise === ex.id ? styles.tabActive : ''}`}
            aria-pressed={selectedExercise === ex.id}
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
            aria-pressed={viewMode === 'calendar'}
            onClick={() => setViewMode('calendar')}
          >
            カレンダー
          </button>
          <button
            className={`${styles.toggleBtn} ${viewMode === 'graph' ? styles.toggleActive : ''}`}
            aria-pressed={viewMode === 'graph'}
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
                const dateStr = format(date, 'yyyy-MM-dd')
                const hasRecords = visibleRecords.some(
                  (record) => record.date === dateStr && hasFilledSets(record),
                )
                if (hasRecords) {
                  setPopupDate(dateStr)
                } else {
                  setSelectedDate(date)
                  navigate(`/date/${dateStr}`)
                }
              }}
            achievedDates={stats.trainedDates}
            markIcon={<Dumbbell size={16} strokeWidth={2.5} />}
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
              {/* index.css の --color-primary と揃える */}
              <ChartBlock title="最大重量" data={maxWeightPoints} unit={unit} color="#15803d" />
              <ChartBlock title="最大RM" data={maxRMPoints} unit={unit} color="#3b82f6" />
              <ChartBlock title="セット数" data={stats.totalSets} unit="set" color="#f59e0b" />
              <ChartBlock title="総負荷量" data={totalVolumePoints} unit={unit} color="#8b5cf6" />
            </>
          )}
        </div>
      )}
      {popupDate && (
        <CalendarDayPopup
          date={popupDate}
          records={visibleRecords.filter((record) => record.date === popupDate)}
          exercises={exercises}
          onClose={() => setPopupDate(null)}
          onNavigate={(date) => {
            setPopupDate(null)
            navigate(`/date/${date}`)
          }}
        />
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

const PX_PER_POINT = 52
const CHART_PADDING_PX = 60
const CHART_MIN_WIDTH = 300

/**
 * 目盛りはデータの範囲に合わせる。0 起点にすると、
 * 60kg → 67.5kg のような伸びが画面上ほぼ平らになって読み取れない。
 */
const Y_DOMAIN: [(dataMin: number) => number, (dataMax: number) => number] = [
  (dataMin) => Math.max(0, Math.floor(dataMin * 0.92)),
  (dataMax) => Math.ceil(dataMax * 1.05),
]

function ChartBlock({ title, data, unit, color }: ChartBlockProps) {
  const formatted = useMemo(
    () => data.map((d) => ({
      date: format(new Date(d.date), 'M/d'),
      value: d.value,
    })),
    [data]
  )

  const fallbackWidth = Math.max(formatted.length * PX_PER_POINT + CHART_PADDING_PX, CHART_MIN_WIDTH)
  const [chartRef, chartWidth] = useChartWidth<HTMLDivElement>(fallbackWidth)

  return (
    <div className={styles.chartBlock}>
      <div className={styles.chartTitle}>{title}</div>
      <div className={styles.chartArea} ref={chartRef}>
        <LineChart
          width={chartWidth}
          height={200}
          data={formatted}
          margin={{ top: 8, right: 24, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="date"
            interval="preserveStartEnd"
            minTickGap={24}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={Y_DOMAIN}
            tick={{ fontSize: 10, fill: '#6b7280' }}
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

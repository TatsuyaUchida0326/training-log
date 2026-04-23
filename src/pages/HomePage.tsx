import { useState, useEffect } from 'react'
import { addMonths, subMonths, format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import Calendar from '../components/Calendar/Calendar'
import ContinuityGauge from '../components/ContinuityGauge/ContinuityGauge'
import TrophyBadge from '../components/TrophyBadge/TrophyBadge'
import BodyTrendChart from '../components/BodyTrendChart/BodyTrendChart'
import { useSettings } from '../hooks/useSettings'
import { useTrainingRecords } from '../hooks/useTrainingRecords'
import { useExercises } from '../hooks/useExercises'
import { useBodyRecords } from '../hooks/useBodyRecords'
import { useBodySettings } from '../hooks/useBodySettings'
import { usePageHeader } from '../contexts/PageHeaderContext'
import { calcRM, displayWeight, getBest1RMs } from '../utils/training'
import { calcContinuityStreak, getQualifyingDates } from '../utils/continuity'
import styles from './HomePage.module.css'

export default function HomePage() {
  const { settings } = useSettings()
  const navigate = useNavigate()
  const { setHeader } = usePageHeader()

  useEffect(() => {
    setHeader({ title: 'Strength Log', centered: false })
  }, [setHeader])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const { records, getRecordsByDate } = useTrainingRecords()
  const { exercises } = useExercises()
  const { records: bodyRecords } = useBodyRecords()
  const { settings: bodySettings } = useBodySettings()

  const unit = settings.weightUnit
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  // トレーニング記録がある日付（カレンダーのドット表示用）
  const markedDates = [
    ...new Set(records.filter((r) => r.sets.length > 0).map((r) => r.date)),
  ]

  // 今日の記録をサマリー表示
  const todayRecords = getRecordsByDate(todayStr).filter((r) => r.sets.length > 0)

  type GroupedExercise = {
    exerciseId: string
    name: string
    categoryId: string
    sets: { id: string; weight: number; reps: number; memo: string }[]
    maxRM: number
  }

  const grouped = new Map<string, GroupedExercise[]>()
  todayRecords.forEach((record) => {
    const ex = exercises.find((e) => e.id === record.exerciseId)
    if (!ex) return
    const maxRM = record.sets.reduce(
      (max, s) => Math.max(max, calcRM(s.weight, s.reps)),
      0
    )
    const entry: GroupedExercise = {
      exerciseId: ex.id,
      name: ex.name,
      categoryId: ex.categoryId,
      sets: record.sets,
      maxRM,
    }
    if (!grouped.has(ex.categoryId)) grouped.set(ex.categoryId, [])
    grouped.get(ex.categoryId)!.push(entry)
  })

  // 継続力ストリーク計算
  const continuityStreak = calcContinuityStreak(
    records,
    settings.requiredExercises,
    settings.defaultSets,
  )

  // カレンダー用: 条件達成日（フルカラー）
  const achievedDates = getQualifyingDates(
    records,
    settings.requiredExercises,
    settings.defaultSets,
  )

  // TrophyBadge用: 全記録から種目別の歴代最高RM（日付は M/d 形式で表示）
  const trophies = getBest1RMs(records, exercises).map((t) => ({
    ...t,
    date: format(new Date(t.date), 'M/d'),
  }))

  return (
    <div className={styles.page}>
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
        markedDates={markedDates}
        achievedDates={achievedDates}
      />

      <div className={styles.mainRow}>
        <div className={styles.leftCol}>
          <ContinuityGauge
            current={continuityStreak}
            requiredExercises={settings.requiredExercises}
            requiredSets={settings.defaultSets}
          />
          <BodyTrendChart
            records={bodyRecords}
            targetWeight={bodySettings.targetWeight}
            targetBodyFat={bodySettings.targetBodyFat}
          />
        </div>
        <div className={styles.rightCol}>
          <TrophyBadge trophies={trophies} />
        </div>
      </div>

      {/* 今日のトレーニングサマリー */}
      <div className={styles.summary}>
        <div className={styles.summaryHeader}>
          <span className={styles.summaryDate}>今日のトレーニング</span>
        </div>

        <div className={styles.summaryScroll}>
          {grouped.size === 0 ? (
            <p className={styles.emptyText}>まだ記録がありません</p>
          ) : (
            Array.from(grouped.entries()).map(([categoryId, exList]) => (
              <div key={categoryId} className={styles.categoryBlock}>
                <div className={styles.categoryLabel}>{categoryId}</div>
                {exList.map((ex) => (
                  <div
                    key={ex.exerciseId}
                    className={styles.exerciseCard}
                    onClick={() =>
                      navigate(`/date/${todayStr}/exercises/${ex.exerciseId}`)
                    }
                  >
                    <div className={styles.exerciseHeader}>
                      <span className={styles.exerciseName}>{ex.name}</span>
                      {ex.maxRM > 0 && (
                        <span className={styles.rmLabel}>
                          RM : {displayWeight(ex.maxRM, unit)}&nbsp;{unit}
                        </span>
                      )}
                    </div>
                    <div className={styles.setList}>
                      {ex.sets.map((s, idx) => (
                        <div key={s.id} className={styles.setRow}>
                          <span className={styles.setNum}>{idx + 1}</span>
                          <span className={styles.setDetail}>
                            {displayWeight(s.weight, unit)}&nbsp;{unit}&nbsp;×&nbsp;{s.reps}&nbsp;reps
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

import { useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { parseISO, isValid, format } from 'date-fns'
import { useTrainingRecords } from '../../hooks/useTrainingRecords'
import { useExercises } from '../../hooks/useExercises'
import { useSettings } from '../../hooks/useSettings'
import { usePageHeader } from '../../contexts/PageHeaderContext'
import {
  displayWeight,
  displayVolume,
  calcRM,
  filledSets,
  hasFilledSets,
} from '../../utils/training'
import type { Exercise, TrainingRecord, TrainingSet } from '../../types'
import styles from './DateDetailPage.module.css'

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土']

interface DisplayedRecord {
  record: TrainingRecord
  exercise: Exercise
  sets: TrainingSet[]
}

function formatDateJa(date: Date): string {
  const weekday = WEEKDAYS_JA[date.getDay()]
  return `${format(date, 'yyyy年M月d日')}（${weekday}）`
}

export default function DateDetailPage() {
  const { dateStr } = useParams<{ dateStr: string }>()
  const navigate = useNavigate()

  const { getRecordsByDate } = useTrainingRecords()
  const { exercises } = useExercises()
  const { settings } = useSettings()
  const { setHeader } = usePageHeader()
  const unit = settings.weightUnit

  const date = dateStr ? parseISO(dateStr) : null
  const isValidDate = date && isValid(date)

  const records = isValidDate ? getRecordsByDate(dateStr!) : []

  /**
   * 画面に出す記録（種目が存在し、中身のあるセットがあるものだけ）。
   * 削除済み種目や空セットだけの記録を数えると、カードの表示と合計種目数が食い違うため、
   * ここで一度だけ絞る。
   */
  const displayedRecords: DisplayedRecord[] = records.filter(hasFilledSets).flatMap((record) => {
    const exercise = exercises.find((item) => item.id === record.exerciseId)
    return exercise ? [{ record, exercise, sets: filledSets(record) }] : []
  })

  const totalExercises = displayedRecords.length
  const totalSets = displayedRecords.reduce((acc, entry) => acc + entry.sets.length, 0)
  const totalReps = displayedRecords.reduce(
    (acc, entry) => acc + entry.sets.reduce((sum, set) => sum + set.reps, 0),
    0
  )
  const totalVolume = displayedRecords.reduce(
    (acc, entry) =>
      acc + entry.sets.reduce((sum, set) => sum + set.weight * set.reps, 0),
    0
  )
  const totalVolumeDisplay = displayVolume(totalVolume, unit)

  useEffect(() => {
    setHeader({ title: 'トレーニング記録画面', centered: true })
  }, [setHeader])

  if (!isValidDate) {
    return (
      <div className={styles.page}>
        <p className={styles.errorText}>日付が正しくありません</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* 日付 + 集計カード */}
      <div className={styles.dateSection}>
        <div className={styles.dateLabel}>{formatDateJa(date)}</div>
        <div className={styles.bodyStats}>
          <div className={styles.bodyStatCard}>
            <span className={styles.bodyStatLabel}>合計種目数</span>
            <span className={styles.bodyStatValue}>{totalExercises}</span>
          </div>
          <div className={styles.bodyStatDivider} />
          <div className={styles.bodyStatCard}>
            <span className={styles.bodyStatLabel}>合計セット数</span>
            <span className={styles.bodyStatValue}>{totalSets}</span>
          </div>
          <div className={styles.bodyStatDivider} />
          <div className={styles.bodyStatCard}>
            <span className={styles.bodyStatLabel}>合計レップ数</span>
            <span className={styles.bodyStatValue}>{totalReps}</span>
          </div>
          <div className={styles.bodyStatDivider} />
          <div className={styles.bodyStatCard}>
            <span className={styles.bodyStatLabel}>負荷量({unit})</span>
            <span className={styles.bodyStatValue}>{totalVolumeDisplay.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className={styles.content}>
        {totalExercises === 0 ? (
          <div className={styles.emptyCard}>
            <div className={styles.emptyIcon}>🏋️</div>
            <p className={styles.emptyText}>
              右下の ＋ から種目を追加してトレーニングを記録しましょう
            </p>
          </div>
        ) : (
          <div className={styles.exerciseList}>
            {displayedRecords.map(({ record, exercise, sets }) => {
              return (
                <div key={record.id} className={styles.exerciseCard}>
                  {/* カードヘッダー */}
                  <button
                    className={styles.exerciseHeader}
                    onClick={() =>
                      navigate(`/date/${dateStr}/exercises/${record.exerciseId}`)
                    }
                  >
                    <span className={styles.exerciseName}>{exercise.name}</span>
                  </button>

                  {/* セット一覧 */}
                  <div className={styles.setTable}>
                    <div className={styles.setTableHeader}>
                      <span className={styles.tColSet}>セット</span>
                      <span className={styles.tColWeight}>重さ</span>
                      <span className={styles.tColReps}>回数</span>
                      <span className={styles.tColRm}>RM</span>
                    </div>
                    {sets.map((set, index) => {
                      const rm = calcRM(set.weight, set.reps)
                      return (
                        <div key={set.id} className={styles.setTableRow}>
                          <span className={styles.tColSet}>{index + 1}</span>
                          <span className={styles.tColWeight}>
                            {displayWeight(set.weight, unit)}&nbsp;{unit}
                          </span>
                          <span className={styles.tColReps}>{set.reps}&nbsp;回</span>
                          <span className={styles.tColRm}>
                            {rm > 0 ? `${displayWeight(rm, unit)}` : '—'}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FAB: 左下の戻るボタン */}
      <button
        className={styles.fabBack}
        onClick={() => navigate(-1)}
        aria-label="戻る"
      >
        戻る
      </button>

      {/* FAB: 右下の種目追加ボタン */}
      <button
        className={styles.fab}
        onClick={() => navigate(`/date/${dateStr}/exercises/select`)}
        aria-label="種目を追加"
      >
        <Plus size={24} />
      </button>
    </div>
  )
}

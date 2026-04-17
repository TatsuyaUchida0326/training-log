import { useParams, useNavigate } from 'react-router-dom'
import { parseISO, isValid, format } from 'date-fns'
import { useTrainingRecords } from '../hooks/useTrainingRecords'
import { useExercises } from '../hooks/useExercises'
import { useSettings } from '../hooks/useSettings'
import { displayWeight, calcRM } from '../utils/training'
import styles from './DateDetailPage.module.css'

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土']

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
  const unit = settings.weightUnit

  const date = dateStr ? parseISO(dateStr) : null
  const isValidDate = date && isValid(date)

  if (!isValidDate) {
    return (
      <div className={styles.page}>
        <p className={styles.errorText}>日付が正しくありません</p>
      </div>
    )
  }

  const records = getRecordsByDate(dateStr!)
  const filledRecords = records.filter((r) => r.sets.length > 0)

  const totalExercises = filledRecords.length
  const totalSets = filledRecords.reduce((acc, r) => acc + r.sets.length, 0)
  const totalReps = filledRecords.reduce(
    (acc, r) => acc + r.sets.reduce((s, set) => s + set.reps, 0),
    0
  )
  const totalVolume = filledRecords.reduce(
    (acc, r) =>
      acc + r.sets.reduce((s, set) => s + set.weight * set.reps, 0),
    0
  )

  const displayVolume =
    unit === 'lbs'
      ? Math.round(totalVolume * 2.20462)
      : Math.round(totalVolume)

  return (
    <div className={styles.page}>
      {/* 日付バー */}
      <div className={styles.dateBar}>
        <button
          className={styles.backButton}
          onClick={() => navigate('/')}
          aria-label="戻る"
        >
          ＜
        </button>
        <span className={styles.dateTitle}>{formatDateJa(date)}</span>
      </div>

      {/* 統計バー */}
      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>合計{'\n'}種目数</div>
          <div className={styles.statValue}>{totalExercises}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>合計{'\n'}セット数</div>
          <div className={styles.statValue}>{totalSets}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>合計{'\n'}レップ数</div>
          <div className={styles.statValue}>{totalReps}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>合計{'\n'}負荷量</div>
          <div className={styles.statValue}>{displayVolume}</div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className={styles.content}>
        {totalExercises === 0 ? (
          <div className={styles.emptyCard}>
            <div className={styles.emptyIcon}>🏋️</div>
            <p className={styles.emptyText}>
              種目を追加してトレーニングを記録しましょう
            </p>
          </div>
        ) : (
          <div className={styles.exerciseList}>
            {filledRecords.map((record) => {
              const ex = exercises.find((e) => e.id === record.exerciseId)
              if (!ex) return null
              return (
                <div key={record.id} className={styles.exerciseCard}>
                  {/* カードヘッダー */}
                  <button
                    className={styles.exerciseHeader}
                    onClick={() =>
                      navigate(`/date/${dateStr}/exercises/${record.exerciseId}`)
                    }
                  >
                    <span className={styles.exerciseName}>{ex.name}</span>
                    <span className={styles.exerciseChevron}>›</span>
                  </button>

                  {/* セット一覧 */}
                  <div className={styles.setTable}>
                    <div className={styles.setTableHeader}>
                      <span className={styles.tColSet}>セット</span>
                      <span className={styles.tColWeight}>重さ</span>
                      <span className={styles.tColReps}>回数</span>
                      <span className={styles.tColRm}>RM</span>
                    </div>
                    {record.sets.map((s, idx) => {
                      const rm = calcRM(s.weight, s.reps)
                      return (
                        <div key={s.id} className={styles.setTableRow}>
                          <span className={styles.tColSet}>{idx + 1}</span>
                          <span className={styles.tColWeight}>
                            {displayWeight(s.weight, unit)}&nbsp;{unit}
                          </span>
                          <span className={styles.tColReps}>{s.reps}&nbsp;回</span>
                          <span className={styles.tColRm}>
                            {rm > 0 ? `${rm}` : '—'}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* ＋ セット追加 → 入力画面へ */}
                  <button
                    className={styles.addSetInCard}
                    onClick={() =>
                      navigate(`/date/${dateStr}/exercises/${record.exerciseId}`)
                    }
                  >
                    ＋
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FAB: 種目選択画面へ */}
      <button
        className={styles.fab}
        aria-label="種目を追加"
        onClick={() => navigate(`/date/${dateStr}/exercises/select`)}
      >
        ＋
      </button>
    </div>
  )
}

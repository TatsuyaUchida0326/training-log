import { useEffect } from 'react'
import { useWgerExercise } from '../../hooks/useWgerExercise'
import styles from './ExerciseDetailModal.module.css'

interface Props {
  exerciseName: string
  onClose: () => void
}

export default function ExerciseDetailModal({ exerciseName, onClose }: Props) {
  const { status, data, fetch } = useWgerExercise(exerciseName)

  useEffect(() => {
    fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{exerciseName}</h2>

        {status === 'loading' && <p>読み込み中…</p>}

        {status === 'error' && <p>詳細情報を取得できませんでした</p>}

        {status === 'ok' && data && (
          <>
            <div className={styles.section}>
              <div className={styles.sectionLabel}>対象筋肉</div>
              {data.muscles.length > 0 ? (
                <div className={styles.muscleList}>
                  {data.muscles.map((m) => (
                    <span key={m} className={styles.muscleTag}>{m}</span>
                  ))}
                </div>
              ) : (
                <p className={styles.description}>情報なし</p>
              )}
            </div>

            {data.musclesSecondary.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>補助筋</div>
                <div className={styles.muscleList}>
                  {data.musclesSecondary.map((m) => (
                    <span key={m} className={styles.muscleTag}>{m}</span>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.section}>
              <div className={styles.sectionLabel}>説明</div>
              <p className={styles.description}>{data.descriptionJa}</p>
            </div>
          </>
        )}

        <button
          className={styles.closeButton}
          role="button"
          aria-label="閉じる"
          onClick={onClose}
        >
          閉じる
        </button>
      </div>
    </div>
  )
}

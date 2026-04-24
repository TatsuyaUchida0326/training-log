import { useEffect } from 'react'
import { useWgerExercise } from '../../hooks/useWgerExercise'
import type { Exercise } from '../../types'
import type { WgerExerciseData } from '../../hooks/useWgerExercise'
import styles from './ExerciseDetailModal.module.css'

interface Props {
  exercise: Exercise
  onClose: () => void
}

export default function ExerciseDetailModal({ exercise, onClose }: Props) {
  // カスタム種目で保存済みデータがある場合はAPIスキップ
  const hasCustomData =
    exercise.isCustom &&
    ((exercise.muscles?.length ?? 0) > 0 || !!exercise.description)

  const isCustomWithoutData = exercise.isCustom && !hasCustomData

  const { status, data, fetch } = useWgerExercise(
    hasCustomData || isCustomWithoutData ? '' : exercise.name,
  )

  useEffect(() => {
    if (!hasCustomData && !isCustomWithoutData) fetch()
  }, [fetch, hasCustomData, isCustomWithoutData])

  const effectiveData: WgerExerciseData | null = hasCustomData
    ? {
        muscles: exercise.muscles ?? [],
        musclesSecondary: exercise.musclesSecondary ?? [],
        descriptionJa: exercise.description ?? '',
      }
    : data

  const effectiveStatus = hasCustomData || isCustomWithoutData ? 'ok' : status

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{exercise.name}</h2>

        {effectiveStatus === 'loading' && <p>読み込み中…</p>}
        {effectiveStatus === 'error' && <p>詳細情報を取得できませんでした</p>}

        {effectiveStatus === 'ok' && (
          <>
            {isCustomWithoutData ? (
              <p className={styles.description}>種目追加時に情報を入力すると表示されます</p>
            ) : effectiveData && (
              <>
                <div className={styles.section}>
                  <div className={styles.sectionLabel}>対象筋肉</div>
                  {effectiveData.muscles.length > 0 ? (
                    <div className={styles.muscleList}>
                      {effectiveData.muscles.map((m) => (
                        <span key={m} className={styles.muscleTag}>{m}</span>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.description}>情報なし</p>
                  )}
                </div>

                {effectiveData.musclesSecondary.length > 0 && (
                  <div className={styles.section}>
                    <div className={styles.sectionLabel}>補助筋</div>
                    <div className={styles.muscleList}>
                      {effectiveData.musclesSecondary.map((m) => (
                        <span key={m} className={styles.muscleTag}>{m}</span>
                      ))}
                    </div>
                  </div>
                )}

                {effectiveData.descriptionJa && (
                  <div className={styles.section}>
                    <div className={styles.sectionLabel}>説明</div>
                    <p className={styles.description}>{effectiveData.descriptionJa}</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        <button
          className={styles.closeButton}
          aria-label="閉じる"
          onClick={onClose}
        >
          閉じる
        </button>
      </div>
    </div>
  )
}

import { useEffect, useId } from 'react'
import { useDialog } from '../../hooks/useDialog'
import { useExerciseDetail } from '../../hooks/useExerciseDetail'
import type { Exercise } from '../../types'
import type { ExerciseDetail } from '../../hooks/useExerciseDetail'
import { EXERCISE_VIDEO_MAP } from '../../data/exerciseVideoMap'
import styles from './ExerciseDetailModal.module.css'

interface Props {
  exercise: Exercise
  onClose: () => void
}

export default function ExerciseDetailModal({ exercise, onClose }: Props) {
  // カスタム種目かつ筋肉または説明が保存されている場合 → APIスキップしてローカルデータを表示
  const hasCustomData =
    exercise.isCustom &&
    ((exercise.muscles?.length ?? 0) > 0 || !!exercise.description)

  // カスタム種目だが追加時に情報を入力しなかった場合 → 「入力すると表示されます」と案内
  const isCustomWithoutData = exercise.isCustom && !hasCustomData

  // jaName を空文字にすることで useExerciseDetail 内のフェッチをスキップさせる
  const { status, data, load } = useExerciseDetail(
    hasCustomData || isCustomWithoutData ? '' : exercise.name,
  )

  useEffect(() => {
    // デフォルト種目のみAPIを呼び出す（カスタム種目はスキップ）
    if (!hasCustomData && !isCustomWithoutData) load()
  }, [load, hasCustomData, isCustomWithoutData])

  // カスタム種目の保存データをAPI応答と同じ形に揃える（表示ロジックを統一するため）
  const effectiveData: ExerciseDetail | null = hasCustomData
    ? {
        muscles: exercise.muscles ?? [],
        musclesSecondary: exercise.musclesSecondary ?? [],
        descriptionJa: exercise.description ?? '',
        thumbnailUrl: '',  // カスタム種目は画像なし
      }
    : data

  // カスタム種目はAPI待ち不要なので常に 'ok' として扱い、ローディング表示を出さない
  const effectiveStatus = hasCustomData || isCustomWithoutData ? 'ok' : status

  // デフォルト種目: 静的マップの動画ID → VALX 筋トレ大学の動画へ直リンク
  // カスタム種目: マップに存在しないので常に検索URLにフォールバック
  const videoId = EXERCISE_VIDEO_MAP[exercise.name]
  const youtubeHref = videoId
    ? `https://www.youtube.com/watch?v=${videoId}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.name + ' フォーム')}`

  const titleId = useId()
  const dialogRef = useDialog<HTMLDivElement>(onClose)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className={styles.title}>{exercise.name}</h2>

        {effectiveStatus === 'loading' && <p>読み込み中…</p>}
        {effectiveStatus === 'error' && <p>詳細情報を取得できませんでした</p>}

        {effectiveStatus === 'ok' && (
          <>
            {isCustomWithoutData ? (
              // 情報なしのカスタム種目：次回の入力を促すガイドメッセージ
              <p className={styles.description}>種目追加時に情報を入力すると表示されます</p>
            ) : effectiveData && (
              <>
                {/* Wikipedia サムネイル（デフォルト種目かつ画像URLがある場合のみ表示） */}
                {effectiveData.thumbnailUrl && (
                  <img
                    src={effectiveData.thumbnailUrl}
                    alt={exercise.name}
                    className={styles.thumbnail}
                  />
                )}

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

                {/* Wikipedia説明文が空（記事なし）の場合はセクション自体を非表示 */}
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

        {/* デフォルト種目: VALX 筋トレ大学の動画へ直リンク、カスタム種目: YouTube 検索URL */}
        <a
          href={youtubeHref}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.youtubeLink}
        >
          フォーム動画を見る ↗
        </a>

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

import { useState, useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { useExercises } from '../../hooks/useExercises'
import { useTrainingRecords } from '../../hooks/useTrainingRecords'
import { usePageHeader } from '../../contexts/PageHeaderContext'
import { CATEGORIES } from '../../data/defaultExercises'
import { hasFilledSets } from '../../utils/training'
import ExerciseDetailModal from '../../components/ExerciseDetailModal/ExerciseDetailModal'
import type { Exercise } from '../../types'
import styles from './ExerciseSelectPage.module.css'

const INITIAL_SHOW = 3

export default function ExerciseSelectPage() {
  const { dateStr } = useParams<{ dateStr: string }>()
  const navigate = useNavigate()
  const { exercises, getCategoryExercises, deleteExercise } = useExercises()
  const { records } = useTrainingRecords()
  const { setHeader } = usePageHeader()

  const [isEditMode, setIsEditMode] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null)

  useEffect(() => {
    setHeader({
      title: '種目を選ぶ',
      centered: true,
      // navigate(-1) だと直接URLを開いたときアプリ外へ戻るため、遷移先を明示する
      leftElement: (
        <button
          className="header-icon-btn"
          aria-label="戻る"
          onClick={() => navigate(`/date/${dateStr}`)}
        >
          <ChevronLeft size={24} />
        </button>
      ),
    })
  }, [setHeader, navigate, dateStr])

  // デフォルト順 + カスタムカテゴリー（CATEGORIES にないもの）を末尾に追加
  const customCategories = [...new Set(exercises.map((e) => e.categoryId))]
    .filter((cat) => !CATEGORIES.includes(cat))
  const allCategories = [...CATEGORIES, ...customCategories]

  // 削除は取り消せないため、その種目に紐づく記録の件数を示して確認する
  function confirmAndDelete(exercise: Exercise) {
    const recordCount = records.filter(
      (record) => record.exerciseId === exercise.id && hasFilledSets(record),
    ).length
    const accepted = window.confirm(
      `「${exercise.name}」を削除しますか？\nこの種目の記録 ${recordCount} 件は表示されなくなります。`,
    )
    if (!accepted) return
    deleteExercise(exercise.id)
  }

  // 行クリックと種目名ボタンの両方から呼ばれる。編集モード中は遷移しない
  function openRecordPage(exerciseId: string) {
    if (isEditMode) return
    navigate(`/date/${dateStr}/exercises/${exerciseId}`)
  }

  function toggleExpand(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  return (
    <div className={styles.page}>
      {/* 部位・種目を追加 + Edit */}
      <div className={styles.addArea}>
        <button
          className={`${styles.editButton} ${isEditMode ? styles.editActive : ''}`}
          onClick={() => setIsEditMode((v) => !v)}
        >
          {isEditMode ? 'End' : 'Edit'}
        </button>
        <button
          className={styles.addButton}
          onClick={() => navigate(`/date/${dateStr}/exercises/add`)}
        >
          部位・種目を追加
        </button>
      </div>

      {/* カテゴリー別アコーディオン */}
      <div className={styles.list}>
        {allCategories.map((cat) => {
          const exercises = getCategoryExercises(cat)
          const isExpanded = expandedCategories.has(cat)
          const visible = isExpanded ? exercises : exercises.slice(0, INITIAL_SHOW)
          const hasMore = exercises.length > INITIAL_SHOW

          return (
            <div key={cat} className={styles.categoryBlock}>
              <div className={styles.categoryHeader}>{cat}</div>

              {exercises.length === 0 ? (
                <p className={styles.emptyCategory}>種目がありません</p>
              ) : (
                <>
                  {visible.map((ex) => (
                    <div
                      key={ex.id}
                      className={styles.exerciseRow}
                      onClick={() => openRecordPage(ex.id)}
                      style={{ cursor: isEditMode ? 'default' : 'pointer' }}
                    >
                      {isEditMode && (
                        <button
                          className={styles.deleteButton}
                          aria-label={`${ex.name}を削除`}
                          onClick={(e) => {
                            e.stopPropagation()
                            confirmAndDelete(ex)
                          }}
                        >
                          －
                        </button>
                      )}
                      {isEditMode ? (
                        // 編集モードでは遷移操作が無いため、Tab で止まる button ではなく span にする
                        <span className={styles.exerciseName}>{ex.name}</span>
                      ) : (
                        <button
                          type="button"
                          className={styles.exerciseName}
                          onClick={(e) => {
                            // 行の onClick と二重に遷移させないため、行への伝播を止める
                            e.stopPropagation()
                            openRecordPage(ex.id)
                          }}
                        >
                          {ex.name}
                        </button>
                      )}
                      {!isEditMode && (
                        <button
                          className={styles.infoButton}
                          aria-label={`${ex.name}の詳細を見る`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setDetailExercise(ex)
                          }}
                        >
                          解説
                        </button>
                      )}
                    </div>
                  ))}

                  {hasMore && (
                    <div className={styles.categoryFooter}>
                      <button
                        className={styles.showAllButton}
                        onClick={() => toggleExpand(cat)}
                      >
                        {isExpanded ? '閉じる' : 'すべて表示'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {detailExercise && (
        <ExerciseDetailModal
          exercise={detailExercise}
          onClose={() => setDetailExercise(null)}
        />
      )}
    </div>
  )
}

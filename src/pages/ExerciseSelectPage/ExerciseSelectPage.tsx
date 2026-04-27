import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useExercises } from '../../hooks/useExercises'
import { usePageHeader } from '../../contexts/PageHeaderContext'
import { CATEGORIES } from '../../data/defaultExercises'
import ExerciseDetailModal from '../../components/ExerciseDetailModal/ExerciseDetailModal'
import type { Exercise } from '../../types'
import styles from './ExerciseSelectPage.module.css'

const INITIAL_SHOW = 3

export default function ExerciseSelectPage() {
  const { dateStr } = useParams<{ dateStr: string }>()
  const navigate = useNavigate()
  const { exercises, getCategoryExercises, deleteExercise } = useExercises()
  const { setHeader } = usePageHeader()

  const [isEditMode, setIsEditMode] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null)

  useEffect(() => {
    setHeader({ title: '種目を選択', centered: true })
  }, [setHeader])

  // デフォルト順 + カスタムカテゴリー（CATEGORIES にないもの）を末尾に追加
  const customCategories = [...new Set(exercises.map((e) => e.categoryId))]
    .filter((cat) => !CATEGORIES.includes(cat))
  const allCategories = [...CATEGORIES, ...customCategories]

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
                      onClick={() => {
                        if (!isEditMode) {
                          navigate(`/date/${dateStr}/exercises/${ex.id}`)
                        }
                      }}
                      style={{ cursor: isEditMode ? 'default' : 'pointer' }}
                    >
                      {isEditMode && (
                        <button
                          className={styles.deleteButton}
                          aria-label="削除"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteExercise(ex.id)
                          }}
                        >
                          －
                        </button>
                      )}
                      <span className={styles.exerciseName}>{ex.name}</span>
                      {!isEditMode && (
                        <button
                          className={styles.infoButton}
                          aria-label="詳細を見る"
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

      {/* FAB: 左下の戻るボタン */}
      <button
        className={styles.fabBack}
        onClick={() => navigate(-1)}
        aria-label="戻る"
      >
        戻る
      </button>

      {detailExercise && (
        <ExerciseDetailModal
          exercise={detailExercise}
          onClose={() => setDetailExercise(null)}
        />
      )}
    </div>
  )
}

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useExercises } from '../hooks/useExercises'
import { CATEGORIES } from '../data/defaultExercises'
import styles from './ExerciseSelectPage.module.css'

const INITIAL_SHOW = 3

export default function ExerciseSelectPage() {
  const { dateStr } = useParams<{ dateStr: string }>()
  const navigate = useNavigate()
  const { exercises, getCategoryExercises, deleteExercise } = useExercises()

  const [isEditMode, setIsEditMode] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

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
      {/* ヘッダーバー */}
      <div className={styles.bar}>
        <button
          className={styles.backButton}
          onClick={() => navigate(`/date/${dateStr}`)}
          aria-label="戻る"
        >
          ＜
        </button>
        <span className={styles.barTitle}>種目を選択</span>
        <button
          className={styles.editButton}
          onClick={() => setIsEditMode((v) => !v)}
        >
          {isEditMode ? 'End' : 'Edit'}
        </button>
      </div>

      {/* 部位・種目を追加 */}
      <div className={styles.addArea}>
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
                    <div key={ex.id} className={styles.exerciseRow}>
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
    </div>
  )
}

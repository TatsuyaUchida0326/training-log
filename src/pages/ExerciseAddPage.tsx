import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { useExercises } from '../hooks/useExercises'
import styles from './ExerciseAddPage.module.css'

export default function ExerciseAddPage() {
  const { dateStr } = useParams<{ dateStr: string }>()
  const navigate = useNavigate()
  const { addExercise } = useExercises()

  const [categoryId, setCategoryId] = useState('')
  const [name, setName] = useState('')
  const [musclesInput, setMusclesInput] = useState('')
  const [musclesSecondaryInput, setMusclesSecondaryInput] = useState('')
  const [descriptionInput, setDescriptionInput] = useState('')

  const canRegister = name.trim().length > 0 && categoryId.trim().length > 0

  function handleRegister() {
    if (!canRegister) return
    addExercise({
      name: name.trim(),
      categoryId: categoryId.trim(),
      muscles: musclesInput ? musclesInput.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      musclesSecondary: musclesSecondaryInput
        ? musclesSecondaryInput.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
      description: descriptionInput.trim() || undefined,
    })
    navigate(`/date/${dateStr}/exercises/select`)
  }

  return (
    <div className={styles.page}>
      {/* ヘッダーバー */}
      <div className={styles.bar}>
        <button
          className={styles.backButton}
          onClick={() => navigate(`/date/${dateStr}/exercises/select`)}
          aria-label="戻る"
        >
          <ChevronLeft size={20} />
        </button>
        <span className={styles.barTitle}>種目を追加</span>
        <button
          className={styles.registerButton}
          onClick={handleRegister}
          disabled={!canRegister}
        >
          登録
        </button>
      </div>

      {/* フォーム */}
      <div className={styles.form}>
        <div className={styles.row}>
          <span className={styles.label}>部位</span>
          <input
            className={styles.input}
            type="text"
            placeholder="例: 胸、背中"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          />
        </div>
        <div className={styles.row}>
          <span className={styles.label}>種目名</span>
          <input
            className={styles.input}
            type="text"
            placeholder="種目名を入力"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className={styles.row}>
          <span className={styles.label}>対象筋肉</span>
          <input
            className={styles.input}
            type="text"
            placeholder="例: 大胸筋, 上腕三頭筋"
            value={musclesInput}
            onChange={(e) => setMusclesInput(e.target.value)}
          />
        </div>
        <div className={styles.row}>
          <span className={styles.label}>補助筋</span>
          <input
            className={styles.input}
            type="text"
            placeholder="例: 三角筋前部"
            value={musclesSecondaryInput}
            onChange={(e) => setMusclesSecondaryInput(e.target.value)}
          />
        </div>
        <div className={styles.row}>
          <span className={styles.label}>説明</span>
          <textarea
            className={styles.input}
            placeholder="種目の説明を入力（任意）"
            value={descriptionInput}
            onChange={(e) => setDescriptionInput(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </div>
  )
}

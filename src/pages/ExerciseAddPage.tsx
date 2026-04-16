import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useExercises } from '../hooks/useExercises'
import styles from './ExerciseAddPage.module.css'

export default function ExerciseAddPage() {
  const { dateStr } = useParams<{ dateStr: string }>()
  const navigate = useNavigate()
  const { addExercise } = useExercises()

  const [categoryId, setCategoryId] = useState('')
  const [name, setName] = useState('')

  const canRegister = name.trim().length > 0 && categoryId.trim().length > 0

  function handleRegister() {
    if (!canRegister) return
    addExercise({ name: name.trim(), categoryId: categoryId.trim() })
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
          ＜
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
      </div>
    </div>
  )
}

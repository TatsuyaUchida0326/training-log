import { useEffect, useRef, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { useExercises } from '../../hooks/useExercises'
import { usePageHeader } from '../../contexts/PageHeaderContext'
import styles from './ExerciseAddPage.module.css'

export default function ExerciseAddPage() {
  const { dateStr } = useParams<{ dateStr: string }>()
  const navigate = useNavigate()
  const { addExercise } = useExercises()
  const { setHeader } = usePageHeader()

  const [categoryId, setCategoryId] = useState('')
  const [name, setName] = useState('')
  // 筋肉はカンマ区切り入力（例: "大胸筋, 上腕三頭筋"）→ 保存時に配列へ変換
  const [musclesInput, setMusclesInput] = useState('')
  const [musclesSecondaryInput, setMusclesSecondaryInput] = useState('')
  const [descriptionInput, setDescriptionInput] = useState('')

  // 部位と種目名が入力されている場合のみ登録ボタンを有効化
  const canRegister = name.trim().length > 0 && categoryId.trim().length > 0

  function handleRegister() {
    if (!canRegister) return
    addExercise({
      name: name.trim(),
      categoryId: categoryId.trim(),
      // 入力がある場合のみフィールドを含める（空文字入力は「情報なし」扱いにしない）
      muscles: musclesInput ? musclesInput.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      musclesSecondary: musclesSecondaryInput
        ? musclesSecondaryInput.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
      description: descriptionInput.trim() || undefined,
    })
    navigate(`/date/${dateStr}/exercises/select`)
  }

  /*
   * ヘッダーの「登録」から最新の入力値を読むための参照。
   * 入力のたびにヘッダーを作り直すと、useExercises が毎回新しい addExercise を返すため
   * 「setHeader → 再描画 → setHeader」のループになる。ハンドラだけ ref で差し替える。
   */
  const registerRef = useRef(handleRegister)
  useEffect(() => {
    registerRef.current = handleRegister
  })

  // 入力状態で「登録」の有効／無効が変わるため、canRegister を依存に含める
  useEffect(() => {
    setHeader({
      title: '種目を追加',
      centered: true,
      // navigate(-1) だと直接URLを開いたときアプリ外へ戻るため、遷移先を明示する
      leftElement: (
        <button
          className="header-icon-btn"
          aria-label="戻る"
          onClick={() => navigate(`/date/${dateStr}/exercises/select`)}
        >
          <ChevronLeft size={24} />
        </button>
      ),
      rightElement: (
        <button
          className="header-text-btn"
          disabled={!canRegister}
          onClick={() => registerRef.current()}
        >
          登録
        </button>
      ),
    })
  }, [setHeader, navigate, dateStr, canRegister])

  return (
    <div className={styles.page}>
      {/* フォーム：部位・種目名は必須、筋肉・補助筋・説明は任意 */}
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

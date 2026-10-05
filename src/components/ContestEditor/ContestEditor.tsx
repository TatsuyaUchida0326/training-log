import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import { useContests } from '../../hooks/useContests'
import { daysUntil, isValidContestDate } from '../../utils/contests'
import styles from './ContestEditor.module.css'

/** 大会・イベントの登録と編集。体組成画面のカードとして置く（保存はフックが受け持つ） */
export default function ContestEditor() {
  const { contests, addContest, updateContest, removeContest } = useContests()
  const [newName, setNewName] = useState('')
  const [newDate, setNewDate] = useState('')
  const today = new Date()

  // 日付の昇順。同じ日は登録順（sort は安定ソート）
  const sortedContests = useMemo(
    () => [...contests].sort((a, b) => a.date.localeCompare(b.date)),
    [contests],
  )

  // 年が5桁以上など、保存できない日付でボタンだけ押せる状態にしない
  const canAdd = newName.trim() !== '' && isValidContestDate(newDate)

  function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (!canAdd) return
    addContest(newName, newDate)
    setNewName('')
    setNewDate('')
  }

  function handleRemove(id: string, name: string) {
    if (window.confirm(`「${name}」を削除しますか？`)) removeContest(id)
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardLabel}>大会・イベント</div>

      {sortedContests.length > 0 && (
        // role="list" を明示するのは、Safari が list-style: none のリストを「リスト」として読み上げなくなるため
        <ul role="list" className={styles.list}>
          {sortedContests.map((contest) => (
            <li key={contest.id} className={styles.row}>
              {/* 名前は blur で保存する。空にされたら元に戻す。key に名前を含めるのは、保存で名前が変わったら入力欄を作り直すため */}
              <input
                key={`${contest.id}:${contest.name}`}
                className={`${styles.input} ${styles.nameInput}`}
                type="text"
                maxLength={30}
                aria-label={`${contest.name}の名前`}
                defaultValue={contest.name}
                onBlur={(event) => {
                  const trimmed = event.currentTarget.value.trim()
                  event.currentTarget.value = trimmed === '' ? contest.name : trimmed
                  if (trimmed !== '') updateContest(contest.id, { name: trimmed })
                }}
              />
              <div className={styles.rowMeta}>
                {/* 日付は選んだ時点で保存する。空にされても state が変わらないので元の日付に戻る */}
                <input
                  className={`${styles.input} ${styles.dateInput}`}
                  type="date"
                  aria-label={`${contest.name}の日付`}
                  value={contest.date}
                  onChange={(event) => {
                    if (event.target.value !== '') updateContest(contest.id, { date: event.target.value })
                  }}
                />
                {daysUntil(contest.date, today) < 0 && <span className={styles.ended}>終了</span>}
                <button
                  type="button"
                  className={styles.removeButton}
                  aria-label={`${contest.name}を削除`}
                  onClick={() => handleRemove(contest.id, contest.name)}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className={styles.addForm} onSubmit={handleAdd}>
        <input
          className={`${styles.input} ${styles.nameInput}`}
          type="text"
          maxLength={30}
          placeholder="例: ボディビル大会 2026"
          aria-label="追加する大会の名前"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
        />
        <input
          className={`${styles.input} ${styles.dateInput}`}
          type="date"
          aria-label="追加する大会の日付"
          value={newDate}
          onChange={(event) => setNewDate(event.target.value)}
        />
        <button type="submit" className={styles.addButton} disabled={!canAdd}>
          大会を追加
        </button>
      </form>
    </div>
  )
}

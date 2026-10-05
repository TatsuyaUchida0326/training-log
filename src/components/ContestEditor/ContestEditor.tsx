import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useContests } from '../../hooks/useContests'
import type { BodyRecord, BodySettings, Contest, GoalMetric } from '../../types'
import {
  MAX_CONTEST_DATE,
  MAX_CONTEST_NAME_LENGTH,
  MIN_CONTEST_DATE,
  daysUntil,
  isValidContestDate,
  isValidContestName,
} from '../../utils/contests'
import { latestMeasuredValues } from '../../utils/goals'
import ContestRow from './ContestRow'
import styles from './ContestEditor.module.css'

interface ContestEditorProps {
  /** 目標を入れたときのいまの値（起点の値）と、過ぎた大会を消すときの起点の引き継ぎに使う */
  bodyRecords: BodyRecord[]
  bodySettings: BodySettings
}

/**
 * 大会・イベントの登録と編集（一覧と追加フォーム）。カードの枠と見出しは置く側が描く。
 * 保存はフックが受け持つ。
 */
export default function ContestEditor({ bodyRecords, bodySettings }: ContestEditorProps) {
  const { contests, addContest, updateContest, setContestTarget, removeContest, fillMissingOrigins } = useContests()
  const [newName, setNewName] = useState('')
  const [newDate, setNewDate] = useState('')
  const [announcement, setAnnouncement] = useState('')
  // 日付欄にフォーカスがある間の並び（id の配列）。無いときは null で、日付の昇順
  const [pinnedIds, setPinnedIds] = useState<string[] | null>(null)
  const newNameRef = useRef<HTMLInputElement>(null)
  const today = new Date()

  const currentValues = useMemo(
    () => latestMeasuredValues(bodyRecords, bodySettings),
    [bodyRecords, bodySettings],
  )

  // 記録より先に目標を入れる人がいる。そのとき起点には日付だけが入り、値が無い。
  // 値を補わないと、最初の記録を同じ日に直したときに向きが変わってしまうので、記録が入ったときに埋める。
  // 埋めたあとは何もしない（埋める項目が無ければ保存しない）ので、contests の更新で繰り返さない。
  useEffect(() => {
    fillMissingOrigins(currentValues, new Date())
    // fillMissingOrigins は毎回作り直される関数なので依存に入れない（入れると毎回再実行される）
  }, [currentValues, contests])

  // 日付の昇順。同じ日は登録順（sort は安定ソート）
  const sortedContests = useMemo(
    () => [...contests].sort((a, b) => a.date.localeCompare(b.date)),
    [contests],
  )

  // 日付欄を触っている間は並びを固定する。保存のたびに行が入れ替わると、フォーカスが欄の先頭（年）に戻り、
  // キーボードで月や日を続けて進められなくなるため。離れた（blur）あとで日付順に並べ直す。
  // 固定中に削除された行は出さない
  const visibleContests: Contest[] = pinnedIds
    ? pinnedIds.flatMap((id) => contests.find((contest) => contest.id === id) ?? [])
    : sortedContests

  const canAdd = isValidContestName(newName) && isValidContestDate(newDate)

  function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (!canAdd) return
    addContest(newName, newDate)
    setAnnouncement(`「${newName.trim()}」を追加しました`)
    setNewName('')
    setNewDate('')
    newNameRef.current?.focus()
  }

  // 起点の日付に使うので、「今日」は保存する瞬間の日付を取る
  function handleTargetChange(contest: Contest, metric: GoalMetric, target: number) {
    setContestTarget(contest.id, metric, target, { today: new Date(), current: currentValues[metric] })
  }

  function handleRemove(contest: Contest) {
    if (!window.confirm(`「${contest.name}」を削除しますか？`)) return
    removeContest(contest.id, { records: bodyRecords, settings: bodySettings, today: new Date() })
    setAnnouncement(`「${contest.name}」を削除しました`)
    // 押したボタンが消えるとフォーカスが失われるので、追加フォームの名前欄へ移す
    newNameRef.current?.focus()
  }

  return (
    <>
      {visibleContests.length > 0 && (
        // role="list" を明示する理由は GoalCard.tsx を参照
        <ul role="list" className={styles.list}>
          {visibleContests.map((contest) => (
            <ContestRow
              key={contest.id}
              contest={contest}
              isEnded={daysUntil(contest.date, today) < 0}
              onUpdate={(changes) => updateContest(contest.id, changes)}
              onTargetChange={(metric, target) => handleTargetChange(contest, metric, target)}
              onRemove={() => handleRemove(contest)}
              onDateFocus={() => setPinnedIds(sortedContests.map((item) => item.id))}
              onDateBlur={() => setPinnedIds(null)}
            />
          ))}
        </ul>
      )}

      <form className={styles.addForm} onSubmit={handleAdd}>
        <input
          ref={newNameRef}
          className={`${styles.input} ${styles.nameInput}`}
          type="text"
          maxLength={MAX_CONTEST_NAME_LENGTH}
          placeholder="例: ボディビル大会 2026"
          aria-label="追加する大会の名前"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
        />
        <input
          className={`${styles.input} ${styles.dateInput}`}
          type="date"
          min={MIN_CONTEST_DATE}
          max={MAX_CONTEST_DATE}
          aria-label="追加する大会の日付"
          value={newDate}
          onChange={(event) => setNewDate(event.target.value)}
        />
        <button type="submit" className={styles.addButton} disabled={!canAdd}>
          大会を追加
        </button>
      </form>

      {/* 追加・削除の結果を読み上げる領域。見た目には出さない。常に描くのは、あとから現れた領域は読み上げられないことがあるため */}
      <div role="status" className={styles.visuallyHidden}>
        {announcement}
      </div>
    </>
  )
}

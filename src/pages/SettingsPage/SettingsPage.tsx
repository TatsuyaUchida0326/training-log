import { useEffect, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExercises } from '../../hooks/useExercises'
import { useSettings } from '../../hooks/useSettings'
import { useTrainingRecords } from '../../hooks/useTrainingRecords'
import { usePageHeader } from '../../contexts/PageHeaderContext'
import { buildBackup, buildBackupFileName, parseBackup, restoreBackup } from '../../utils/backup'
import { applySampleData } from '../../utils/sampleData'
import { confirmAndResetAllData } from '../../utils/storage'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
  const { settings, updateRequiredSets, updateDefaultSets, updateRequiredExercises, updateWeightUnit } = useSettings()
  const { exercises } = useExercises()
  const { records } = useTrainingRecords()
  const { setHeader } = usePageHeader()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    setHeader({ title: '設定', centered: true })
  }, [setHeader])

  // 記録がある人にサンプルデータを見せない。軽く押しただけで自分の記録が置き換わるのを防ぐ
  const hasRecords = records.length > 0

  function handleApplySampleData() {
    if (window.confirm('サンプルデータを入れますか？\n現在の記録は置き換わります。')) {
      applySampleData(exercises, new Date())
      window.location.reload()
    }
  }

  function handleExportData() {
    const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: 'application/json' })
    const objectUrl = URL.createObjectURL(blob)
    const downloadLink = document.createElement('a')
    downloadLink.href = objectUrl
    downloadLink.download = buildBackupFileName()
    downloadLink.click()
    URL.revokeObjectURL(objectUrl)
  }

  function handleSelectBackupFile() {
    fileInputRef.current?.click()
  }

  async function handleBackupFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return
    const text = await file.text()
    // 同じファイルを続けて選べるように値を空へ戻す（File はすでに読み終えているので影響しない）
    input.value = ''

    const backup = parseBackup(text)
    if (!backup) {
      window.alert('このファイルは Strength Log のバックアップではないようです。')
      return
    }
    if (!window.confirm('バックアップから復元しますか？\n現在のデータはすべて置き換わります。')) return
    restoreBackup(backup)
    window.location.reload()
  }

  return (
    <div className={styles.page}>
      {/* 初めて使う人が最初に目に入る位置に取扱説明書への入口を置く */}
      <div className={`${styles.section} ${styles.guideSection}`}>
        <div className={styles.row}>
          <span className={styles.label}>使い方</span>
          <button className={styles.sampleButton} onClick={() => navigate('/settings/guide')}>
            開く
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>記録設定</p>

        <div className={styles.row}>
          <span className={styles.label}>継続達成種目数</span>
          <select
            className={styles.select}
            value={settings.requiredExercises}
            onChange={(e) => updateRequiredExercises(Number(e.target.value))}
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>継続達成セット数</span>
          <select
            className={styles.select}
            value={settings.requiredSets}
            onChange={(e) => updateRequiredSets(Number(e.target.value))}
          >
            {Array.from({ length: 8 }, (_, i) => i + 3).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>デフォルトセット数</span>
          <select
            className={styles.select}
            value={settings.defaultSets}
            onChange={(e) => updateDefaultSets(Number(e.target.value))}
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>重量単位</span>
          <div className={styles.toggle}>
            <button
              className={`${styles.toggleButton} ${settings.weightUnit === 'kg' ? styles.active : ''}`}
              onClick={() => updateWeightUnit('kg')}
            >
              kg
            </button>
            <button
              className={`${styles.toggleButton} ${settings.weightUnit === 'lbs' ? styles.active : ''}`}
              onClick={() => updateWeightUnit('lbs')}
            >
              lbs
            </button>
          </div>
        </div>
      </div>

      <div className={`${styles.section} ${styles.dataSection}`}>
        <p className={styles.sectionTitle}>データ管理</p>
        {!hasRecords && (
          <>
            <p className={styles.sectionNote}>
              アプリの動きを試すための約1か月分の記録を入れます。元に戻すには「全データをリセット」を使ってください。
            </p>
            <div className={styles.row}>
              <span className={styles.label}>サンプルデータを入れる</span>
              <button className={styles.sampleButton} onClick={handleApplySampleData}>
                入れる
              </button>
            </div>
          </>
        )}
        <div className={styles.row}>
          <span className={styles.label}>データを書き出す</span>
          <button className={styles.sampleButton} onClick={handleExportData}>
            書き出す
          </button>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>バックアップから復元</span>
          <button className={styles.sampleButton} onClick={handleSelectBackupFile}>
            ファイルを選ぶ
          </button>
          <input
            ref={fileInputRef}
            className={styles.hiddenFileInput}
            type="file"
            accept="application/json"
            onChange={handleBackupFileChange}
            aria-label="バックアップファイル"
          />
        </div>
        <div className={styles.row}>
          <span className={styles.label}>全データをリセット</span>
          <button className={styles.resetButton} onClick={confirmAndResetAllData}>
            全データをリセット
          </button>
        </div>
      </div>
    </div>
  )
}

import { useEffect } from 'react'
import { useExercises } from '../../hooks/useExercises'
import { useSettings } from '../../hooks/useSettings'
import { usePageHeader } from '../../contexts/PageHeaderContext'
import { applySampleData } from '../../utils/sampleData'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
  const { settings, updateRequiredSets, updateDefaultSets, updateRequiredExercises, updateWeightUnit } = useSettings()
  const { exercises } = useExercises()
  const { setHeader } = usePageHeader()
  useEffect(() => {
    setHeader({ title: '設定', centered: true })
  }, [setHeader])

  function handleApplySampleData() {
    if (window.confirm('サンプルデータを入れますか？\n現在の記録は置き換わります。')) {
      applySampleData(exercises, new Date())
      window.location.reload()
    }
  }

  function handleResetAllData() {
    if (window.confirm('本当にすべてのデータを削除しますか？\nこの操作は元に戻せません。')) {
      localStorage.clear() // このオリジンの全キーを消す（記録・種目・体組成・設定すべて）
      window.location.reload()
    }
  }

  return (
    <div className={styles.page}>
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
        <p className={styles.sectionNote}>
          アプリの動きを試すための約1か月分の記録を入れます。元に戻すには「全データをリセット」を使ってください。
        </p>
        <div className={styles.row}>
          <span className={styles.label}>サンプルデータを入れる</span>
          <button className={styles.sampleButton} onClick={handleApplySampleData}>
            入れる
          </button>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>全データをリセット</span>
          <button className={styles.resetButton} onClick={handleResetAllData}>
            全データをリセット
          </button>
        </div>
      </div>
    </div>
  )
}

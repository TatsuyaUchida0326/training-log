import { useEffect } from 'react'
import { useSettings } from '../hooks/useSettings'
import { usePageHeader } from '../contexts/PageHeaderContext'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
  const { settings, updateDefaultSets, updateTrainingDefaultSets, updateWeightUnit } = useSettings()
  const { setHeader } = usePageHeader()
  useEffect(() => {
    setHeader({ title: '初期値設定', centered: true })
  }, [setHeader])

  return (
    <div className={styles.page}>
      <div className={styles.section}>
        <p className={styles.sectionTitle}>記録設定</p>

        <div className={styles.row}>
          <span className={styles.label}>継続達成セット数</span>
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
          <span className={styles.label}>デフォルトセット数</span>
          <select
            className={styles.select}
            value={settings.trainingDefaultSets}
            onChange={(e) => updateTrainingDefaultSets(Number(e.target.value))}
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
    </div>
  )
}

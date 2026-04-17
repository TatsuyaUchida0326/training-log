import { useNavigate } from 'react-router-dom'
import { useBodySettings } from '../hooks/useBodySettings'
import styles from './BodySettingsPage.module.css'

export default function BodySettingsPage() {
  const navigate = useNavigate()
  const { settings, updateSettings } = useBodySettings()

  function handleBlur(field: 'height' | 'targetWeight', raw: string) {
    const val = parseFloat(raw)
    if (!isNaN(val) && val > 0) {
      updateSettings({ [field]: val })
    } else {
      updateSettings({ [field]: 0 })
    }
  }

  return (
    <div className={styles.page}>
      {/* ヘッダー */}
      <div className={styles.bar}>
        <button
          className={styles.backButton}
          onClick={() => navigate('/body')}
          aria-label="戻る"
        >
          ＜
        </button>
        <span className={styles.barTitle}>目標体重設定</span>
        <span className={styles.barSpacer} />
      </div>

      <div className={styles.content}>
        {/* 身長 */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>基本情報</div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>身長</span>
            <div className={styles.rowInput}>
              <input
                className={styles.numInput}
                type="number"
                min="0"
                step="0.1"
                defaultValue={settings.height > 0 ? settings.height : ''}
                placeholder="0.0"
                onBlur={(e) => handleBlur('height', e.target.value)}
                key={`h-${settings.height}`}
              />
              <span className={styles.unit}>cm</span>
            </div>
          </div>
        </div>

        {/* 目標体重 */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>目標</div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>目標体重</span>
            <div className={styles.rowInput}>
              <input
                className={styles.numInput}
                type="number"
                min="0"
                step="0.1"
                defaultValue={settings.targetWeight > 0 ? settings.targetWeight : ''}
                placeholder="0.0"
                onBlur={(e) => handleBlur('targetWeight', e.target.value)}
                key={`tw-${settings.targetWeight}`}
              />
              <span className={styles.unit}>kg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

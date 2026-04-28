import { useEffect } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { usePageHeader } from '../../contexts/PageHeaderContext'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
  const { settings, updateDefaultSets, updateTrainingDefaultSets, updateRequiredExercises, updateWeightUnit } = useSettings()
  const { setHeader } = usePageHeader()
  useEffect(() => {
    setHeader({ title: '初期値設定', centered: true })
  }, [setHeader])

  // 全データを削除してアプリを初期状態に戻す処理
  function handleResetAllData() {
    // ネイティブダイアログで削除前にユーザーへ確認を求める
    if (window.confirm('本当にすべてのデータを削除しますか？\nこの操作は元に戻せません。')) {
      localStorage.clear() // トレーニング記録・種目リスト・体組成・設定の全データを削除
      window.location.reload() // ページをリロードしてアプリを初期状態で再起動
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
            value={settings.defaultSets}
            onChange={(e) => updateDefaultSets(Number(e.target.value))}
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

      {/* データ管理セクション：他の設定セクションと視覚的に分離して配置 */}
      <div className={`${styles.section} ${styles.dangerSection}`}>
        <p className={styles.sectionTitle}>データ管理</p>
        <div className={styles.row}>
          {/* ラベルとリセットボタンを左右に配置 */}
          <span className={styles.label}>全データをリセット</span>
          {/* クリックで handleResetAllData を呼び出す破壊的操作ボタン */}
          <button className={styles.resetButton} onClick={handleResetAllData}>
            全データをリセット
          </button>
        </div>
      </div>
    </div>
  )
}

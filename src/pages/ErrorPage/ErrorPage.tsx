import { useRouteError } from 'react-router-dom'
import { confirmAndResetAllData } from '../../utils/storage'
import styles from './ErrorPage.module.css'

/** ルーターが拾えなかった例外の最後の受け皿。ここに来ても自力で立て直せる道を残す */
export default function ErrorPage() {
  const error = useRouteError()

  function handleReload() {
    window.location.reload()
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>読み込めませんでした</h1>
        <p className={styles.message}>
          データの読み込み中に問題が起きました。まず再読み込みを試してください。
          <br />
          それでも開けないときは、データを初期化すると使えるようになります（記録は消えます）。
        </p>
        <div className={styles.actions}>
          <button className={styles.primaryButton} onClick={handleReload}>
            アプリを再読み込み
          </button>
          <button className={styles.dangerButton} onClick={confirmAndResetAllData}>
            データを初期化して再読み込み
          </button>
        </div>
        {/* 問い合わせのときの手がかりになるので、原因を1行だけ控えめに出す */}
        <p className={styles.detail}>{describeError(error)}</p>
      </div>
    </div>
  )
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return '原因は特定できませんでした'
}

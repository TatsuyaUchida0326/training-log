/**
 * localStorage の読み書きを1箇所にまとめる。
 *
 * 配布先の端末では、保存データが壊れていること（手で編集された・書き込み途中で切れた）を
 * 前提にする。壊れた値をそのまま JSON.parse して例外を投げると画面全体が落ちるため、
 * 読み込み時に必ず形を検証し、期待と違えば退避してから既定値で始める。
 */

const BROKEN_KEY_SUFFIX = 'broken'

const SAVE_FAILED_MESSAGE = '保存できませんでした。ブラウザの空き容量を確認してください。'

/** オブジェクト（配列・null を除く）かどうか */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 配列かどうかだけを見る。要素の中身までは検証しない。
 * 「配列であるべき場所に配列以外が入っていたら既定値に戻す」ための最小限の検証。
 */
export function isArrayOf<T>(value: unknown): value is T[] {
  return Array.isArray(value)
}

/** 保存データを読むだけ。壊れていても退避せず null を返す（書き出しなど非破壊の用途向け） */
export function peekStoredValue<T>(
  key: string,
  isValid: (value: unknown) => value is T,
): T | null {
  const raw = localStorage.getItem(key)
  if (raw === null) return null
  const parsed = parseJson(raw)
  if (parsed === undefined || !isValid(parsed)) return null
  return parsed
}

/**
 * 保存データを読む。壊れていた場合は元の文字列を `<キー>-broken-<ISO日時>` に移し、null を返す。
 * 呼び出し側は null を「値が無い」と同じに扱えばよい。捨てずに残すのは後から救い出せるようにするため。
 */
export function loadStoredValue<T>(
  key: string,
  isValid: (value: unknown) => value is T,
): T | null {
  const raw = localStorage.getItem(key)
  if (raw === null) return null
  const parsed = parseJson(raw)
  if (parsed === undefined || !isValid(parsed)) {
    quarantineStoredValue(key, raw)
    return null
  }
  return parsed
}

/** 値を JSON にして保存する。容量超過などで失敗したら利用者に伝える（握りつぶさない） */
export function writeStoredValue(key: string, value: unknown): void {
  writeStoredText(key, JSON.stringify(value))
}

/** 確認のうえ、このオリジンの保存データをすべて消して読み込み直す */
export function confirmAndResetAllData(): void {
  if (!window.confirm('本当にすべてのデータを削除しますか？\nこの操作は元に戻せません。')) return
  localStorage.clear() // 記録・種目・体組成・設定すべて
  window.location.reload()
}

/** JSON として読めなければ undefined（null は JSON の値として有効なので区別する） */
function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
}

/** 壊れた値を別キーに移す。退避自体に失敗したときは元の値を残す（消すより残すほうが安全） */
function quarantineStoredValue(key: string, raw: string): void {
  const brokenKey = `${key}-${BROKEN_KEY_SUFFIX}-${new Date().toISOString()}`
  if (!writeStoredText(brokenKey, raw)) return
  localStorage.removeItem(key)
}

/** 保存できたら true。文字列をそのまま書く（退避では元の文字列を加工せずに残したい） */
function writeStoredText(key: string, text: string): boolean {
  try {
    localStorage.setItem(key, text)
    return true
  } catch {
    window.alert(SAVE_FAILED_MESSAGE)
    return false
  }
}

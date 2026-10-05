/** 小数1桁に丸める（68.26 → 68.3）。画面に出す値と、その値どうしの計算に使う */
export function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

/** localStorage の値は型どおりとは限らない。文字列・null・NaN などで計算が壊れないよう、数値として使えるかを見る */
export function isUsableNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** 0 より大きい有限の数か。目標のように「未設定は 0」の値が、設定されていると言えるかの判定 */
export function isPositiveNumber(value: unknown): value is number {
  return isUsableNumber(value) && value > 0
}

/** 入力欄の文字を正の数にする。空欄・0 以下・数値でないものは 0（未設定・未入力）として扱う */
export function parsePositiveNumber(raw: string): number {
  const value = parseFloat(raw)
  return !isNaN(value) && value > 0 ? value : 0
}

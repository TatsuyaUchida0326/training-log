/** 小数1桁に丸める（68.26 → 68.3）。画面に出す値と、その値どうしの計算に使う */
export function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

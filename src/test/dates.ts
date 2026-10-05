/** 現地時刻の Date。month は 1 始まりで書く（new Date の 0 始まりとの取り違えを避ける） */
export function localDate(
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0,
  second = 0,
): Date {
  return new Date(year, month - 1, day, hour, minute, second)
}

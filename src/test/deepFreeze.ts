/** 渡した値を書き換えようとすると例外になる凍結コピー（純粋関数が入力を書き換えないことの確認用） */
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

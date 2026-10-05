import { describe, it, expect } from 'vitest'
import { roundToOneDecimal } from './number'

describe('roundToOneDecimal', () => {
  it('小数2桁目が 4 以下なら切り捨てる（3.24 → 3.2）', () => {
    expect(roundToOneDecimal(3.24)).toBe(3.2)
  })

  it('小数2桁目が 5 以上なら切り上げる（3.25 → 3.3、3.26 → 3.3）', () => {
    expect(roundToOneDecimal(3.25)).toBe(3.3)
    expect(roundToOneDecimal(3.26)).toBe(3.3)
  })

  it('引き算の誤差が出ない（68.2 - 65 は 3.2000000000000028 → 3.2）', () => {
    expect(68.2 - 65).not.toBe(3.2) // 前提: 素の引き算には誤差がある
    expect(roundToOneDecimal(68.2 - 65)).toBe(3.2)
  })

  it('筋肉量(%)の換算値を丸める（68.2 × 36% = 24.552 → 24.6）', () => {
    expect(roundToOneDecimal(68.2 * 0.36)).toBe(24.6)
  })

  it('65.05 は 65.1（素直な Math.round(v * 10) / 10 の結果）', () => {
    expect(roundToOneDecimal(65.05)).toBe(65.1)
  })

  it('既に小数1桁以下の値は変わらない（0・整数・68.2）', () => {
    expect(roundToOneDecimal(0)).toBe(0)
    expect(roundToOneDecimal(70)).toBe(70)
    expect(roundToOneDecimal(68.2)).toBe(68.2)
  })
})

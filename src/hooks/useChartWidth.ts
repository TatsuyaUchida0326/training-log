import { useEffect, useRef, useState } from 'react'

/**
 * グラフを枠の幅ちょうどに描くための計測フック。
 *
 * 枠より広く描いて横スクロールさせると、左端にある縦軸の目盛りがスクロールで隠れ、
 * さらにスクロールバーを出していないため続きがあることにも気づけない。
 * 枠に合わせて描けば、縦軸も最新の記録も常に見える。
 *
 * ResizeObserver が無い環境（jsdom でのテストなど）では計測できないので、
 * 呼び出し側が渡した既定値をそのまま使う。
 */
export function useChartWidth<T extends HTMLElement>(fallbackWidth: number) {
  const ref = useRef<T>(null)
  const [measuredWidth, setMeasuredWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      setMeasuredWidth(entries[0]?.contentRect.width ?? 0)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, measuredWidth > 0 ? Math.round(measuredWidth) : fallbackWidth] as const
}

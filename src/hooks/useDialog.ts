import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * モーダルダイアログのフォーカス管理フック。
 *
 * - マウント時にダイアログ本体へフォーカスを移す
 * - Escape で閉じる、Tab/Shift+Tab はダイアログ内で循環させる（フォーカストラップ）
 * - アンマウント時、開く前にフォーカスしていた要素へフォーカスを戻す
 *
 * 呼び出し側は返した ref を、ダイアログ本体の要素に `tabIndex={-1}` と合わせて渡すこと。
 * tabIndex が無いとその要素はフォーカス不可のままで、マウント時の focus() が効かない。
 *
 * onClose は ref で保持し、effect の依存配列を空にしてマウント時の1回だけ登録する。
 * 依存に onClose を入れると親の再描画のたびに effect が再実行され、
 * そのたびに本体へフォーカスが戻ってしまう（入力中のフォーカスを奪う不具合になる）ため。
 */
export function useDialog<T extends HTMLElement>(onClose: () => void): RefObject<T> {
  const ref = useRef<T>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    // 閉じたときに戻す先として、開く直前にフォーカスされていた要素を控えておく
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (!dialog) return

      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }

      if (e.key !== 'Tab') return

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (focusable.length === 0) {
        e.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (e.shiftKey) {
        if (active === dialog || active === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    // dialog 自身ではなく document に付ける。フォーカスされていた要素が削除されて
    // フォーカスが document.body 等へ移った場合でも Escape を拾えるようにするため
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // 戻す先がまだ document 上に存在するときだけフォーカスを戻す
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [])

  return ref
}

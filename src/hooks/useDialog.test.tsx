import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { useDialog } from './useDialog'

/**
 * useDialog(onClose) の仕様:
 * - マウント時にダイアログ本体（tabIndex=-1）へフォーカスを移す
 * - Escape で onClose を呼ぶ
 * - Tab / Shift+Tab でフォーカスがダイアログ内を循環する
 * - アンマウント時、開く直前にフォーカスしていた要素へフォーカスを戻す
 */

function DialogBody({ onClose }: { onClose: () => void }) {
  const ref = useDialog<HTMLDivElement>(onClose)
  return (
    <div ref={ref} tabIndex={-1} data-testid="dialog-body">
      <button>First</button>
      <button>Middle</button>
      <button>Last</button>
    </div>
  )
}

/** 「ボタンを押してダイアログを開く／Escapeで閉じる」までを再現するラッパー */
function OpenCloseHarness() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && <DialogBody onClose={() => setOpen(false)} />}
    </div>
  )
}

describe('useDialog', () => {
  it('マウント時にダイアログ本体（tabIndex=-1 の要素）へフォーカスが移る', () => {
    render(<DialogBody onClose={vi.fn()} />)
    expect(screen.getByTestId('dialog-body')).toHaveFocus()
  })

  it('Escapeキーで onClose が呼ばれる', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<DialogBody onClose={onClose} />)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('最後の要素で Tab を押すと最初の要素へフォーカスが循環する', async () => {
    const user = userEvent.setup()
    render(<DialogBody onClose={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    buttons[2].focus()
    await user.tab()
    expect(buttons[0]).toHaveFocus()
  })

  it('最初の要素で Shift+Tab を押すと最後の要素へフォーカスが循環する', async () => {
    const user = userEvent.setup()
    render(<DialogBody onClose={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    buttons[0].focus()
    await user.tab({ shift: true })
    expect(buttons[2]).toHaveFocus()
  })

  it('マウント直後（本体にフォーカス）で Shift+Tab を押すと最後の要素へフォーカスが移る', async () => {
    const user = userEvent.setup()
    render(<DialogBody onClose={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    // マウント直後はダイアログ本体自身にフォーカスがある
    expect(screen.getByTestId('dialog-body')).toHaveFocus()
    await user.tab({ shift: true })
    expect(buttons[2]).toHaveFocus()
  })

  it('Tab を押しても中間の要素からダイアログの外へは出ない', async () => {
    const user = userEvent.setup()
    render(<DialogBody onClose={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    buttons[0].focus()
    await user.tab()
    expect(buttons[1]).toHaveFocus()
    await user.tab()
    expect(buttons[2]).toHaveFocus()
  })

  it('アンマウント時、開く直前にフォーカスしていた要素へフォーカスが戻る', async () => {
    const user = userEvent.setup()
    render(<OpenCloseHarness />)
    const openButton = screen.getByRole('button', { name: 'Open' })
    openButton.focus()
    await user.click(openButton)
    expect(screen.getByTestId('dialog-body')).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByTestId('dialog-body')).not.toBeInTheDocument()
    expect(openButton).toHaveFocus()
  })

  it('フォーカスを戻す先の要素がすでに document から無くなっていても例外にならない', async () => {
    const user = userEvent.setup()

    function TransientOpenerHarness() {
      const [open, setOpen] = useState(false)
      const [showOpener, setShowOpener] = useState(true)
      return (
        <div>
          {showOpener && <button onClick={() => setOpen(true)}>Open</button>}
          {open && <DialogBody onClose={() => setOpen(false)} />}
          <button onClick={() => setShowOpener(false)}>RemoveOpener</button>
        </div>
      )
    }

    render(<TransientOpenerHarness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.click(screen.getByRole('button', { name: 'RemoveOpener' }))

    let didThrow = false
    try {
      await user.keyboard('{Escape}')
    } catch {
      didThrow = true
    }
    expect(didThrow).toBe(false)
    expect(screen.queryByTestId('dialog-body')).not.toBeInTheDocument()
  })
})

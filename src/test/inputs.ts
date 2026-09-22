import { screen } from '@testing-library/react'

/** 記録画面の数値欄は重さも回数も placeholder が "0" なので inputMode で見分ける */
function numberInputs(inputMode: 'decimal' | 'numeric'): HTMLInputElement[] {
  return screen
    .getAllByPlaceholderText('0')
    .filter((element) => (element as HTMLInputElement).inputMode === inputMode) as HTMLInputElement[]
}

export function weightInputs(): HTMLInputElement[] {
  return numberInputs('decimal')
}

export function repsInputs(): HTMLInputElement[] {
  return numberInputs('numeric')
}

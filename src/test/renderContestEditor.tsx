import { render } from '@testing-library/react'
import ContestEditor from '../components/ContestEditor/ContestEditor'
import { DEFAULT_BODY_SETTINGS } from '../hooks/useBodySettings'
import type { BodyRecord, BodySettings } from '../types'

/** 体組成の記録と設定は既定では空・既定値。目標の欄に関係しないテストは引数なしで描画できる */
export function renderContestEditor(
  props: { bodyRecords?: BodyRecord[]; bodySettings?: BodySettings } = {},
) {
  const { bodyRecords = [], bodySettings = DEFAULT_BODY_SETTINGS } = props
  return render(<ContestEditor bodyRecords={bodyRecords} bodySettings={bodySettings} />)
}

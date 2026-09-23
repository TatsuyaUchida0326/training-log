import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import SettingsPage from './SettingsPage'
import { seedRecords } from '../../test/seed'
import { BODY_RECORDS_KEY, EXERCISES_KEY, RECORDS_KEY } from '../../test/storageKeys'
import { buildBackup } from '../../utils/backup'
import type { TrainingRecord } from '../../types'

const mockUpdateRequiredSets = vi.fn()
const mockUpdateDefaultSets = vi.fn()
const mockUpdateRequiredExercises = vi.fn()
const mockUpdateWeightUnit = vi.fn()

// useSettings フックだけを差し替える。DEFAULT_SETTINGS は書き出しの既定値として実物が要る
vi.mock('../../hooks/useSettings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../hooks/useSettings')>()),
  useSettings: () => ({
    settings: { requiredSets: 3, defaultSets: 3, weightUnit: 'kg', requiredExercises: 3 },
    updateRequiredSets: mockUpdateRequiredSets,
    updateDefaultSets: mockUpdateDefaultSets,
    updateRequiredExercises: mockUpdateRequiredExercises,
    updateWeightUnit: mockUpdateWeightUnit,
  }),
}))

/** 「使い方」からの画面遷移を確かめられるよう、ルーター付きで描画する */
function renderSettingsPage() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/guide" element={<div data-testid="guide-page" />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('「継続達成種目数」ラベルが表示される', () => {
    renderSettingsPage()
    expect(screen.getByText('継続達成種目数')).toBeInTheDocument()
  })

  it('「継続達成セット数」ラベルが表示される', () => {
    renderSettingsPage()
    expect(screen.getByText('継続達成セット数')).toBeInTheDocument()
  })

  it('「デフォルトセット数」ラベルが表示される', () => {
    renderSettingsPage()
    expect(screen.getByText('デフォルトセット数')).toBeInTheDocument()
  })

  it('「重量単位」ラベルが表示される', () => {
    renderSettingsPage()
    expect(screen.getByText('重量単位')).toBeInTheDocument()
  })

  it('selectが3つ表示される', () => {
    renderSettingsPage()
    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(3)
  })

  it('継続達成種目数selectが1〜10の選択肢を持つ', () => {
    renderSettingsPage()
    const selects = screen.getAllByRole('combobox')
    const options = Array.from((selects[0] as HTMLSelectElement).options).map(
      (o) => Number(o.value)
    )
    expect(options).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('継続達成セット数selectが3〜10の選択肢を持つ', () => {
    renderSettingsPage()
    const selects = screen.getAllByRole('combobox')
    const options = Array.from((selects[1] as HTMLSelectElement).options).map(
      (o) => Number(o.value)
    )
    expect(options).toEqual([3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('デフォルトセット数selectが1〜10の選択肢を持つ', () => {
    renderSettingsPage()
    const selects = screen.getAllByRole('combobox')
    const options = Array.from((selects[2] as HTMLSelectElement).options).map(
      (o) => Number(o.value)
    )
    expect(options).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('継続達成種目数selectの変更でupdateRequiredExercisesが呼ばれる', async () => {
    renderSettingsPage()
    const selects = screen.getAllByRole('combobox')
    await userEvent.selectOptions(selects[0], '5')
    expect(mockUpdateRequiredExercises).toHaveBeenCalledWith(5)
  })

  it('継続達成セット数selectの変更でupdateRequiredSetsが呼ばれる', async () => {
    renderSettingsPage()
    const selects = screen.getAllByRole('combobox')
    await userEvent.selectOptions(selects[1], '5')
    expect(mockUpdateRequiredSets).toHaveBeenCalledWith(5)
  })

  it('デフォルトセット数selectの変更でupdateDefaultSetsが呼ばれる', async () => {
    renderSettingsPage()
    const selects = screen.getAllByRole('combobox')
    await userEvent.selectOptions(selects[2], '4')
    expect(mockUpdateDefaultSets).toHaveBeenCalledWith(4)
  })

  it('kg・lbsボタンが表示される', () => {
    renderSettingsPage()
    expect(screen.getByRole('button', { name: 'kg' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'lbs' })).toBeInTheDocument()
  })

  it('kgボタンクリックでupdateWeightUnit("kg")が呼ばれる', async () => {
    renderSettingsPage()
    await userEvent.click(screen.getByRole('button', { name: 'kg' }))
    expect(mockUpdateWeightUnit).toHaveBeenCalledWith('kg')
  })

  it('lbsボタンクリックでupdateWeightUnit("lbs")が呼ばれる', async () => {
    renderSettingsPage()
    await userEvent.click(screen.getByRole('button', { name: 'lbs' }))
    expect(mockUpdateWeightUnit).toHaveBeenCalledWith('lbs')
  })

  it('継続達成種目数を変更すると更新関数が呼ばれる', async () => {
    renderSettingsPage()
    const selects = screen.getAllByRole('combobox')
    await userEvent.selectOptions(selects[0], '7')
    expect(mockUpdateRequiredExercises).toHaveBeenCalledWith(7)
  })

  it('デフォルトセット数を変更すると更新関数が呼ばれる', async () => {
    renderSettingsPage()
    const selects = screen.getAllByRole('combobox')
    await userEvent.selectOptions(selects[2], '5')
    expect(mockUpdateDefaultSets).toHaveBeenCalledWith(5)
  })
})

describe('SettingsPage — データ管理セクション', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>
  let localStorageClearSpy: ReturnType<typeof vi.spyOn>
  let reloadMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    // jsdom ではインスタンスメソッドのスパイが効かないため Storage.prototype を対象にする
    localStorageClearSpy = vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => {})
    reloadMock = vi.fn()
    // window.location は読み取り専用のため Object.defineProperty で上書きする
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })
  })

  afterEach(() => {
    confirmSpy.mockRestore()
    localStorageClearSpy.mockRestore()
  })

  it('「全データをリセット」ボタンが表示される', () => {
    renderSettingsPage()
    expect(screen.getByRole('button', { name: '全データをリセット' })).toBeInTheDocument()
  })

  it('ボタンクリックで window.confirm が呼ばれる（メッセージ内容を検証）', async () => {
    renderSettingsPage()
    await userEvent.click(screen.getByRole('button', { name: '全データをリセット' }))
    expect(confirmSpy).toHaveBeenCalledWith(
      '本当にすべてのデータを削除しますか？\nこの操作は元に戻せません。'
    )
  })

  it('confirm が true を返したとき localStorage.clear が呼ばれる', async () => {
    confirmSpy.mockReturnValue(true)
    renderSettingsPage()
    await userEvent.click(screen.getByRole('button', { name: '全データをリセット' }))
    expect(localStorageClearSpy).toHaveBeenCalledTimes(1)
  })

  it('confirm が true を返したとき window.location.reload が呼ばれる', async () => {
    confirmSpy.mockReturnValue(true)
    renderSettingsPage()
    await userEvent.click(screen.getByRole('button', { name: '全データをリセット' }))
    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it('confirm が false を返したとき localStorage.clear が呼ばれない', async () => {
    confirmSpy.mockReturnValue(false)
    renderSettingsPage()
    await userEvent.click(screen.getByRole('button', { name: '全データをリセット' }))
    expect(localStorageClearSpy).not.toHaveBeenCalled()
  })

  it('confirm が false を返したとき window.location.reload が呼ばれない', async () => {
    confirmSpy.mockReturnValue(false)
    renderSettingsPage()
    await userEvent.click(screen.getByRole('button', { name: '全データをリセット' }))
    expect(reloadMock).not.toHaveBeenCalled()
  })
})

describe('SettingsPage — サンプルデータ', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>
  let reloadMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.clear()
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    // window.location は読み取り専用のため Object.defineProperty で上書きする
    reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })
  })

  afterEach(() => {
    confirmSpy.mockRestore()
    localStorage.clear()
  })

  it('「サンプルデータを入れる」ラベルと「入れる」ボタンが表示される', () => {
    renderSettingsPage()
    expect(screen.getByText('サンプルデータを入れる')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '入れる' })).toBeInTheDocument()
  })

  it('セクションの説明文が表示される', () => {
    renderSettingsPage()
    expect(
      screen.getByText(
        'アプリの動きを試すための約1か月分の記録を入れます。元に戻すには「全データをリセット」を使ってください。'
      )
    ).toBeInTheDocument()
  })

  it('ボタンクリックで window.confirm が呼ばれる（メッセージ内容を検証）', async () => {
    renderSettingsPage()
    await userEvent.click(screen.getByRole('button', { name: '入れる' }))
    expect(confirmSpy).toHaveBeenCalledWith(
      'サンプルデータを入れますか？\n現在の記録は置き換わります。'
    )
  })

  it('confirm が true を返したとき記録が localStorage に書き込まれる', async () => {
    confirmSpy.mockReturnValue(true)
    renderSettingsPage()
    await userEvent.click(screen.getByRole('button', { name: '入れる' }))

    const stored = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '[]')
    expect(stored.length).toBeGreaterThan(0)
  })

  it('confirm が true を返したとき window.location.reload が呼ばれる', async () => {
    confirmSpy.mockReturnValue(true)
    renderSettingsPage()
    await userEvent.click(screen.getByRole('button', { name: '入れる' }))
    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it('confirm が false を返したとき記録が書き込まれない', async () => {
    confirmSpy.mockReturnValue(false)
    renderSettingsPage()
    await userEvent.click(screen.getByRole('button', { name: '入れる' }))
    expect(localStorage.getItem(RECORDS_KEY)).toBeNull()
  })

  it('confirm が false を返したとき window.location.reload が呼ばれない', async () => {
    confirmSpy.mockReturnValue(false)
    renderSettingsPage()
    await userEvent.click(screen.getByRole('button', { name: '入れる' }))
    expect(reloadMock).not.toHaveBeenCalled()
  })
})

const RECORD: TrainingRecord = {
  id: 'r1',
  date: '2026-09-20',
  exerciseId: 'bench-press',
  sets: [{ id: 's1', weight: 60, reps: 10, memo: '' }],
}

describe('SettingsPage — サンプルデータは記録がある人には見せない', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('記録が1件もないときは「入れる」ボタンが表示される', () => {
    renderSettingsPage()
    expect(screen.getByRole('button', { name: '入れる' })).toBeInTheDocument()
  })

  it('記録が1件でもあるときは「入れる」ボタンが表示されない', () => {
    seedRecords([RECORD])
    renderSettingsPage()
    expect(screen.queryByRole('button', { name: '入れる' })).not.toBeInTheDocument()
  })

  it('記録が1件でもあるときはラベルも表示されない', () => {
    seedRecords([RECORD])
    renderSettingsPage()
    expect(screen.queryByText('サンプルデータを入れる')).not.toBeInTheDocument()
  })

  it('記録が1件でもあるときは説明文も表示されない', () => {
    seedRecords([RECORD])
    renderSettingsPage()
    expect(
      screen.queryByText(
        'アプリの動きを試すための約1か月分の記録を入れます。元に戻すには「全データをリセット」を使ってください。'
      )
    ).not.toBeInTheDocument()
  })

  it('記録があっても書き出し・復元・リセットの行は残る', () => {
    seedRecords([RECORD])
    renderSettingsPage()
    expect(screen.getByRole('button', { name: '書き出す' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ファイルを選ぶ' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '全データをリセット' })).toBeInTheDocument()
  })

  it('セットが空の記録でも、1件あれば表示しない', () => {
    seedRecords([{ ...RECORD, sets: [] }])
    renderSettingsPage()
    expect(screen.queryByRole('button', { name: '入れる' })).not.toBeInTheDocument()
  })
})

describe('SettingsPage — データの書き出し', () => {
  let revokeObjectUrlMock: ReturnType<typeof vi.fn>
  let downloadedBlob: Blob | null
  let downloadAttribute: string

  beforeEach(() => {
    localStorage.clear()
    downloadedBlob = null
    downloadAttribute = ''
    // jsdom には Blob URL の実装が無いので差し替える
    revokeObjectUrlMock = vi.fn()
    URL.createObjectURL = vi.fn((blob: Blob) => {
      downloadedBlob = blob
      return 'blob:strength-log-test'
    }) as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = revokeObjectUrlMock as unknown as typeof URL.revokeObjectURL
    // jsdom は <a> のクリックで実際の遷移を試みるため、ダウンロード内容だけを記録する
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloadAttribute = this.download
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('「データを書き出す」ラベルと「書き出す」ボタンが表示される', () => {
    renderSettingsPage()
    expect(screen.getByText('データを書き出す')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '書き出す' })).toBeInTheDocument()
  })

  it('クリックで日付入りのファイル名でダウンロードされる', async () => {
    renderSettingsPage()
    await userEvent.click(screen.getByRole('button', { name: '書き出す' }))
    expect(downloadAttribute).toMatch(/^strength-log-backup-\d{4}-\d{2}-\d{2}\.json$/)
  })

  it('書き出す JSON に5種類のデータがすべて入る', async () => {
    seedRecords([RECORD])
    renderSettingsPage()
    await userEvent.click(screen.getByRole('button', { name: '書き出す' }))

    const exported = JSON.parse(await downloadedBlob!.text())
    expect(exported.app).toBe('strength-log')
    expect(exported.data.records).toEqual([RECORD])
    expect(Object.keys(exported.data).sort()).toEqual(
      ['bodyRecords', 'bodySettings', 'exercises', 'records', 'settings'].sort()
    )
  })

  it('生成したオブジェクト URL を解放する', async () => {
    renderSettingsPage()
    await userEvent.click(screen.getByRole('button', { name: '書き出す' }))
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:strength-log-test')
  })
})

describe('SettingsPage — バックアップからの復元', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>
  let alertSpy: ReturnType<typeof vi.spyOn>
  let reloadMock: ReturnType<typeof vi.fn>

  function backupFile(contents: string): File {
    return new File([contents], 'backup.json', { type: 'application/json' })
  }

  /** 記録が1件入ったバックアップの文字列を作り、保存データは空に戻す */
  function validBackupText(): string {
    seedRecords([RECORD])
    const backup = buildBackup()
    localStorage.clear()
    return JSON.stringify(backup)
  }

  beforeEach(() => {
    localStorage.clear()
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    reloadMock = vi.fn()
    // window.location は読み取り専用のため Object.defineProperty で上書きする
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('「バックアップから復元」ラベルと「ファイルを選ぶ」ボタンが表示される', () => {
    renderSettingsPage()
    expect(screen.getByText('バックアップから復元')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ファイルを選ぶ' })).toBeInTheDocument()
  })

  it('ファイル入力は JSON だけを受け付ける', () => {
    renderSettingsPage()
    expect(screen.getByLabelText('バックアップファイル')).toHaveAttribute(
      'accept',
      'application/json'
    )
  })

  it('正しいバックアップを選ぶと確認のうえ復元される', async () => {
    const text = validBackupText()
    renderSettingsPage()

    await userEvent.upload(screen.getByLabelText('バックアップファイル'), backupFile(text))

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(RECORDS_KEY) ?? 'null')).toEqual([RECORD])
    })
    expect(confirmSpy).toHaveBeenCalledWith(
      'バックアップから復元しますか？\n現在のデータはすべて置き換わります。'
    )
    expect(localStorage.getItem(EXERCISES_KEY)).not.toBeNull()
    expect(localStorage.getItem(BODY_RECORDS_KEY)).not.toBeNull()
    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it('確認をキャンセルすると何も書き換わらない', async () => {
    confirmSpy.mockReturnValue(false)
    const text = validBackupText()
    renderSettingsPage()

    await userEvent.upload(screen.getByLabelText('バックアップファイル'), backupFile(text))

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled()
    })
    expect(localStorage.getItem(RECORDS_KEY)).toBeNull()
    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('別アプリの JSON は取り込まずに知らせる', async () => {
    renderSettingsPage()

    await userEvent.upload(
      screen.getByLabelText('バックアップファイル'),
      backupFile(JSON.stringify({ app: 'other-app', version: 1, data: {} }))
    )

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'このファイルは Strength Log のバックアップではないようです。'
      )
    })
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(localStorage.getItem(RECORDS_KEY)).toBeNull()
    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('壊れた JSON は取り込まずに知らせる', async () => {
    renderSettingsPage()

    await userEvent.upload(
      screen.getByLabelText('バックアップファイル'),
      backupFile('INVALID_JSON{{{')
    )

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'このファイルは Strength Log のバックアップではないようです。'
      )
    })
    expect(localStorage.getItem(RECORDS_KEY)).toBeNull()
  })

  it('読み込み後は入力値がクリアされ、同じファイルを続けて選べる', async () => {
    renderSettingsPage()
    const input = screen.getByLabelText('バックアップファイル') as HTMLInputElement

    await userEvent.upload(input, backupFile(validBackupText()))

    await waitFor(() => {
      expect(input.value).toBe('')
    })
  })
})

describe('SettingsPage — 使い方への入口', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('「使い方」のラベルと「開く」ボタンが表示される', () => {
    renderSettingsPage()
    expect(screen.getByText('使い方')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '開く' })).toBeInTheDocument()
  })

  it('「使い方」は「記録設定」より前に置かれている', () => {
    renderSettingsPage()
    const guideLabel = screen.getByText('使い方')
    const recordSectionTitle = screen.getByText('記録設定')
    expect(
      guideLabel.compareDocumentPosition(recordSectionTitle) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('「開く」を押すと使い方ページへ遷移する', async () => {
    renderSettingsPage()
    await userEvent.click(screen.getByRole('button', { name: '開く' }))
    expect(screen.getByTestId('guide-page')).toBeInTheDocument()
  })
})

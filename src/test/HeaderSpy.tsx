import { usePageHeader } from '../contexts/PageHeaderContext'

/**
 * ページ単体テスト用の簡易ヘッダー。
 * 本番では Layout がヘッダーを描画するが、ページ単体テストでは Layout を通さないため、
 * setHeader に渡されたタイトルと左右の要素をここで代わりに描画して検証できるようにする。
 */
export function HeaderSpy() {
  const { header } = usePageHeader()
  return (
    <div>
      <div data-testid="page-title">{header.title}</div>
      <div data-testid="page-header-left">{header.leftElement ?? null}</div>
      <div data-testid="page-header-right">{header.rightElement ?? null}</div>
    </div>
  )
}

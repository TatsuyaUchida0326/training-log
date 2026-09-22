import { useParams } from 'react-router-dom'
import TrainingEntryPage from './TrainingEntryPage'

/**
 * 記録画面は日付・種目ごとに作り直す。
 * 下書きは画面ローカルの state なので、日付・種目が変わったら画面ごと作り直す。
 */
export default function TrainingEntryRoute() {
  const { dateStr, exerciseId } = useParams<{ dateStr: string; exerciseId: string }>()
  return <TrainingEntryPage key={`${dateStr}-${exerciseId}`} />
}

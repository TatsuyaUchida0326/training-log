import { createBrowserRouter } from 'react-router-dom'
import LayoutRoute from './components/LayoutRoute/LayoutRoute'
import ErrorPage from './pages/ErrorPage'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import BodyPage from './pages/BodyPage'
import SettingsPage from './pages/SettingsPage'
import GuidePage from './pages/GuidePage'
import DateDetailPage from './pages/DateDetailPage'
import ExerciseSelectPage from './pages/ExerciseSelectPage'
import ExerciseAddPage from './pages/ExerciseAddPage'
import TrainingEntryPage from './pages/TrainingEntryPage'

export const router = createBrowserRouter([
  {
    element: <LayoutRoute />,
    // 予期しない例外で白い画面にせず、再読み込み／初期化の逃げ道を出す
    errorElement: <ErrorPage />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/date/:dateStr', element: <DateDetailPage /> },
      { path: '/date/:dateStr/exercises/select', element: <ExerciseSelectPage /> },
      { path: '/date/:dateStr/exercises/add', element: <ExerciseAddPage /> },
      { path: '/date/:dateStr/exercises/:exerciseId', element: <TrainingEntryPage /> },
      { path: '/history', element: <HistoryPage /> },
      { path: '/body', element: <BodyPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/settings/guide', element: <GuidePage /> },
    ],
  },
])

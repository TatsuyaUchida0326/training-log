import { createBrowserRouter } from 'react-router-dom'
import LayoutRoute from './components/LayoutRoute/LayoutRoute'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import BodyPage from './pages/BodyPage'
import SettingsPage from './pages/SettingsPage'
import DateDetailPage from './pages/DateDetailPage'
import ExerciseSelectPage from './pages/ExerciseSelectPage'
import ExerciseAddPage from './pages/ExerciseAddPage'
import TrainingEntryPage from './pages/TrainingEntryPage'
import BodySettingsPage from './pages/BodySettingsPage'

export const router = createBrowserRouter([
  {
    element: <LayoutRoute />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/date/:dateStr', element: <DateDetailPage /> },
      { path: '/date/:dateStr/exercises/select', element: <ExerciseSelectPage /> },
      { path: '/date/:dateStr/exercises/add', element: <ExerciseAddPage /> },
      { path: '/date/:dateStr/exercises/:exerciseId', element: <TrainingEntryPage /> },
      { path: '/history', element: <HistoryPage /> },
      { path: '/body', element: <BodyPage /> },
      { path: '/body/settings', element: <BodySettingsPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
])

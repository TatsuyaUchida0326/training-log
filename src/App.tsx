import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import BodyPage from './pages/BodyPage'
import SettingsPage from './pages/SettingsPage'
import DateDetailPage from './pages/DateDetailPage'
import ExerciseSelectPage from './pages/ExerciseSelectPage'
import ExerciseAddPage from './pages/ExerciseAddPage'
import TrainingEntryPage from './pages/TrainingEntryPage'
import BodySettingsPage from './pages/BodySettingsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/date/:dateStr" element={<Layout><DateDetailPage /></Layout>} />
        <Route path="/date/:dateStr/exercises/select" element={<Layout><ExerciseSelectPage /></Layout>} />
        <Route path="/date/:dateStr/exercises/add" element={<Layout><ExerciseAddPage /></Layout>} />
        <Route path="/date/:dateStr/exercises/:exerciseId" element={<Layout><TrainingEntryPage /></Layout>} />
        <Route path="/history" element={<Layout><HistoryPage /></Layout>} />
        <Route path="/body" element={<Layout><BodyPage /></Layout>} />
        <Route path="/body/settings" element={<Layout><BodySettingsPage /></Layout>} />
        <Route path="/settings" element={<Layout><SettingsPage /></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

import { RouterProvider } from 'react-router-dom'
import { PageHeaderProvider } from './contexts/PageHeaderContext'
import { router } from './routes'

function App() {
  return (
    <PageHeaderProvider>
      <RouterProvider router={router} />
    </PageHeaderProvider>
  )
}

export default App

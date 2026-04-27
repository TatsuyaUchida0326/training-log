import { Outlet } from 'react-router-dom'
import Layout from '../Layout/Layout'

export default function LayoutRoute() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

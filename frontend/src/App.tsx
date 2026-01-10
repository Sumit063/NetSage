import { Navigate, Route, Routes } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import PcapsPage from './pages/PcapsPage'
import PcapDetailPage from './pages/PcapDetailPage'
import FlowDetailPage from './pages/FlowDetailPage'
import IssuesPage from './pages/IssuesPage'
import { AppLayout } from './components/AppLayout'
import { RequireAuth } from './components/RequireAuth'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout>
              <Navigate to="/pcaps" replace />
            </AppLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/pcaps"
        element={
          <RequireAuth>
            <AppLayout>
              <PcapsPage />
            </AppLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/pcaps/:id"
        element={
          <RequireAuth>
            <AppLayout>
              <PcapDetailPage />
            </AppLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/flows/:id"
        element={
          <RequireAuth>
            <AppLayout>
              <FlowDetailPage />
            </AppLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/issues"
        element={
          <RequireAuth>
            <AppLayout>
              <IssuesPage />
            </AppLayout>
          </RequireAuth>
        }
      />
    </Routes>
  )
}

import { Navigate, Route, Routes } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import PcapsPage from './pages/PcapsPage'
import PcapDetailPage from './pages/PcapDetailPage'
import FlowDetailPage from './pages/FlowDetailPage'
import IssuesPage from './pages/IssuesPage'
import { Shell } from './components/Shell'
import { RequireAuth } from './components/RequireAuth'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Shell>
              <Navigate to="/pcaps" replace />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/pcaps"
        element={
          <RequireAuth>
            <Shell>
              <PcapsPage />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/pcaps/:id"
        element={
          <RequireAuth>
            <Shell>
              <PcapDetailPage />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/flows/:id"
        element={
          <RequireAuth>
            <Shell>
              <FlowDetailPage />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/issues"
        element={
          <RequireAuth>
            <Shell>
              <IssuesPage />
            </Shell>
          </RequireAuth>
        }
      />
    </Routes>
  )
}

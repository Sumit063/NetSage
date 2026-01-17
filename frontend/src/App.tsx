import { Navigate, Route, Routes } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import PcapsPage from './pages/PcapsPage'
import PcapDetailPage from './pages/PcapDetailPage'
import FlowDetailPage from './pages/FlowDetailPage'
import PacketsPage from './pages/PacketsPage'
import TriagePage from './pages/TriagePage'
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
        path="/jobs/:id/packets"
        element={
          <RequireAuth>
            <Shell>
              <PacketsPage />
            </Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/jobs/:id/triage"
        element={
          <RequireAuth>
            <Shell>
              <TriagePage />
            </Shell>
          </RequireAuth>
        }
      />
    </Routes>
  )
}

import { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { auth } from '../lib/auth'

export function RequireAuth({ children }: PropsWithChildren) {
  const location = useLocation()
  const token = auth.getToken()
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <>{children}</>
}

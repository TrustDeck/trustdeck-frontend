import { Navigate } from 'react-router-dom'

export default function PermissionsRedirect() {
  return <Navigate to="/permissions" replace />
}

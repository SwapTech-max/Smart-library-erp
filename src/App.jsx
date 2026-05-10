import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import { ToastProvider } from './components/Toast/ToastProvider'

// Auth
import Login    from './pages/auth/login'
import Register from './pages/auth/register'

// Admin
import AdminDashboard    from './pages/admin/Dashboard'
import AdminBooks        from './pages/admin/Books'
import AdminTransactions from './pages/admin/Transactions'
import AdminUsers        from './pages/admin/Users'

// Librarian
import LibrarianDashboard    from './pages/librarian/Dashboard'
import LibrarianBooks        from './pages/librarian/Books'
import LibrarianStudents     from './pages/librarian/Students'
import LibrarianTransactions from './pages/librarian/Transactions'
import IssueBook             from './pages/librarian/IssueBook'
import ReturnBook            from './pages/librarian/ReturnBook'
import Attendance            from './pages/librarian/Attendance'

// Student
import StudentDashboard from './pages/student/Dashboard'
import BrowseBooks      from './pages/student/BrowseBooks'
import MyBooks          from './pages/student/MyBooks'
import MyFines          from './pages/student/MyFines'

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '16px',
    }}>
      <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '12px', padding: '14px', fontSize: '28px' }}>📚</div>
      <div style={{ color: '#6366f1', fontSize: '16px', fontWeight: '700' }}>Loading...</div>
      <div style={{ color: '#4b5563', fontSize: '13px' }}>Smart Library ERP</div>
    </div>
  )
}

function getRoleRedirect(role) {
  if (role === 'SUPER_ADMIN') return '/admin/dashboard'
  if (role === 'LIBRARIAN')   return '/librarian/dashboard'
  if (role === 'STUDENT')     return '/student/dashboard'
  return '/login'
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (!loading) return
    const t = setTimeout(() => { setTimedOut(true) }, 10000)
    return () => clearTimeout(t)
  }, [loading])

  if (timedOut) return <Navigate to="/login" replace />
  if (loading)  return <LoadingScreen />
  if (!user)    return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={getRoleRedirect(profile.role)} replace />
  }
  return children
}

function PublicRoute({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user && profile) return <Navigate to={getRoleRedirect(profile.role)} replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Admin */}
      <Route path="/admin/dashboard"    element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/books"        element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminBooks /></ProtectedRoute>} />
      <Route path="/admin/transactions" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminTransactions /></ProtectedRoute>} />
      <Route path="/admin/users"        element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminUsers /></ProtectedRoute>} />

      {/* Librarian */}
      <Route path="/librarian/dashboard"    element={<ProtectedRoute allowedRoles={['LIBRARIAN']}><LibrarianDashboard /></ProtectedRoute>} />
      <Route path="/librarian/books"        element={<ProtectedRoute allowedRoles={['LIBRARIAN']}><LibrarianBooks /></ProtectedRoute>} />
      <Route path="/librarian/students"     element={<ProtectedRoute allowedRoles={['LIBRARIAN']}><LibrarianStudents /></ProtectedRoute>} />
      <Route path="/librarian/transactions" element={<ProtectedRoute allowedRoles={['LIBRARIAN']}><LibrarianTransactions /></ProtectedRoute>} />
      <Route path="/librarian/issue"        element={<ProtectedRoute allowedRoles={['LIBRARIAN']}><IssueBook /></ProtectedRoute>} />
      <Route path="/librarian/return"       element={<ProtectedRoute allowedRoles={['LIBRARIAN']}><ReturnBook /></ProtectedRoute>} />
      <Route path="/librarian/attendance"   element={<ProtectedRoute allowedRoles={['LIBRARIAN']}><Attendance /></ProtectedRoute>} />

      {/* Student */}
      <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/browse"    element={<ProtectedRoute allowedRoles={['STUDENT']}><BrowseBooks /></ProtectedRoute>} />
      <Route path="/student/my-books"  element={<ProtectedRoute allowedRoles={['STUDENT']}><MyBooks /></ProtectedRoute>} />
      <Route path="/student/my-fines"  element={<ProtectedRoute allowedRoles={['STUDENT']}><MyFines /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          <Layout>
            <AppRoutes />
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  )
}
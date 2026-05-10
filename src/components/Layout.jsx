import { useAuth } from '../context/AuthContext'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Book, Users, ClipboardList, BookOpenCheck, BookKey, HandCoins, Library } from 'lucide-react'

const C = {
  bg: '#0a0a0f', surface: '#111118', border: '#1e1e2e', text: '#f1f5f9',
  muted: '#64748b', accent: '#8b5cf6', accentBg: 'rgba(139, 92, 246, 0.15)'
}

const adminLinks = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { path: '/admin/users', label: 'Users', icon: <Users size={18} /> },
  { path: '/admin/books', label: 'Books', icon: <Book size={18} /> },
  { path: '/admin/transactions', label: 'Transactions', icon: <ClipboardList size={18} /> },
]

const librarianLinks = [
  { path: '/librarian/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { path: '/librarian/issue', label: 'Issue Book', icon: <BookKey size={18} /> },
  { path: '/librarian/return', label: 'Return Book', icon: <BookOpenCheck size={18} /> },
  { path: '/librarian/books', label: 'Books', icon: <Book size={18} /> },
  { path: '/librarian/students', label: 'Students', icon: <Users size={18} /> },
  { path: '/librarian/transactions', label: 'Transactions', icon: <ClipboardList size={18} /> },
]

const studentLinks = [
  { path: '/student/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { path: '/student/browse', label: 'Browse Books', icon: <Library size={18} /> },
  { path: '/student/my-books', label: 'My Books', icon: <Book size={18} /> },
  { path: '/student/my-fines', label: 'My Fines', icon: <HandCoins size={18} /> },
]

export default function Layout({ children }) {
  const { profile, signOut } = useAuth()
  const location = useLocation()

  if (!profile) return children

  let links = []
  if (profile.role === 'SUPER_ADMIN') links = adminLinks
  else if (profile.role === 'LIBRARIAN') links = librarianLinks
  else if (profile.role === 'STUDENT') links = studentLinks

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        background: C.surface,
        borderRight: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}>
        <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '8px', padding: '6px', fontSize: '18px', color: '#fff' }}>📚</div>
          <div style={{ fontWeight: '800', fontSize: '15px', color: C.text }}>Smart Library</div>
        </div>

        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {links.map(link => {
            const isActive = location.pathname === link.path
            return (
              <Link key={link.path} to={link.path} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', borderRadius: '8px',
                color: isActive ? C.accent : C.muted,
                background: isActive ? C.accentBg : 'transparent',
                textDecoration: 'none', fontSize: '14px', fontWeight: isActive ? '600' : '500',
                transition: 'all 0.2s'
              }}>
                {link.icon}
                {link.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        {/* Top Navbar */}
        <header style={{
          height: '60px',
          background: 'rgba(17,17,24,0.9)',
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}>
          <div style={{ fontWeight: '700', fontSize: '12px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {profile.role === 'SUPER_ADMIN' ? 'Super Admin Panel' : 
             profile.role === 'LIBRARIAN' ? 'Librarian Panel' : 'Student Portal'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '13px', color: C.text, fontWeight: '600' }}>{profile.full_name}</span>
            <button 
              type="button"
              onClick={signOut}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </div>
        </header>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
        <footer style={{
          textAlign: 'center', padding: '16px', color: C.muted, fontSize: '13px',
          borderTop: `1px solid ${C.border}`, background: C.surface, marginTop: 'auto'
        }}>
          Smart Library ERP — Government Engineering College Palamu
        </footer>
      </div>
    </div>
  )
}

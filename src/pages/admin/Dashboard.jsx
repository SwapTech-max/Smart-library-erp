import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useRealtime } from '../../hooks/useRealtime'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ totalBooks: 0, totalStudents: 0, totalLibrarians: 0, activeBorrows: 0, overdue: 0, totalFines: 0 })
  const [monthlyData, setMonthlyData] = useState([])
  const [branchData, setBranchData] = useState([])
  const [recentTxns, setRecentTxns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])
  useRealtime('transactions', fetchAll)
  useRealtime('attendance_logs', fetchAll)
  useRealtime('books', fetchAll)

  async function fetchAll() {
    setLoading(false)
    const [booksRes, studentsRes, librariansRes, activeBorrowsRes, overdueRes, finesRes, txnsRes] = await Promise.all([
      supabase.from('books').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'STUDENT'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'LIBRARIAN'),
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'issued'),
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
      supabase.from('transactions').select('fine_amount'),
      supabase.from('transactions')
        .select('*, books(title), users!transactions_student_id_fkey(full_name,branch)')
        .order('created_at', { ascending: false })
        .limit(8),
    ])

    const totalFines = (finesRes.data || []).reduce((s, t) => s + (t.fine_amount || 0), 0)
    setStats({
      totalBooks: booksRes.count || 0,
      totalStudents: studentsRes.count || 0,
      totalLibrarians: librariansRes.count || 0,
      activeBorrows: activeBorrowsRes.count || 0,
      overdue: overdueRes.count || 0,
      totalFines,
    })
    setRecentTxns(txnsRes.data || [])

    // Monthly chart data
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const label = d.toLocaleString('default', { month: 'short' })
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const start = `${year}-${month}-01`
      const end = `${year}-${month}-31`
      const { data: issued } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).gte('issue_date', start).lte('issue_date', end)
      const { data: returned } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).gte('return_date', start).lte('return_date', end)
      months.push({ month: label, issued: issued?.length || 0, returned: returned?.length || 0 })
    }
    setMonthlyData(months)

    // Branch data
    const { data: branchStudents } = await supabase.from('users').select('branch').eq('role', 'STUDENT')
    const branchMap = {}
    branchStudents?.forEach(s => { if (s.branch) branchMap[s.branch] = (branchMap[s.branch] || 0) + 1 })
    setBranchData(Object.entries(branchMap).map(([name, value]) => ({ name, value })))
  }

  const S = {
    page: { minHeight: '100vh', background: '#0a0a0f', color: '#f1f5f9', fontFamily: 'sans-serif' },
    nav: { background: '#111118', borderBottom: '1px solid #1e1e2e', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' },
    logo: { display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700', fontSize: '17px' },
    badge: { background: '#2a0a0a', color: '#f87171', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' },
    signOutBtn: { background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: '7px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
    main: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
    welcome: { marginBottom: '24px' },
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' },
    card: { background: '#111118', border: '1px solid #1e1e2e', borderRadius: '14px', padding: '20px' },
    statVal: { fontSize: '32px', fontWeight: '800', lineHeight: 1, marginBottom: '4px' },
    statLabel: { color: '#64748b', fontSize: '13px' },
    actionCard: { background: '#111118', border: '1px solid #1e1e2e', borderRadius: '14px', padding: '20px', cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s' },
    sectionTitle: { fontSize: '15px', fontWeight: '700', marginBottom: '16px' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '10px 14px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', borderBottom: '1px solid #1e1e2e' },
    td: { padding: '12px 14px', fontSize: '13px', borderBottom: '1px solid #1a1a2e' },
    issued: { background: '#0f2a1a', color: '#4ade80', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
    overdueBadge: { background: '#2a1a0f', color: '#fbbf24', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
    returned: { background: '#1e1e3f', color: '#818cf8', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
    liveTag: { background: '#ff4444', color: 'white', fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '10px', animation: 'pulse 2s infinite' },
  }

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.logo}>
          <span style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '8px', padding: '6px', fontSize: '18px' }}>📚</span>
          Smart Library ERP
          <span style={S.badge}>SUPER ADMIN</span>
          <span style={S.liveTag}>● LIVE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>{profile?.full_name}</span>
          <button type="button" style={S.signOutBtn} onClick={signOut}>Sign Out</button>
        </div>
      </nav>

      <div style={S.main}>
        <div style={S.welcome}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>Welcome back, {profile?.full_name} 👋</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>You have full control over the Smart Library system.</p>
        </div>

        {/* Main Stats */}
        <div style={S.grid4}>
          {[
            { label: 'Total Books', val: stats.totalBooks, color: '#818cf8', icon: '📚' },
            { label: 'Total Students', val: stats.totalStudents, color: '#4ade80', icon: '🎓' },
            { label: 'Total Librarians', val: stats.totalLibrarians, color: '#60a5fa', icon: '👤' },
            { label: 'Active Borrows', val: stats.activeBorrows, color: '#fbbf24', icon: '📖' },
          ].map(s => (
            <div key={s.label} style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ ...S.statVal, color: s.color }}>{s.val}</div>
                  <div style={S.statLabel}>{s.label}</div>
                </div>
                <span style={{ fontSize: '28px' }}>{s.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Secondary Stats */}
        <div style={S.grid3}>
          <div style={S.card}>
            <div style={S.statLabel}>Overdue Books</div>
            <div style={{ ...S.statVal, color: '#f87171', fontSize: '28px' }}>{stats.overdue}</div>
          </div>
          <div style={S.card}>
            <div style={S.statLabel}>Total Fines Collected</div>
            <div style={{ ...S.statVal, color: '#f87171', fontSize: '28px' }}>₹{stats.totalFines}</div>
          </div>
          <div style={{ ...S.card, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { label: 'Manage Users', icon: '👥', path: '/admin/users' },
              { label: 'Manage Books', icon: '📚', path: '/admin/books' },
              { label: 'Transactions', icon: '🔄', path: '/admin/transactions' },
              { label: 'Attendance', icon: '📋', path: '/admin/attendance' },
            ].map(a => (
              <div key={a.label}
                style={{ background: '#0f0f1a', borderRadius: '8px', padding: '10px', cursor: 'pointer', border: '1px solid #1e1e2e', textAlign: 'center' }}
                onClick={() => navigate(a.path)}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e2e'}>
                <div style={{ fontSize: '20px' }}>{a.icon}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{a.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div style={S.grid2}>
          <div style={S.card}>
            <div style={S.sectionTitle}>Monthly Transactions</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#111118', border: '1px solid #2d2d44', borderRadius: '8px', color: '#f1f5f9' }} />
                <Legend />
                <Bar dataKey="issued" fill="#6366f1" radius={[4,4,0,0]} name="Issued" />
                <Bar dataKey="returned" fill="#4ade80" radius={[4,4,0,0]} name="Returned" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={S.card}>
            <div style={S.sectionTitle}>Students by Branch</div>
            {branchData.length === 0
              ? <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No branch data</div>
              : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={branchData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {branchData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#111118', border: '1px solid #2d2d44', borderRadius: '8px', color: '#f1f5f9' }} />
                  </PieChart>
                </ResponsiveContainer>
              )
            }
          </div>
        </div>

        {/* Recent Transactions */}
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={S.sectionTitle}>Recent Transactions</div>
            <button type="button" style={{ background: '#1e1e3f', color: '#818cf8', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }} onClick={() => navigate('/admin/transactions')}>View All</button>
          </div>
          <table style={S.table}>
            <thead>
              <tr>{['Student', 'Book', 'Branch', 'Issue Date', 'Due Date', 'Status'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {recentTxns.map(t => (
                <tr key={t.id}
                  onMouseEnter={e => e.currentTarget.style.background = '#13131f'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={S.td}>{t.users?.full_name || '—'}</td>
                  <td style={S.td}>{t.books?.title || '—'}</td>
                  <td style={{ ...S.td, color: '#64748b' }}>{t.users?.branch || '—'}</td>
                  <td style={{ ...S.td, color: '#94a3b8' }}>{t.issue_date}</td>
                  <td style={{ ...S.td, color: '#94a3b8' }}>{t.due_date}</td>
                  <td style={S.td}>
                    <span style={t.status === 'issued' ? S.issued : t.status === 'overdue' ? S.overdueBadge : S.returned}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  )
}
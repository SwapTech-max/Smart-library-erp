import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const S = {
  page: { minHeight: '100vh', background: '#0a0a0f', color: '#f1f5f9', fontFamily: 'sans-serif' },
  nav: { background: '#111118', borderBottom: '1px solid #1e1e2e', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700', fontSize: '18px' },
  badge: { background: '#1e1e3f', color: '#818cf8', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' },
  backBtn: { background: 'transparent', border: '1px solid #2d2d44', color: '#94a3b8', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  main: { padding: '32px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: '700', margin: 0 },
  sub: { color: '#64748b', fontSize: '14px', marginTop: '4px' },
  searchRow: { display: 'flex', gap: '12px', marginBottom: '24px' },
  input: { background: '#111118', border: '1px solid #2d2d44', color: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none', flex: 1 },
  select: { background: '#111118', border: '1px solid #2d2d44', color: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#111118', borderRadius: '12px', overflow: 'hidden' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', borderBottom: '1px solid #1e1e2e', background: '#0f0f1a' },
  td: { padding: '14px 16px', fontSize: '14px', borderBottom: '1px solid #1a1a2e', verticalAlign: 'middle' },
  empty: { textAlign: 'center', padding: '60px', color: '#64748b' },
  viewBtn: { background: '#1e1e3f', color: '#818cf8', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#111118', border: '1px solid #2d2d44', borderRadius: '16px', padding: '32px', width: '600px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto' },
  modalTitle: { fontSize: '20px', fontWeight: '700', marginBottom: '4px' },
  modalSub: { color: '#64748b', fontSize: '14px', marginBottom: '24px' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' },
  infoBox: { background: '#0f0f1a', borderRadius: '8px', padding: '12px 14px' },
  infoLabel: { fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' },
  infoVal: { fontSize: '14px', fontWeight: '600' },
  sectionTitle: { fontSize: '13px', fontWeight: '600', color: '#818cf8', textTransform: 'uppercase', marginBottom: '12px' },
  txnRow: { background: '#0f0f1a', borderRadius: '8px', padding: '12px 14px', marginBottom: '8px' },
  txnTitle: { fontWeight: '600', fontSize: '14px', marginBottom: '4px' },
  txnSub: { color: '#64748b', fontSize: '12px' },
  issued: { background: '#0f2a1a', color: '#4ade80', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  overdue: { background: '#2a1a0f', color: '#fbbf24', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  returnd: { background: '#1e1e3f', color: '#818cf8', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  closeBtn: { background: 'transparent', border: '1px solid #2d2d44', color: '#94a3b8', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', marginTop: '16px' },
}

const BRANCHES = ['CSE', 'EE', 'CE', 'ME']

export default function LibrarianStudents() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [txns, setTxns] = useState([])
  const [txnLoading, setTxnLoading] = useState(false)

  useEffect(() => { fetchStudents() }, [])

  async function fetchStudents() {
    setLoading(true)
    const { data } = await supabase.from('users').select('*').eq('role', 'STUDENT').order('full_name')
    setStudents(data || [])
    setLoading(false)
  }

  async function viewStudent(s) {
    setSelected(s); setTxns([]); setTxnLoading(true)
    const { data } = await supabase.from('transactions')
      .select('*, books(title,author)')
      .eq('student_id', s.id)
      .order('created_at', { ascending: false })
    setTxns(data || [])
    setTxnLoading(false)
  }

  const filtered = students.filter(s => {
    const q = search.toLowerCase()
    const matchQ = !q || s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.library_id?.toLowerCase().includes(q)
    const matchB = !branchFilter || s.branch === branchFilter
    const matchY = !yearFilter || String(s.year) === yearFilter
    return matchQ && matchB && matchY
  })

  const totalFine = txns.reduce((sum, t) => sum + (t.fine_amount || 0), 0)

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.logo}>
          <span style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '8px', padding: '6px', fontSize: '18px' }}>📚</span>
          Smart Library ERP <span style={S.badge}>LIBRARIAN</span>
        </div>
        <button type="button" style={S.backBtn} onClick={() => navigate('/librarian/dashboard')}>← Dashboard</button>
      </nav>

      <div style={S.main}>
        <div style={S.header}>
          <div>
            <h1 style={S.title}>Student Records</h1>
            <p style={S.sub}>{students.length} registered students</p>
          </div>
        </div>

        <div style={S.searchRow}>
          <input style={S.input} placeholder="Search by name, email, library ID..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={S.select} value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
            <option value="">All Branches</option>
            {BRANCHES.map(b => <option key={b}>{b}</option>)}
          </select>
          <select style={S.select} value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
            <option value="">All Years</option>
            {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
        </div>

        {loading ? <div style={S.empty}>Loading students...</div> : filtered.length === 0 ? <div style={S.empty}>No students found.</div> : (
          <table style={S.table}>
            <thead>
              <tr>
                {['Name', 'Email', 'Library ID', 'Branch', 'Year', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}
                  onMouseEnter={e => e.currentTarget.style.background = '#13131f'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={S.td}><strong>{s.full_name}</strong></td>
                  <td style={{ ...S.td, color: '#94a3b8' }}>{s.email}</td>
                  <td style={{ ...S.td, color: '#64748b' }}>{s.library_id || '—'}</td>
                  <td style={S.td}>{s.branch || '—'}</td>
                  <td style={S.td}>{s.year ? `Year ${s.year}` : '—'}</td>
                  <td style={S.td}><button type="button" style={S.viewBtn} onClick={() => viewStudent(s)}>View History</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={S.modal}>
            <div style={S.modalTitle}>{selected.full_name}</div>
            <div style={S.modalSub}>{selected.email}</div>
            <div style={S.infoGrid}>
              <div style={S.infoBox}><div style={S.infoLabel}>Branch</div><div style={S.infoVal}>{selected.branch || '—'}</div></div>
              <div style={S.infoBox}><div style={S.infoLabel}>Year</div><div style={S.infoVal}>{selected.year ? `Year ${selected.year}` : '—'}</div></div>
              <div style={S.infoBox}><div style={S.infoLabel}>Library ID</div><div style={S.infoVal}>{selected.library_id || '—'}</div></div>
              <div style={S.infoBox}><div style={S.infoLabel}>Total Fine</div><div style={{ ...S.infoVal, color: totalFine > 0 ? '#f87171' : '#4ade80' }}>₹{totalFine}</div></div>
            </div>
            <div style={S.sectionTitle}>Borrow History ({txns.length})</div>
            {txnLoading ? <div style={{ color: '#64748b', fontSize: '14px' }}>Loading...</div> :
              txns.length === 0 ? <div style={{ color: '#64748b', fontSize: '14px' }}>No borrow history.</div> :
              txns.map(t => (
                <div key={t.id} style={S.txnRow}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={S.txnTitle}>{t.books?.title}</div>
                    <span style={t.status === 'issued' ? S.issued : t.status === 'overdue' ? S.overdue : S.returnd}>{t.status}</span>
                  </div>
                  <div style={S.txnSub}>Issued: {t.issue_date} · Due: {t.due_date} {t.return_date ? `· Returned: ${t.return_date}` : ''}</div>
                  {t.fine_amount > 0 && <div style={{ color: '#f87171', fontSize: '12px', marginTop: '4px' }}>Fine: ₹{t.fine_amount}</div>}
                </div>
              ))
            }
            <button type="button" style={S.closeBtn} onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

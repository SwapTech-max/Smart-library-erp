import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTransactions, useLibrarianStats } from '../../hooks/useTransactions'
import { calculateFine, returnBook } from '../../services/transactionService'

const C = {
  bg: '#0a0a0f', surface: '#111118', surface2: '#0f0f1a',
  border: '#1e1e2e', border2: '#2d2d44', text: '#f1f5f9',
  muted: '#64748b', green: '#4ade80', red: '#f87171', yellow: '#fbbf24', violet: '#8b5cf6',
}

const S = {
  page:     { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter','system-ui',sans-serif" },
  nav:      { background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', position: 'sticky', top: 0, zIndex: 100 },
  logo:     { display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700', fontSize: '17px' },
  badge:    { background: '#1e1e3f', color: '#818cf8', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' },
  navBtn:   { background: 'transparent', border: '1px solid #2d2d44', color: '#94a3b8', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  main:     { padding: '32px 28px', maxWidth: '1280px', margin: '0 auto' },
  topRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  h1:       { fontSize: '24px', fontWeight: '800', margin: 0 },
  sub:      { color: C.muted, fontSize: '13px', marginTop: '4px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '14px', marginBottom: '24px' },
  statCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px 20px' },
  statLabel:{ color: C.muted, fontSize: '11px', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' },
  statVal:  { fontSize: '24px', fontWeight: '800' },
  filters:  { display: 'flex', gap: '10px', marginBottom: '22px', flexWrap: 'wrap' },
  input:    { background: C.surface, border: `1px solid ${C.border2}`, color: C.text, padding: '10px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none', flex: 1, minWidth: '200px' },
  select:   { background: C.surface, border: `1px solid ${C.border2}`, color: C.text, padding: '10px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none' },
  table:    { width: '100%', borderCollapse: 'collapse', background: C.surface, borderRadius: '14px', overflow: 'hidden' },
  thead:    { background: C.surface2 },
  th:       { padding: '13px 16px', textAlign: 'left', fontSize: '11px', color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: `1px solid ${C.border}` },
  td:       { padding: '14px 16px', fontSize: '14px', borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle' },
  issued:   { background: '#0f2a1a', color: C.green, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  overdue:  { background: 'rgba(248,113,113,0.15)', color: C.red, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  returned: { background: '#1e1e3f', color: '#818cf8', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  empty:    { textAlign: 'center', padding: '60px', color: C.muted },
  skeleton: { background: `linear-gradient(90deg,${C.surface} 25%,${C.surface2} 50%,${C.surface} 75%)`, backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: '6px' },
  issueBtnSmall: { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: '7px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' },
  returnBtnSmall:{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: '7px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' },
}

function StatusBadge({ status }) {
  if (status === 'issued') return <span style={S.issued}>Issued</span>
  if (status === 'overdue') return <span style={S.overdue}>Overdue</span>
  return <span style={S.returned}>Returned</span>
}

function SkeletonRow() {
  return (
    <tr>
      {[150, 140, 80, 80, 80, 70, 60].map((w, i) => (
        <td key={i} style={S.td}><div style={{ ...S.skeleton, height: '16px', width: `${w}px` }} /></td>
      ))}
    </tr>
  )
}

export default function LibrarianTransactions() {
  const { profile } = useAuth()
  const navigate    = useNavigate()

  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const dbRef = useState(null)

  const handleSearch = useCallback((val) => {
    setSearch(val)
    clearTimeout(dbRef[0])
    dbRef[0] = setTimeout(() => setDebouncedSearch(val), 300)
  }, [dbRef])

  const { transactions, count, loading, refetch } = useTransactions({ status: statusFilter, search: debouncedSearch })
  const { stats, loading: statsLoading } = useLibrarianStats()

  const handleQuickReturn = async (tx) => {
    if (!window.confirm(`Mark "${tx.books?.title}" as returned?`)) return
    try {
      await returnBook({ transactionId: tx.id })
      alert('Book marked as returned successfully!')
      refetch()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)

  // Enrich: compute live fine for non-returned
  const enriched = transactions.map(t => {
    if (t.status === 'returned') return t
    const { isOverdue } = calculateFine(t.due_date)
    return { ...t, _liveOverdue: isOverdue }
  })

  return (
    <div style={S.page}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}input:focus,select:focus{border-color:#6366f1!important;}`}</style>
      <div style={S.main}>
        <div style={S.topRow}>
          <div>
            <h1 style={S.h1}>Transactions</h1>
            <p style={S.sub}>{count} total transactions</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" style={S.issueBtnSmall} onClick={() => navigate('/librarian/issue')}>📤 Issue Book</button>
            <button type="button" style={S.returnBtnSmall} onClick={() => navigate('/librarian/return')}>📥 Return Book</button>
          </div>
        </div>

        {/* Stats */}
        <div style={S.statsRow}>
          <div style={S.statCard}><div style={S.statLabel}>Total</div><div style={{ ...S.statVal }}>{statsLoading ? '...' : stats?.totalTransactions}</div></div>
          <div style={S.statCard}><div style={S.statLabel}>Issued Today</div><div style={{ ...S.statVal, color: '#06b6d4' }}>{statsLoading ? '...' : stats?.issuedToday}</div></div>
          <div style={S.statCard}><div style={S.statLabel}>Returned Today</div><div style={{ ...S.statVal, color: C.green }}>{statsLoading ? '...' : stats?.returnedToday}</div></div>
          <div style={S.statCard}><div style={S.statLabel}>Overdue</div><div style={{ ...S.statVal, color: C.red }}>{statsLoading ? '...' : stats?.overdueCount}</div></div>
          <div style={S.statCard}><div style={S.statLabel}>Total Fines</div><div style={{ ...S.statVal, color: C.yellow }}>{statsLoading ? '...' : `₹${stats?.totalFineCollected}`}</div></div>
        </div>

        {/* Filters */}
        <div style={S.filters}>
          <input style={S.input} placeholder="🔍 Search by book, student..." value={search} onChange={e => handleSearch(e.target.value)} />
          <select style={S.select} value={statusFilter} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="issued">Issued</option>
            <option value="overdue">Overdue</option>
            <option value="returned">Returned</option>
          </select>
        </div>

        {/* Table */}
        <table style={S.table}>
          <thead style={S.thead}>
            <tr>{['Student','Book','Issued','Due','Returned','Status','Fine','Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({length: 6}).map((_, i) => <SkeletonRow key={i} />)
              : enriched.length === 0
                ? <tr><td colSpan={7} style={S.empty}>No transactions found.</td></tr>
                : enriched.map(t => {
                  const displayStatus = t._liveOverdue ? 'overdue' : t.status
                  const { fine: liveFine } = t.status !== 'returned' ? calculateFine(t.due_date) : { fine: t.fine_amount }
                  return (
                    <tr key={t.id}
                      style={{ 
                        transition: 'background 0.15s',
                        background: displayStatus === 'overdue' ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = displayStatus === 'overdue' ? 'rgba(239, 68, 68, 0.1)' : '#13131f'}
                      onMouseLeave={e => e.currentTarget.style.background = displayStatus === 'overdue' ? 'rgba(239, 68, 68, 0.05)' : 'transparent'}
                    >
                      <td style={S.td}>
                        <div style={{ fontWeight: '700' }}>{t.users?.full_name || '—'}</div>
                        <div style={{ color: C.muted, fontSize: '12px' }}>{t.users?.email}</div>
                        {t.users?.library_id && <div style={{ color: '#475569', fontSize: '11px' }}>{t.users.library_id}</div>}
                      </td>
                      <td style={S.td}>
                        <div style={{ fontWeight: '600' }}>{t.books?.title || '—'}</div>
                        <div style={{ color: C.muted, fontSize: '12px' }}>{t.books?.author}</div>
                      </td>
                      <td style={{ ...S.td, color: '#94a3b8', fontSize: '13px' }}>{t.issue_date}</td>
                      <td style={{ ...S.td, color: displayStatus === 'overdue' ? C.red : '#94a3b8', fontSize: '13px', fontWeight: displayStatus === 'overdue' ? '700' : '400' }}>{t.due_date}</td>
                      <td style={{ ...S.td, color: t.return_date ? C.green : C.muted, fontSize: '13px' }}>{t.return_date || '—'}</td>
                      <td style={S.td}><StatusBadge status={displayStatus} /></td>
                      <td style={{ ...S.td, color: liveFine > 0 ? C.red : C.muted, fontWeight: liveFine > 0 ? '700' : '400' }}>
                        ₹{t.status === 'returned' ? t.fine_amount : liveFine}
                        {t.status !== 'returned' && liveFine > 0 && <div style={{ color: '#991b1b', fontSize: '10px' }}>accruing</div>}
                      </td>
                      <td style={S.td}>
                        {t.status !== 'returned' && (
                          <button 
                            type="button"
                            onClick={() => handleQuickReturn(t)}
                            style={{
                              ...S.returnBtnSmall,
                              padding: '5px 12px',
                              fontSize: '11px'
                            }}
                          >
                            Return
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}

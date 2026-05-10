import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useStudentBooks } from '../../hooks/useTransactions'
import { calculateFine } from '../../services/transactionService'

const C = {
  bg: '#0a0a0f', surface: '#111118', surface2: '#0f0f1a',
  border: '#1e1e2e', border2: '#2d2d44', text: '#f1f5f9',
  muted: '#64748b', green: '#4ade80', red: '#f87171', yellow: '#fbbf24', violet: '#8b5cf6',
}

const S = {
  page:      { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter','system-ui',sans-serif" },
  nav:       { background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', position: 'sticky', top: 0, zIndex: 100 },
  logo:      { display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700', fontSize: '17px' },
  badge:     { background: '#0f2a1a', color: C.green, fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' },
  navBtn:    { background: 'transparent', border: `1px solid ${C.border2}`, color: '#94a3b8', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  main:      { padding: '32px 28px', maxWidth: '900px', margin: '0 auto' },
  h1:        { fontSize: '24px', fontWeight: '800', margin: '0 0 6px' },
  sub:       { color: C.muted, fontSize: '14px', marginBottom: '28px' },
  tabs:      { display: 'flex', gap: '4px', background: C.surface, padding: '4px', borderRadius: '10px', width: 'fit-content', marginBottom: '24px' },
  activeTab: { padding: '8px 22px', borderRadius: '8px', background: `linear-gradient(135deg,#6366f1,#8b5cf6)`, color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '700' },
  inactTab:  { padding: '8px 22px', borderRadius: '8px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  card:      { background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px', marginBottom: '12px', transition: 'border-color 0.15s' },
  cardTop:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  cardTitle: { fontWeight: '800', fontSize: '16px', marginBottom: '4px' },
  cardAuthor:{ color: '#94a3b8', fontSize: '14px' },
  metaRow:   { display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' },
  metaItem:  { fontSize: '13px', color: C.muted },
  metaVal:   { color: C.text, fontWeight: '600' },
  warnBox:   { background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', padding: '10px 14px', marginTop: '12px', color: C.yellow, fontSize: '13px' },
  overdueBox:{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', padding: '10px 14px', marginTop: '12px', color: C.red, fontSize: '13px' },
  fineBox:   { background: 'rgba(248,113,113,0.06)', borderRadius: '8px', padding: '8px 12px', marginTop: '8px', color: C.red, fontSize: '13px', fontWeight: '600' },
  empty:     { textAlign: 'center', padding: '80px 20px', color: C.muted },
  skeleton:  { background: `linear-gradient(90deg,${C.surface} 25%,${C.surface2} 50%,${C.surface} 75%)`, backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: '8px', height: '140px', marginBottom: '12px' },
}

function StatusBadge({ t }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const isOverdue = t.status !== 'returned' && new Date(t.due_date) < today
  if (t.status === 'returned') return <span style={{ background: '#1e1e3f', color: '#818cf8', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>Returned</span>
  if (isOverdue || t.status === 'overdue') return <span style={{ background: 'rgba(248,113,113,0.15)', color: C.red, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>Overdue</span>
  return <span style={{ background: 'rgba(74,222,128,0.1)', color: C.green, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>Issued</span>
}

export default function MyBooks() {
  const navigate             = useNavigate()
  const { user, profile }    = useAuth()
  const { active, history, loading } = useStudentBooks(user?.id)
  const [tab, setTab]        = useState('current')

  const today = new Date(); today.setHours(0,0,0,0)
  const display = tab === 'current' ? active : history

  return (
    <div style={S.page}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <nav style={S.nav}>
        <div style={S.logo}>
          <span style={{ background: 'linear-gradient(135deg,#10b981,#059669)', borderRadius: '8px', padding: '7px', fontSize: '16px' }}>📚</span>
          Smart Library ERP <span style={S.badge}>STUDENT</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>{profile?.full_name}</span>
          <button type="button" style={S.navBtn} onClick={() => navigate('/student/dashboard')}>← Dashboard</button>
        </div>
      </nav>

      <div style={S.main}>
        <h1 style={S.h1}>My Books</h1>
        <p style={S.sub}>Track your borrowed books and borrowing history.</p>

        <div style={S.tabs}>
          <button type="button" style={tab === 'current' ? S.activeTab : S.inactTab} onClick={() => setTab('current')}>
            Currently Borrowed ({active.length})
          </button>
          <button type="button" style={tab === 'history' ? S.activeTab : S.inactTab} onClick={() => setTab('history')}>
            History ({history.length})
          </button>
        </div>

        {loading
          ? Array.from({length: 3}).map((_, i) => <div key={i} style={S.skeleton} />)
          : display.length === 0
            ? (
              <div style={S.empty}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>
                  {tab === 'current' ? '📭' : '📋'}
                </div>
                <div style={{ fontWeight: '600', fontSize: '16px', color: C.text, marginBottom: '6px' }}>
                  {tab === 'current' ? 'No books currently borrowed.' : 'No borrowing history yet.'}
                </div>
                {tab === 'current' && (
                  <button
                    type="button"
                    onClick={() => navigate('/student/browse')}
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', marginTop: '12px' }}
                  >Browse Books</button>
                )}
              </div>
            )
            : display.map(t => {
              const isActiveBook = t.status !== 'returned'
              const isOverdueBook = isActiveBook && new Date(t.due_date) < today
              const { overdueDays, fine: computedFine } = calculateFine(t.due_date)
              const daysLeft = isActiveBook
                ? Math.ceil((new Date(t.due_date) - new Date()) / (1000 * 60 * 60 * 24))
                : null

              return (
                <div key={t.id}
                  style={{ ...S.card, borderColor: isOverdueBook ? 'rgba(248,113,113,0.3)' : C.border }}
                  onMouseEnter={e => { if (!isOverdueBook) e.currentTarget.style.borderColor = '#2d2d44' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = isOverdueBook ? 'rgba(248,113,113,0.3)' : C.border }}
                >
                  <div style={S.cardTop}>
                    <div>
                      <div style={S.cardTitle}>{t.books?.title}</div>
                      <div style={S.cardAuthor}>by {t.books?.author}</div>
                    </div>
                    <StatusBadge t={t} />
                  </div>

                  <div style={S.metaRow}>
                    <div style={S.metaItem}>Issued: <span style={S.metaVal}>{t.issue_date}</span></div>
                    <div style={S.metaItem}>Due: <span style={{ ...S.metaVal, color: isOverdueBook ? C.red : C.text }}>{t.due_date}</span></div>
                    {t.return_date && <div style={S.metaItem}>Returned: <span style={S.metaVal}>{t.return_date}</span></div>}
                    {t.books?.rack_number && <div style={S.metaItem}>Rack: <span style={S.metaVal}>{t.books.rack_number}</span></div>}
                    {t.books?.category && <div style={S.metaItem}>Category: <span style={{ ...S.metaVal, color: '#818cf8' }}>{t.books.category}</span></div>}
                  </div>

                  {/* Due soon warning */}
                  {daysLeft !== null && daysLeft >= 0 && daysLeft <= 3 && !isOverdueBook && (
                    <div style={S.warnBox}>
                      ⚠ Due in {daysLeft} day{daysLeft !== 1 ? 's' : ''}! Return soon to avoid a ₹2/day fine.
                    </div>
                  )}

                  {/* Overdue warning */}
                  {isOverdueBook && (
                    <div style={S.overdueBox}>
                      🚨 Overdue by {overdueDays} day(s) — Accruing fine of ₹{computedFine} (₹2/day). Return immediately!
                    </div>
                  )}

                  {/* Historical fine */}
                  {t.fine_amount > 0 && t.status === 'returned' && (
                    <div style={S.fineBox}>Fine charged: ₹{t.fine_amount}</div>
                  )}
                </div>
              )
            })
        }
      </div>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useStudentBooks } from '../../hooks/useTransactions'
import { calculateFine } from '../../services/transactionService'

const C = {
  bg: '#0a0a0f', surface: '#111118', surface2: '#0f0f1a',
  border: '#1e1e2e', text: '#f1f5f9', muted: '#64748b',
  green: '#4ade80', red: '#f87171', yellow: '#fbbf24', violet: '#8b5cf6',
}

const S = {
  page:       { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter','system-ui',sans-serif" },
  nav:        { background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', position: 'sticky', top: 0, zIndex: 100 },
  logo:       { display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700', fontSize: '17px' },
  badge:      { background: '#0f2a1a', color: C.green, fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' },
  navBtn:     { background: 'transparent', border: '1px solid #2d2d44', color: '#94a3b8', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  main:       { padding: '32px 28px', maxWidth: '900px', margin: '0 auto' },
  h1:         { fontSize: '24px', fontWeight: '800', margin: '0 0 6px' },
  sub:        { color: C.muted, fontSize: '14px', marginBottom: '28px' },
  summGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px', marginBottom: '32px' },
  summCard:   { background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px' },
  summLabel:  { color: C.muted, fontSize: '12px', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' },
  summVal:    { fontSize: '28px', fontWeight: '800' },
  fineCard:   { background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px', marginBottom: '12px', transition: 'border-color 0.15s' },
  cardTop:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  cardTitle:  { fontWeight: '800', fontSize: '15px', marginBottom: '4px' },
  cardSub:    { color: '#94a3b8', fontSize: '13px' },
  fineAmt:    { color: C.red, fontWeight: '800', fontSize: '22px' },
  metaRow:    { display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap' },
  metaItem:   { fontSize: '13px', color: C.muted },
  metaVal:    { color: C.text, fontWeight: '600' },
  statusBadge:{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  empty:      { textAlign: 'center', padding: '80px 20px', color: C.muted },
}

export default function MyFines() {
  const navigate          = useNavigate()
  const { user, profile } = useAuth()
  const { active, history, stats, loading } = useStudentBooks(user?.id)

  // All transactions with fine > 0 OR currently overdue
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const allTxns = [...active, ...history]

  // Currently accruing fines (active + overdue)
  const accruingFines = active.filter(t => new Date(t.due_date) < today)
  // Historical fines (returned books with fine_amount > 0)
  const historicalFines = history.filter(t => t.fine_amount > 0)

  const totalHistoricalFine = historicalFines.reduce((s, t) => s + (Number(t.fine_amount) || 0), 0)
  const totalAccruing = accruingFines.reduce((s, t) => {
    const { fine } = calculateFine(t.due_date)
    return s + fine
  }, 0)
  const grandTotal = totalHistoricalFine + totalAccruing

  if (loading) {
    return (
      <div style={S.page}>
        <nav style={S.nav}>
          <div style={S.logo}>
            <span style={{ background: 'linear-gradient(135deg,#10b981,#059669)', borderRadius: '8px', padding: '7px', fontSize: '16px' }}>📚</span>
            Smart Library ERP <span style={S.badge}>STUDENT</span>
          </div>
          <button type="button" style={S.navBtn} onClick={() => navigate('/student/dashboard')}>← Dashboard</button>
        </nav>
        <div style={{ textAlign: 'center', padding: '80px', color: C.muted }}>Loading fines...</div>
      </div>
    )
  }

  return (
    <div style={S.page}>
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
        <h1 style={S.h1}>My Fines</h1>
        <p style={S.sub}>Overdue fines and payment history.</p>

        {/* Summary */}
        <div style={S.summGrid}>
          <div style={S.summCard}>
            <div style={S.summLabel}>Total Outstanding</div>
            <div style={{ ...S.summVal, color: grandTotal > 0 ? C.red : C.green }}>₹{grandTotal}</div>
          </div>
          <div style={S.summCard}>
            <div style={S.summLabel}>Accruing Now</div>
            <div style={{ ...S.summVal, color: totalAccruing > 0 ? C.yellow : C.green }}>₹{totalAccruing}</div>
          </div>
          <div style={S.summCard}>
            <div style={S.summLabel}>Historical Fines</div>
            <div style={{ ...S.summVal, color: C.violet }}>₹{totalHistoricalFine}</div>
          </div>
          <div style={S.summCard}>
            <div style={S.summLabel}>Overdue Books</div>
            <div style={{ ...S.summVal, color: accruingFines.length > 0 ? C.red : C.green }}>{accruingFines.length}</div>
          </div>
        </div>

        {grandTotal === 0 && accruingFines.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: '48px', marginBottom: '14px' }}>🎉</div>
            <div style={{ fontWeight: '800', fontSize: '18px', color: C.text, marginBottom: '8px' }}>No Fines!</div>
            <div>Great job! You have no outstanding fines. Keep returning books on time.</div>
          </div>
        ) : (
          <>
            {/* Accruing fines */}
            {accruingFines.length > 0 && (
              <>
                <h2 style={{ fontSize: '13px', fontWeight: '800', color: C.red, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
                  🚨 Currently Accruing ({accruingFines.length})
                </h2>
                {accruingFines.map(t => {
                  const { overdueDays, fine } = calculateFine(t.due_date)
                  return (
                    <div key={t.id}
                      style={{ ...S.fineCard, borderColor: 'rgba(248,113,113,0.3)' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(248,113,113,0.5)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)'}
                    >
                      <div style={S.cardTop}>
                        <div>
                          <div style={S.cardTitle}>{t.books?.title}</div>
                          <div style={S.cardSub}>by {t.books?.author}</div>
                        </div>
                        <div style={S.fineAmt}>₹{fine}</div>
                      </div>
                      <div style={S.metaRow}>
                        <div style={S.metaItem}>Issued: <span style={S.metaVal}>{t.issue_date}</span></div>
                        <div style={S.metaItem}>Due: <span style={{ ...S.metaVal, color: C.red }}>{t.due_date}</span></div>
                        <div style={S.metaItem}>Overdue: <span style={{ ...S.metaVal, color: C.yellow }}>{overdueDays} day(s)</span></div>
                      </div>
                      <div style={{ color: C.red, fontSize: '12px', marginTop: '10px', fontStyle: 'italic' }}>
                        Fine = {overdueDays} days × ₹2/day = ₹{fine}. Please return immediately.
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* Historical fines */}
            {historicalFines.length > 0 && (
              <>
                <h2 style={{ fontSize: '13px', fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '28px 0 14px' }}>
                  Historical Fines ({historicalFines.length})
                </h2>
                {historicalFines.map(t => (
                  <div key={t.id}
                    style={S.fineCard}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#2d2d44'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                  >
                    <div style={S.cardTop}>
                      <div>
                        <div style={S.cardTitle}>{t.books?.title}</div>
                        <div style={S.cardSub}>by {t.books?.author}</div>
                      </div>
                      <div style={{ color: C.violet, fontWeight: '800', fontSize: '18px' }}>₹{t.fine_amount}</div>
                    </div>
                    <div style={S.metaRow}>
                      <div style={S.metaItem}>Issued: <span style={S.metaVal}>{t.issue_date}</span></div>
                      <div style={S.metaItem}>Due: <span style={S.metaVal}>{t.due_date}</span></div>
                      <div style={S.metaItem}>Returned: <span style={{ ...S.metaVal, color: C.green }}>{t.return_date}</span></div>
                      <div style={S.metaItem}>Status: <span style={{ ...S.statusBadge, background: '#1e1e3f', color: '#818cf8' }}>Returned</span></div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

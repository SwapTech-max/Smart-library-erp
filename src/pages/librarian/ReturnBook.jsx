import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useReturnBook } from '../../hooks/useTransactions'
import { calculateFine } from '../../services/transactionService'
import { logActivity } from '../../services/attendanceService'
import { useToast } from '../../components/Toast/ToastProvider'

const C = {
  bg: '#0a0a0f', surface: '#111118', surface2: '#0f0f1a',
  border: '#1e1e2e', border2: '#2d2d44', text: '#f1f5f9',
  muted: '#64748b', accent: '#6366f1', accentD: '#8b5cf6',
  green: '#4ade80', red: '#f87171', yellow: '#fbbf24',
}

const S = {
  page:       { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter','system-ui',sans-serif" },
  nav:        { background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', position: 'sticky', top: 0, zIndex: 100 },
  logo:       { display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700', fontSize: '17px' },
  badge:      { background: '#1e1e3f', color: '#818cf8', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' },
  navBtn:     { background: 'transparent', border: `1px solid ${C.border2}`, color: '#94a3b8', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  main:       { padding: '32px 28px', maxWidth: '760px', margin: '0 auto' },
  h1:         { fontSize: '26px', fontWeight: '800', margin: 0 },
  sub:        { color: C.muted, fontSize: '14px', marginTop: '6px', marginBottom: '32px' },
  card:       { background: C.surface, border: `1px solid ${C.border}`, borderRadius: '18px', padding: '28px' },
  sLabel:     { display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' },
  searchRow:  { display: 'flex', gap: '10px' },
  input:      { flex: 1, background: C.bg, border: `1px solid ${C.border2}`, color: C.text, padding: '11px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none' },
  searchBtn:  { background: '#1e1e3f', color: '#818cf8', border: 'none', padding: '11px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' },
  errBox:     { background: '#2a0f0f', border: '1px solid #991b1b', borderRadius: '10px', padding: '12px 16px', color: C.red, fontSize: '14px', marginTop: '12px' },
  divider:    { border: 'none', borderTop: `1px solid ${C.border}`, margin: '24px 0' },
  txnCard:    { background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: '12px', padding: '16px', marginBottom: '10px', cursor: 'pointer', transition: 'all 0.15s' },
  txnTitle:   { fontWeight: '700', fontSize: '15px', marginBottom: '4px' },
  txnSub:     { color: C.muted, fontSize: '13px', marginBottom: '6px' },
  overdueBadge: { background: '#2a1a0f', color: C.yellow, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block' },
  ontimeBadge:  { background: '#0f2a1a', color: C.green, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block' },
  summaryBox: { background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: '14px', padding: '20px' },
  summRow:    { display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '10px' },
  summLabel:  { color: C.muted },
  summVal:    { fontWeight: '600' },
  fineAmt:    { color: C.red, fontWeight: '800', fontSize: '22px' },
  fineZero:   { color: C.green, fontWeight: '800', fontSize: '22px' },
  returnBtn:  { width: '100%', background: `linear-gradient(135deg,${C.accent},${C.accentD})`, color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: '16px', marginTop: '16px', letterSpacing: '0.02em' },
  successBox: { background: '#0f2a1a', border: '1px solid #166534', borderRadius: '14px', padding: '28px', textAlign: 'center' },
  successIcon:{ fontSize: '40px', marginBottom: '10px' },
  successTitle: { color: C.green, fontWeight: '800', fontSize: '20px', marginBottom: '6px' },
  detailBox:  { background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '16px', textAlign: 'left', margin: '16px 0' },
  detailRow:  { display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' },
  detailLabel:{ color: C.muted },
  detailVal:  { fontWeight: '600' },
  resetBtn:   { background: `linear-gradient(135deg,${C.accent},${C.accentD})`, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
}

export default function ReturnBook() {
  const { profile }  = useAuth()
  const navigate     = useNavigate()
  const { addToast } = useToast()
  const { doReturn, loading: returning, error: returnErr, result: returned, reset } = useReturnBook()

  const [emailQuery, setEmailQuery]   = useState('')
  const [searching, setSearching]     = useState(false)
  const [searchErr, setSearchErr]     = useState('')
  const [transactions, setTransactions] = useState([])
  const [studentInfo, setStudentInfo] = useState(null)
  const [selected, setSelected]       = useState(null)

  async function handleSearch() {
    setSearchErr(''); setTransactions([]); setSelected(null); setStudentInfo(null)
    const q = emailQuery.trim()
    if (!q) { setSearchErr('Enter student email or Library ID.'); return }
    setSearching(true)

    // Find student
    const { data: student } = await supabase
      .from('users')
      .select('id,full_name,email,branch,year,library_id')
      .eq('role', 'STUDENT')
      .or(`email.eq.${q},library_id.eq.${q}`)
      .limit(1)
      .maybeSingle()

    if (!student) { setSearchErr('Student not found.'); setSearching(false); return }

    // Find active transactions
    const { data: txns } = await supabase
      .from('transactions')
      .select('*, books(id,title,author,rack_number,category)')
      .eq('student_id', student.id)
      .in('status', ['issued', 'overdue'])
      .order('due_date', { ascending: true })

    setSearching(false)
    setStudentInfo(student)

    if (!txns || txns.length === 0) {
      setSearchErr(`No active issued books found for ${student.full_name}.`)
      return
    }
    setTransactions(txns)
  }

  async function handleReturn() {
    if (!selected) return
    try {
      await doReturn({ transactionId: selected.id, finePerDay: 2 })
      // Log activity + toast
      const fine = calculateFine(selected.due_date).fine
      addToast(`"${selected.books?.title}" returned by ${studentInfo?.full_name} ✓`, fine > 0 ? 'warning' : 'success')
      await logActivity(
        `${studentInfo?.full_name} returned "${selected.books?.title}"${fine > 0 ? ` — fine ₹${fine}` : ''}`,
        'book_returned',
        profile?.full_name || 'Librarian'
      )
    } catch (_) {
      // error displayed via hook
    }
  }

  function handleReset() {
    reset()
    setEmailQuery(''); setTransactions([]); setSelected(null)
    setSearchErr(''); setStudentInfo(null)
  }

  const today = new Date().toISOString().split('T')[0]
  const fineInfo = selected ? calculateFine(selected.due_date, today) : null

  // ─── Success State ────────────────────────────────────────
  if (returned) {
    const { fine } = calculateFine(returned.due_date, returned.return_date)
    return (
      <div style={S.page}>
        <div style={S.main}>
          <div style={S.card}>
            <div style={S.successBox}>
              <div style={S.successIcon}>✅</div>
              <div style={S.successTitle}>Book Returned Successfully!</div>
              <div style={{ color: '#86efac', fontSize: '14px', marginBottom: '16px' }}>
                Inventory has been updated automatically.
              </div>
              <div style={S.detailBox}>
                <div style={S.detailRow}><span style={S.detailLabel}>Student</span><span style={S.detailVal}>{studentInfo?.full_name}</span></div>
                <div style={S.detailRow}><span style={S.detailLabel}>Book</span><span style={S.detailVal}>{selected?.books?.title}</span></div>
                <div style={S.detailRow}><span style={S.detailLabel}>Issue Date</span><span style={S.detailVal}>{returned.issue_date}</span></div>
                <div style={S.detailRow}><span style={S.detailLabel}>Due Date</span><span style={S.detailVal}>{returned.due_date}</span></div>
                <div style={S.detailRow}><span style={S.detailLabel}>Return Date</span><span style={{ ...S.detailVal, color: C.green }}>{returned.return_date}</span></div>
                <div style={{ ...S.detailRow, marginBottom: 0, borderTop: `1px solid ${C.border}`, paddingTop: '10px', marginTop: '4px' }}>
                  <span style={S.detailLabel}>Fine Charged</span>
                  <span style={{ ...S.detailVal, color: fine > 0 ? C.red : C.green }}>₹{fine}</span>
                </div>
              </div>
              {fine > 0 && (
                <div style={{ color: C.yellow, fontSize: '13px', marginBottom: '16px' }}>
                  Overdue by {fineInfo?.overdueDays ?? returned.fine_amount / 2} day(s) × ₹2/day
                </div>
              )}
              <button type="button" style={S.resetBtn} onClick={handleReset}>Return Another Book</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <style>{`input:focus{border-color:#6366f1!important;box-shadow:0 0 0 3px rgba(99,102,241,0.15);}button:disabled{opacity:0.6;cursor:not-allowed;}`}</style>
      <div style={S.main}>
        <h1 style={S.h1}>📥 Return Book</h1>
        <p style={S.sub}>Process a book return and auto-calculate fine.</p>

        <div style={S.card}>
          {/* Search */}
          <div>
            <label style={S.sLabel}>Student Email or Library ID</label>
            <div style={S.searchRow}>
              <input
                style={S.input}
                placeholder="student@email.com or LIB-001"
                value={emailQuery}
                onChange={e => setEmailQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <button type="button" style={S.searchBtn} onClick={handleSearch} disabled={searching}>
                {searching ? '...' : 'Search'}
              </button>
            </div>
            {searchErr && <div style={S.errBox}>{searchErr}</div>}
          </div>

          {/* Student info bar */}
          {studentInfo && (
            <div style={{ background: '#1e1e3f', borderRadius: '10px', padding: '12px 16px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: '700' }}>{studentInfo.full_name}</span>
                <span style={{ color: '#818cf8', fontSize: '13px', marginLeft: '10px' }}>{studentInfo.email}</span>
              </div>
              <span style={{ color: C.muted, fontSize: '13px' }}>{studentInfo.branch} · Yr {studentInfo.year}</span>
            </div>
          )}

          {/* Transaction list */}
          {transactions.length > 0 && (
            <>
              <hr style={S.divider} />
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                Select Book to Return
              </div>
              {transactions.map(t => {
                const { overdueDays, fine, isOverdue } = calculateFine(t.due_date, today)
                const sel = selected?.id === t.id
                return (
                  <div
                    key={t.id}
                    style={{
                      ...S.txnCard,
                      border: sel ? '2px solid #6366f1' : `1px solid ${C.border2}`,
                      background: sel ? '#13131f' : C.surface2,
                    }}
                    onClick={() => setSelected(t)}
                  >
                    <div style={S.txnTitle}>{t.books?.title}</div>
                    <div style={S.txnSub}>by {t.books?.author} · Rack: {t.books?.rack_number || '—'}</div>
                    <div style={{ color: C.muted, fontSize: '12px', marginBottom: '8px' }}>
                      Issued: {t.issue_date} · Due: {t.due_date}
                    </div>
                    <span style={isOverdue ? S.overdueBadge : S.ontimeBadge}>
                      {isOverdue ? `⚠ Overdue ${overdueDays}d — ₹${fine} fine` : '✓ On time'}
                    </span>
                  </div>
                )
              })}
            </>
          )}

          {/* Return summary */}
          {selected && fineInfo && (
            <>
              <hr style={S.divider} />
              <div style={S.summaryBox}>
                <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '16px' }}>Return Summary</div>
                <div style={S.summRow}><span style={S.summLabel}>Student</span><strong>{studentInfo?.full_name}</strong></div>
                <div style={S.summRow}><span style={S.summLabel}>Book</span><strong>{selected.books?.title}</strong></div>
                <div style={S.summRow}><span style={S.summLabel}>Issue Date</span><span>{selected.issue_date}</span></div>
                <div style={S.summRow}><span style={S.summLabel}>Due Date</span><span>{selected.due_date}</span></div>
                <div style={S.summRow}><span style={S.summLabel}>Return Date</span><span style={{ color: C.green }}>{today}</span></div>
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '12px', marginTop: '4px' }}>
                  <div style={S.summRow}>
                    <span style={S.summLabel}>Fine Amount</span>
                    <span style={fineInfo.isOverdue ? S.fineAmt : S.fineZero}>₹{fineInfo.fine}</span>
                  </div>
                  {fineInfo.isOverdue && (
                    <div style={{ color: C.red, fontSize: '12px', textAlign: 'right' }}>
                      Overdue by {fineInfo.overdueDays} day(s) × ₹2/day
                    </div>
                  )}
                  {!fineInfo.isOverdue && (
                    <div style={{ color: C.green, fontSize: '12px', textAlign: 'right' }}>
                      Returned on time — no fine! 🎉
                    </div>
                  )}
                </div>
              </div>
              {returnErr && <div style={S.errBox}>{returnErr}</div>}
              <button type="button" style={S.returnBtn} onClick={handleReturn} disabled={returning}>
                {returning ? 'Processing...' : fineInfo.fine > 0 ? `Confirm Return & Collect ₹${fineInfo.fine}` : 'Confirm Return'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

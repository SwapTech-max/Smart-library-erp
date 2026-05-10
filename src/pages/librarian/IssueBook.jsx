import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useIssueBook } from '../../hooks/useTransactions'
import { getDueDate, calculateFine } from '../../services/transactionService'
import { logActivity } from '../../services/attendanceService'
import { useToast } from '../../components/Toast/ToastProvider'

const C = {
  bg: '#0a0a0f', surface: '#111118', surface2: '#0f0f1a',
  border: '#1e1e2e', border2: '#2d2d44', text: '#f1f5f9',
  muted: '#64748b', accent: '#6366f1', accentD: '#8b5cf6',
  green: '#4ade80', red: '#f87171', yellow: '#fbbf24', cyan: '#06b6d4',
}

const S = {
  page:        { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter','system-ui',sans-serif" },
  nav:         { background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', position: 'sticky', top: 0, zIndex: 100 },
  logo:        { display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700', fontSize: '17px' },
  badge:       { background: '#1e1e3f', color: '#818cf8', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' },
  navBtn:      { background: 'transparent', border: `1px solid ${C.border2}`, color: '#94a3b8', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  main:        { padding: '32px 28px', maxWidth: '760px', margin: '0 auto' },
  h1:          { fontSize: '26px', fontWeight: '800', margin: 0 },
  sub:         { color: C.muted, fontSize: '14px', marginTop: '6px', marginBottom: '32px' },
  card:        { background: C.surface, border: `1px solid ${C.border}`, borderRadius: '18px', padding: '28px' },
  stepTag:     { fontSize: '11px', fontWeight: '800', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' },
  sLabel:      { display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' },
  searchRow:   { display: 'flex', gap: '10px', marginBottom: '12px' },
  input:       { flex: 1, background: C.bg, border: `1px solid ${C.border2}`, color: C.text, padding: '11px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none' },
  searchBtn:   { background: '#1e1e3f', color: '#818cf8', border: 'none', padding: '11px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', whiteSpace: 'nowrap' },
  resultCard:  { background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: '12px', padding: '14px 16px' },
  resultName:  { fontWeight: '700', fontSize: '15px', marginBottom: '4px' },
  resultSub:   { color: C.muted, fontSize: '13px' },
  avail:       { background: '#0f2a1a', color: C.green, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block', marginTop: '8px' },
  unavail:     { background: '#2a0f0f', color: C.red, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block', marginTop: '8px' },
  divider:     { border: 'none', borderTop: `1px solid ${C.border}`, margin: '24px 0' },
  dueBox:      { background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' },
  dueLabel:    { color: C.muted, fontSize: '13px' },
  dueVal:      { color: C.yellow, fontWeight: '700', fontSize: '15px' },
  issueBtn:    { width: '100%', background: `linear-gradient(135deg,${C.accent},${C.accentD})`, color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: '16px', marginTop: '20px', letterSpacing: '0.02em' },
  disabledBtn: { width: '100%', background: '#1e1e2e', color: C.muted, border: 'none', padding: '14px', borderRadius: '12px', cursor: 'not-allowed', fontWeight: '700', fontSize: '16px', marginTop: '20px' },
  errBox:      { background: '#2a0f0f', border: `1px solid #991b1b`, borderRadius: '10px', padding: '12px 16px', color: C.red, fontSize: '14px', marginTop: '12px' },
  successBox:  { background: '#0f2a1a', border: `1px solid #166534`, borderRadius: '14px', padding: '24px', textAlign: 'center' },
  successIcon: { fontSize: '40px', marginBottom: '10px' },
  successTitle:{ color: C.green, fontWeight: '800', fontSize: '20px', marginBottom: '6px' },
  successSub:  { color: '#86efac', fontSize: '14px', marginBottom: '16px' },
  detailBox:   { background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '16px', textAlign: 'left', marginBottom: '16px' },
  detailRow:   { display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' },
  detailLabel: { color: C.muted },
  detailVal:   { fontWeight: '600' },
  resetBtn:    { background: `linear-gradient(135deg,${C.accent},${C.accentD})`, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  hint:        { color: C.muted, fontSize: '13px', textAlign: 'center', marginTop: '14px' },
  checkmark:   { color: C.green, marginRight: '6px' },
}

export default function IssueBook() {
  const { profile }                  = useAuth()
  const navigate                     = useNavigate()
  const { addToast }                 = useToast()
  const { issue, loading: issuing, error: issueErr, result: issued, reset } = useIssueBook()

  const [studentQuery, setStudentQuery] = useState('')
  const [bookQuery, setBookQuery]       = useState('')
  const [student, setStudent]           = useState(null)
  const [book, setBook]                 = useState(null)
  const [studentErr, setStudentErr]     = useState('')
  const [bookErr, setBookErr]           = useState('')
  const [searchingStudent, setSearchingStudent] = useState(false)
  const [searchingBook, setSearchingBook]       = useState(false)
  // NEW CODE START
  // Rule 1: track how many books student currently has (max 5)
  const [borrowCount, setBorrowCount]           = useState(null)  // null = not checked yet
  const [borrowCountLoading, setBorrowCountLoading] = useState(false)
  // NEW CODE END

  async function searchStudent() {
    setStudentErr(''); setStudent(null)
    const q = studentQuery.trim()
    if (!q) { setStudentErr('Enter student email or Library ID.'); return }
    setSearchingStudent(true)
    const { data, error } = await supabase
      .from('users')
      .select('id,full_name,email,branch,year,library_id,roll_number')
      .eq('role', 'STUDENT')
      .or(`email.eq.${q},library_id.eq.${q},roll_number.eq.${q}`)
      .limit(1)
      .maybeSingle()
    setSearchingStudent(false)
    if (error || !data) { setStudentErr('Student not found. Try their email, Library ID or roll number.'); return }
    setStudent(data)
    // NEW CODE START
    // Rule 1: fetch current active borrow count for this student
    setBorrowCountLoading(true)
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', data.id)
      .eq('status', 'issued')
    setBorrowCount(count || 0)
    setBorrowCountLoading(false)
    // NEW CODE END
  }

  async function searchBook() {
    setBookErr(''); setBook(null)
    const q = bookQuery.trim()
    if (!q) { setBookErr('Enter book title or ISBN.'); return }
    setSearchingBook(true)
    // Try ISBN exact match first, then title ilike
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .or(`isbn.eq.${q},title.ilike.%${q}%`)
      .limit(1)
      .maybeSingle()
    setSearchingBook(false)
    if (error || !data) { setBookErr('Book not found. Try the exact title or ISBN.'); return }
    setBook(data)
  }

  async function handleIssue() {
    if (!student || !book) return
    if (book.available_copies < 1) return
    // NEW CODE START
    // Rule 1: block if student already holds 5 books
    if (borrowCount >= 5) {
      addToast('Cannot issue — student has reached maximum limit (5/5 books)', 'error')
      return
    }
    // NEW CODE END

    try {
      await issue({
        studentId: student.id,
        bookId: book.id,
        issuedBy: profile.id,
        // OLD CODE START
        // dueDays: 14,  // OLD: 14-day loan
        // OLD CODE END
        // NEW CODE START
        dueDays: 30,    // NEW: Rule 2 — 30-day loan period
        // NEW CODE END
      })
      // Log activity + toast
      addToast(`${student.full_name} issued "${book.title}" ✓`, 'success')
      await logActivity(
        `${student.full_name} issued "${book.title}"`,
        'book_issued',
        profile?.full_name || 'Librarian'
      )
      // NEW CODE START
      // Update local borrow count after successful issue
      setBorrowCount(prev => (prev !== null ? prev + 1 : 1))
      // NEW CODE END
    } catch (_) {
      // error displayed via hook
    }
  }

  function handleReset() {
    reset()
    setStudentQuery(''); setBookQuery('')
    setStudent(null); setBook(null)
    setStudentErr(''); setBookErr('')
  }

  // OLD CODE START
  // const canIssue = student && book && book.available_copies > 0 && !issuing
  // const dueDate  = getDueDate(null, 14)  // OLD: 14-day
  // OLD CODE END
  // NEW CODE START
  const atLimit  = borrowCount !== null && borrowCount >= 5  // Rule 1
  const canIssue = student && book && book.available_copies > 0 && !issuing && !atLimit
  const dueDate  = getDueDate(null, 30)  // Rule 2: 30-day loan
  // NEW CODE END

  if (issued) {
    return (
      <div style={S.page}>
        <div style={S.main}>
          <div style={S.card}>
            <div style={S.successBox}>
              <div style={S.successIcon}>✅</div>
              <div style={S.successTitle}>Book Issued Successfully!</div>
              <div style={S.successSub}>The book has been issued and inventory updated.</div>
              <div style={S.detailBox}>
                <div style={S.detailRow}><span style={S.detailLabel}>Student</span><span style={S.detailVal}>{student?.full_name}</span></div>
                <div style={S.detailRow}><span style={S.detailLabel}>Book</span><span style={S.detailVal}>{book?.title}</span></div>
                <div style={S.detailRow}><span style={S.detailLabel}>Issue Date</span><span style={S.detailVal}>{issued.issue_date}</span></div>
                <div style={S.detailRow}><span style={S.detailLabel}>Due Date</span><span style={{ ...S.detailVal, color: C.yellow }}>{issued.due_date}</span></div>
                <div style={{ ...S.detailRow, marginBottom: 0 }}><span style={S.detailLabel}>Fine Rate</span><span style={S.detailVal}>₹5/day after due</span></div>
              </div>
              <button type="button" style={S.resetBtn} onClick={handleReset}>Issue Another Book</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <style>{`
        input:focus{border-color:#6366f1!important;box-shadow:0 0 0 3px rgba(99,102,241,0.15);}
        button:disabled{opacity:0.6;cursor:not-allowed;}
      `}</style>
      <div style={S.main}>
        <h1 style={S.h1}>📤 Issue Book</h1>
        <p style={S.sub}>Search for a student and a book to issue.</p>

        <div style={S.card}>
          {/* Step 1 — Student */}
          <div>
            <div style={S.stepTag}>Step 1 — Find Student</div>
            <label style={S.sLabel}>Email / Library ID / Roll Number</label>
            <div style={S.searchRow}>
              <input
                style={S.input}
                placeholder="student@email.com or LIB-001 or CS2024001"
                value={studentQuery}
                onChange={e => setStudentQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchStudent()}
              />
              <button type="button" style={S.searchBtn} onClick={searchStudent} disabled={searchingStudent}>
                {searchingStudent ? '...' : 'Search'}
              </button>
            </div>
            {studentErr && <div style={S.errBox}>{studentErr}</div>}
            {student && (
              <div style={S.resultCard}>
                <div style={S.resultName}><span style={S.checkmark}>✓</span>{student.full_name}</div>
                <div style={S.resultSub}>{student.email}</div>
                <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
                  {student.branch || '—'} · Year {student.year || '—'} · {student.library_id || 'No Library ID'}
                </div>
                {/* NEW CODE START — borrow count indicator (Rule 1: max 5) */}
                {borrowCountLoading ? (
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>Checking borrow limit...</div>
                ) : borrowCount !== null && (
                  <div style={{
                    marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 12px', borderRadius: '8px',
                    background: borrowCount >= 5 ? 'rgba(248,113,113,0.1)'
                      : borrowCount >= 3 ? 'rgba(251,191,36,0.1)'
                      : 'rgba(74,222,128,0.08)',
                    border: `1px solid ${borrowCount >= 5 ? 'rgba(248,113,113,0.3)'
                      : borrowCount >= 3 ? 'rgba(251,191,36,0.3)'
                      : 'rgba(74,222,128,0.25)'}`,
                  }}>
                    {/* Progress bar */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Books borrowed</span>
                        <span style={{
                          fontSize: '12px', fontWeight: '800',
                          color: borrowCount >= 5 ? '#f87171' : borrowCount >= 3 ? '#fbbf24' : '#4ade80',
                        }}>
                          {borrowCount} / 5
                        </span>
                      </div>
                      <div style={{ height: '5px', background: '#1e1e2e', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '3px',
                          width: `${(borrowCount / 5) * 100}%`,
                          background: borrowCount >= 5 ? '#f87171' : borrowCount >= 3 ? '#fbbf24' : '#4ade80',
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>
                  </div>
                )}
                {/* NEW CODE END */}
              </div>
            )}
          </div>

          <hr style={S.divider} />

          {/* Step 2 — Book */}
          <div>
            <div style={S.stepTag}>Step 2 — Find Book</div>
            <label style={S.sLabel}>Title or ISBN</label>
            <div style={S.searchRow}>
              <input
                style={S.input}
                placeholder="Book title or ISBN number..."
                value={bookQuery}
                onChange={e => setBookQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchBook()}
              />
              <button type="button" style={S.searchBtn} onClick={searchBook} disabled={searchingBook}>
                {searchingBook ? '...' : 'Search'}
              </button>
            </div>
            {bookErr && <div style={S.errBox}>{bookErr}</div>}
            {book && (
              <div style={S.resultCard}>
                <div style={S.resultName}>{book.title}</div>
                <div style={S.resultSub}>by {book.author} · {book.category} · Rack: {book.rack_number || '—'}</div>
                <div style={{ color: C.muted, fontSize: '13px', marginTop: '4px' }}>
                  {book.total_copies} total · {book.issued_copies} issued
                </div>
                <span style={book.available_copies > 0 ? S.avail : S.unavail}>
                  {book.available_copies > 0 ? `${book.available_copies} copies available` : '⚠ Not available'}
                </span>
              </div>
            )}
          </div>

          <hr style={S.divider} />

          {/* Summary */}
          {student && book && (
            <div style={S.dueBox}>
              {/* OLD CODE START */}
              {/* <span style={S.dueLabel}>📅 Due Date (14 days)</span> */}
              {/* OLD CODE END */}
              {/* NEW CODE START */}
              <span style={S.dueLabel}>📅 Due Date (30 days — Rule 2)</span>
              {/* NEW CODE END */}
              <span style={S.dueVal}>{dueDate}</span>
            </div>
          )}

          {issueErr && <div style={S.errBox}>{issueErr}</div>}

          <button
            type="button"
            style={canIssue ? S.issueBtn : S.disabledBtn}
            onClick={handleIssue}
            disabled={!canIssue}
          >
            {issuing ? 'Issuing...' : 'Issue Book'}
          </button>

          {(!student || !book) && (
            <p style={S.hint}>Search and confirm both student and book above to proceed.</p>
          )}
          {student && book && book.available_copies < 1 && (
            <p style={{ ...S.hint, color: C.red }}>⚠ No copies available — cannot issue this book.</p>
          )}
          {/* NEW CODE START — Rule 1: max 5 books warning */}
          {student && atLimit && (
            <div style={{
              marginTop: '12px', background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.3)', borderRadius: '10px',
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span style={{ fontSize: '20px' }}>🚫</span>
              <div>
                <div style={{ color: '#f87171', fontWeight: '700', fontSize: '14px' }}>
                  Maximum book limit reached (5/5)
                </div>
                <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
                  Student must return a book before borrowing another.
                </div>
              </div>
            </div>
          )}
          {/* NEW CODE END */}
        </div>
      </div>
    </div>
  )
}

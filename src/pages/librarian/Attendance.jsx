import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useAttendance } from '../../hooks/useAttendance'
import { markAttendance, logActivity } from '../../services/attendanceService'
import { useToast } from '../../components/Toast/ToastProvider'

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#0a0a0f', surface: '#111118', surface2: '#0f0f1a',
  border: '#1e1e2e', border2: '#2d2d44',
  text: '#f1f5f9', muted: '#64748b',
  green: '#4ade80', red: '#f87171', yellow: '#fbbf24',
  violet: '#8b5cf6', cyan: '#06b6d4', purple: '#c084fc',
}

// ── Sub-components ───────────────────────────────────────────────────────────

/** Shows a coloured chip for the current attendance status */
function StatusChip({ status }) {
  if (!status) return (
    <span style={{
      padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
      background: 'rgba(100,116,139,0.15)', color: '#64748b', textTransform: 'uppercase',
    }}>
      Not Marked
    </span>
  )
  // DB stores uppercase — 'PRESENT' / 'ABSENT'
  const cfg = status === 'PRESENT'
    ? { bg: 'rgba(74,222,128,0.12)', color: C.green, label: '✓ Present' }
    : { bg: 'rgba(248,113,113,0.12)', color: C.red,   label: '✕ Absent' }
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
      background: cfg.bg, color: cfg.color, textTransform: 'uppercase',
    }}>
      {cfg.label}
    </span>
  )
}

/** Top-level summary card (Total / Present / Absent / Not Marked) */
function SummaryCard({ label, value, icon, color }) {
  return (
    <div
      style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px',
        padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px',
        transition: 'border-color 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px',
        background: `${color}18`, border: `1px solid ${color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '20px', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '26px', fontWeight: '800', color, lineHeight: 1 }}>{value ?? '—'}</div>
        <div style={{ color: C.muted, fontSize: '12px', fontWeight: '500', marginTop: '4px' }}>{label}</div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const { profile } = useAuth()
  const { addToast } = useToast()

  // useAttendance: fetches all records + live realtime subscription
  const {
    attendance,
    loading: attLoading,
    presentToday,
    absentToday,
    refetch,
  } = useAttendance()  // no studentId → librarian sees all

  const [students, setStudents]         = useState([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  // marking: { [studentId]: 'PRESENT' | 'ABSENT' | null }  — tracks in-flight requests
  const [marking, setMarking]           = useState({})
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('all')  // 'all' | 'PRESENT' | 'ABSENT' | 'unmarked'

  // ── Fetch student list once on mount ──────────────────────────
  useEffect(() => {
    async function loadStudents() {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, roll_number, branch, year, email')
        .eq('role', 'STUDENT')
        .order('full_name', { ascending: true })
      setStudents(data || [])
      setLoadingStudents(false)
    }
    loadStudents()
  }, [])

  // ── Today's date string (ISO YYYY-MM-DD) ─────────────────────
  const todayStr = new Date().toISOString().split('T')[0]

  /**
   * Build a map: { [student_id]: 'PRESENT' | 'ABSENT' }
   * Only today's records are used.
   */
  const todayMap = {}
  attendance
    .filter(a => a.date === todayStr)
    .forEach(a => { todayMap[a.student_id] = a.status })  // DB value is uppercase

  const totalStudents = students.length
  const notMarked     = totalStudents - (presentToday + absentToday)

  // ── Filtered student list (search + status filter) ────────────
  const filtered = students
    .filter(s => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        s.full_name?.toLowerCase().includes(q) ||
        s.roll_number?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      )
    })
    .filter(s => {
      const status = todayMap[s.id]
      if (filterStatus === 'PRESENT')  return status === 'PRESENT'
      if (filterStatus === 'ABSENT')   return status === 'ABSENT'
      if (filterStatus === 'unmarked') return !status
      return true
    })

  // ── Mark attendance handler ───────────────────────────────────
  /**
   * Handles both fresh marks and re-marks.
   * markAttendance() returns { alreadyMarked, error }.
   *  - alreadyMarked=true  → was re-marked (status updated), show info toast
   *  - alreadyMarked=false → fresh insert, show success toast
   *  - error               → show error toast
   */
  async function handleMark(student, status) {
    // Lock the buttons for this student while request is in flight
    setMarking(prev => ({ ...prev, [student.id]: status }))

    const { alreadyMarked, error } = await markAttendance({
      studentId: student.id,
      status,                        // 'PRESENT' or 'ABSENT' (uppercase from button)
      markedBy: profile?.id ?? null,
    })

    if (error) {
      addToast(`Error marking ${student.full_name}: ${error.message}`, 'error')
    } else {
      const verb = status === 'PRESENT' ? 'Present' : 'Absent'

      if (alreadyMarked) {
        // Re-mark: attendance existed, we updated it
        addToast(`${student.full_name} re-marked as ${verb}`, 'info')
      } else {
        // Fresh mark
        addToast(`${student.full_name} marked ${verb} ✓`, 'success')
      }

      // Log to activity feed regardless of insert/update
      await logActivity(
        `${student.full_name} marked ${verb}`,
        'attendance_marked',
        profile?.full_name || 'Librarian'
      )

      // Trigger a re-fetch so todayMap updates (realtime also handles it
      // but a manual refetch ensures consistency after the write)
      refetch()
    }

    // Unlock buttons
    setMarking(prev => ({ ...prev, [student.id]: null }))
  }

  // ── Filter tab config ─────────────────────────────────────────
  const filterBtns = [
    { key: 'all',      label: 'All',        count: totalStudents },
    { key: 'PRESENT',  label: 'Present',    count: presentToday },
    { key: 'ABSENT',   label: 'Absent',     count: absentToday },
    { key: 'unmarked', label: 'Not Marked', count: notMarked },
  ]

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter','system-ui',sans-serif" }}>
      <div style={{ padding: '36px 28px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0 }}>
              📅 Attendance —{' '}
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </h1>
            {/* LIVE badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '20px', padding: '3px 10px',
            }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444',
                animation: 'livePulse 1.5s ease-in-out infinite', display: 'inline-block',
              }} />
              <span style={{ color: '#f87171', fontSize: '11px', fontWeight: '700' }}>LIVE</span>
            </div>
          </div>
          <p style={{ color: C.muted, fontSize: '14px', margin: 0 }}>
            Mark student attendance. Updates sync in real-time across all dashboards.
          </p>
        </div>

        {/* ── Summary Cards ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
          gap: '14px', marginBottom: '32px',
        }}>
          <SummaryCard label="Total Students" value={totalStudents} icon="🎓" color={C.cyan} />
          <SummaryCard label="Present Today"  value={presentToday}  icon="✅" color={C.green} />
          <SummaryCard label="Absent Today"   value={absentToday}   icon="❌" color={C.red} />
          <SummaryCard label="Not Marked"     value={notMarked}     icon="⏳" color={C.yellow} />
        </div>

        {/* ── Search + Filter Bar ── */}
        <div style={{
          display: 'flex', gap: '12px', flexWrap: 'wrap',
          alignItems: 'center', marginBottom: '20px',
        }}>
          <input
            style={{
              flex: '1 1 220px', background: C.surface, border: `1px solid ${C.border2}`,
              color: C.text, padding: '10px 14px', borderRadius: '10px',
              fontSize: '14px', outline: 'none', minWidth: '200px',
            }}
            placeholder="🔍  Search by name, roll no or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {filterBtns.map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilterStatus(f.key)}
                style={{
                  background: filterStatus === f.key ? C.violet : C.surface,
                  color:      filterStatus === f.key ? '#fff'    : C.muted,
                  border: `1px solid ${filterStatus === f.key ? C.violet : C.border}`,
                  borderRadius: '8px', padding: '7px 14px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: '600', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {f.label}
                <span style={{
                  background: filterStatus === f.key ? 'rgba(255,255,255,0.2)' : C.border,
                  borderRadius: '20px', padding: '1px 7px',
                  fontSize: '11px', fontWeight: '800',
                }}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Student Table ── */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '16px', overflow: 'hidden',
        }}>
          {/* Table header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 180px',
            padding: '12px 20px', background: 'rgba(255,255,255,0.02)',
            borderBottom: `1px solid ${C.border}`, gap: '8px',
          }}>
            {['Student', 'Roll No.', 'Branch', "Today's Status", 'Mark Attendance'].map(h => (
              <div key={h} style={{
                color: C.muted, fontSize: '11px', fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {h}
              </div>
            ))}
          </div>

          {/* Loading / empty states */}
          {loadingStudents || attLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: C.muted }}>
              Loading students...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: C.muted }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔍</div>
              No students match your filter
            </div>
          ) : (
            <div style={{ maxHeight: '580px', overflowY: 'auto' }}>
              {filtered.map((student, idx) => {
                // Current attendance status for this student today (uppercase from DB)
                const currentStatus    = todayMap[student.id] || null
                const isMarkingPresent = marking[student.id] === 'PRESENT'
                const isMarkingAbsent  = marking[student.id] === 'ABSENT'
                const isBusy           = isMarkingPresent || isMarkingAbsent

                return (
                  <div
                    key={student.id}
                    style={{
                      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 180px',
                      padding: '14px 20px', gap: '8px', alignItems: 'center',
                      borderBottom: idx < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
                      // Subtle row tint based on current status
                      background:
                        currentStatus === 'PRESENT' ? 'rgba(74,222,128,0.03)' :
                        currentStatus === 'ABSENT'  ? 'rgba(248,113,113,0.03)' :
                        'transparent',
                      transition: 'background 0.2s',
                    }}
                  >
                    {/* Student name + email */}
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>
                        {student.full_name}
                      </div>
                      <div style={{ color: C.muted, fontSize: '12px' }}>{student.email}</div>
                    </div>

                    {/* Roll number */}
                    <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                      {student.roll_number || '—'}
                    </div>

                    {/* Branch */}
                    <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                      {student.branch || '—'}
                    </div>

                    {/* Current status chip */}
                    <div><StatusChip status={currentStatus} /></div>

                    {/* Present / Absent buttons */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {/* Present button */}
                      <button
                        type="button"
                        onClick={() => handleMark(student, 'PRESENT')}
                        disabled={isBusy}
                        style={{
                          flex: 1, padding: '7px 0', borderRadius: '8px',
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                          border: 'none', fontWeight: '700', fontSize: '12px',
                          // Highlighted when already present
                          background: currentStatus === 'PRESENT'
                            ? 'rgba(74,222,128,0.3)' : 'rgba(74,222,128,0.1)',
                          color: C.green,
                          opacity: isBusy ? 0.6 : 1,
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          if (!isBusy) e.currentTarget.style.background = 'rgba(74,222,128,0.25)'
                        }}
                        onMouseLeave={e => {
                          if (!isBusy) e.currentTarget.style.background =
                            currentStatus === 'PRESENT'
                              ? 'rgba(74,222,128,0.3)' : 'rgba(74,222,128,0.1)'
                        }}
                      >
                        {isMarkingPresent ? '...' : '✓ Present'}
                      </button>

                      {/* Absent button */}
                      <button
                        type="button"
                        onClick={() => handleMark(student, 'ABSENT')}
                        disabled={isBusy}
                        style={{
                          flex: 1, padding: '7px 0', borderRadius: '8px',
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                          border: 'none', fontWeight: '700', fontSize: '12px',
                          background: currentStatus === 'ABSENT'
                            ? 'rgba(248,113,113,0.3)' : 'rgba(248,113,113,0.1)',
                          color: C.red,
                          opacity: isBusy ? 0.6 : 1,
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          if (!isBusy) e.currentTarget.style.background = 'rgba(248,113,113,0.25)'
                        }}
                        onMouseLeave={e => {
                          if (!isBusy) e.currentTarget.style.background =
                            currentStatus === 'ABSENT'
                              ? 'rgba(248,113,113,0.3)' : 'rgba(248,113,113,0.1)'
                        }}
                      >
                        {isMarkingAbsent ? '...' : '✕ Absent'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.8); }
        }
        input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
      `}</style>
    </div>
  )
}
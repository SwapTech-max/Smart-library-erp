import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStudentBooks } from '../../hooks/useTransactions'
import { useAttendance } from '../../hooks/useAttendance'
import { calculateFine } from '../../services/transactionService'
import ActivityFeed from '../../components/common/ActivityFeed'

const C = {
  bg: '#0a0a0f', surface: '#111118', border: '#1e1e2e',
  text: '#f1f5f9', muted: '#64748b',
  green: '#4ade80', greenD: '#059669',
  red: '#f87171', yellow: '#fbbf24', violet: '#8b5cf6', cyan: '#06b6d4',
  purple: '#c084fc',
}

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px',
      padding: '22px 24px', transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = color}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
    >
      <div style={{ fontSize: '26px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '30px', fontWeight: '800', color, marginBottom: '4px' }}>{value ?? '—'}</div>
      <div style={{ color: C.muted, fontSize: '13px', fontWeight: '500' }}>{label}</div>
    </div>
  )
}

function ActionCard({ title, desc, icon, color, path, navigate: nav, badge }) {
  return (
    <div
      onClick={() => nav(path)}
      style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px',
        padding: '22px 24px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.background = `${color}12`
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = C.border
        e.currentTarget.style.background = C.surface
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {badge > 0 && (
        <div style={{
          position: 'absolute', top: '16px', right: '16px',
          background: C.red, color: '#fff', fontSize: '11px', fontWeight: '800',
          padding: '2px 8px', borderRadius: '20px',
        }}>{badge}</div>
      )}
      <div style={{ fontSize: '28px', marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '6px' }}>{title}</div>
      <div style={{ color: C.muted, fontSize: '13px', lineHeight: '1.5' }}>{desc}</div>
      <div style={{ color, fontSize: '12px', marginTop: '12px', fontWeight: '600' }}>Open →</div>
    </div>
  )
}

function AttendanceDayChip({ status, date }) {
  const d    = new Date(date)
  const day  = d.toLocaleDateString('en-IN', { weekday: 'short' })
  const num  = d.getDate()
  const mon  = d.toLocaleDateString('en-IN', { month: 'short' })

  // DB stores uppercase — 'PRESENT' / 'ABSENT'
  const cfg = status === 'PRESENT'
    ? { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.3)', color: C.green }
    : status === 'ABSENT'
    ? { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', color: C.red }
    : { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', color: C.muted }

  return (
    <div style={{
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: '10px', padding: '8px 10px', textAlign: 'center', minWidth: '56px',
    }}>
      <div style={{ fontSize: '10px', color: cfg.color, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{day}</div>
      <div style={{ fontSize: '18px', fontWeight: '800', color: cfg.color, lineHeight: 1.1 }}>{num}</div>
      <div style={{ fontSize: '10px', color: C.muted }}>{mon}</div>
      <div style={{ marginTop: '4px', fontSize: '11px' }}>
        {status === 'present' ? '✓' : status === 'absent' ? '✕' : '—'}
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  const { profile, user }                  = useAuth()
  const navigate                           = useNavigate()
  const { active, stats, loading }         = useStudentBooks(user?.id)
  const {
    attendance, loading: attLoading,
    attendancePct, presentToday: myPresent,
  } = useAttendance(user?.id)

  useEffect(() => {
    async function markOverdue() {
      await supabase
        .from('transactions')
        .update({ status: 'overdue' })
        .eq('status', 'issued')
        .lt('due_date', new Date().toISOString().split('T')[0])
    }
    markOverdue()
  }, [])

  const today = new Date(); today.setHours(0,0,0,0)
  const overdueBooks = active.filter(t => new Date(t.due_date) < today)

  // Today's attendance status for this student
  const todayStr      = new Date().toISOString().split('T')[0]
  const todayRecord   = attendance.find(a => a.date === todayStr)
  const todayStatus   = todayRecord?.status || null

  // Last 30 days attendance
  const last30 = attendance.slice(0, 30)

  const statCards = [
    { label: 'Books Borrowed',  value: stats?.borrowed,     icon: '📖', color: C.green },
    { label: 'Due This Week',   value: stats?.dueThisWeek,  icon: '📅', color: C.yellow },
    { label: 'Overdue Books',   value: stats?.overdue,      icon: '⚠️', color: C.red },
    { label: 'Total Fines',     value: stats ? `₹${stats.totalFine}` : '—', icon: '💰', color: C.violet },
  ]

  const actions = [
    { title: 'Browse Books',      desc: 'Search and explore the full book catalog',   icon: '🔍', color: C.green,  path: '/student/browse' },
    { title: 'My Borrowed Books', desc: 'View currently borrowed books and due dates', icon: '📚', color: C.yellow, path: '/student/my-books', badge: stats?.borrowed },
    { title: 'My Fines',          desc: 'Check outstanding fines and overdue charges', icon: '💳', color: C.red,    path: '/student/my-fines', badge: stats?.overdue },
  ]

  // Attendance percentage ring color
  const pctColor = attendancePct >= 75 ? C.green : attendancePct >= 50 ? C.yellow : C.red

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter','system-ui',sans-serif" }}>
      <div style={{ padding: '40px 28px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Welcome */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px' }}>
            Hello, {profile?.full_name || 'Student'} 👋
          </h1>
          <p style={{ color: C.muted, fontSize: '15px', margin: 0 }}>
            Browse books, track your borrows and manage your account.
          </p>
        </div>

        {/* Profile Info Card */}
        <div style={{
          background: 'linear-gradient(135deg, #111118, #0a0a0f)',
          border: `1px solid ${C.border}`, borderRadius: '16px',
          padding: '24px', marginBottom: '40px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', fontWeight: '800', color: '#fff',
            }}>
              {profile?.full_name?.charAt(0) || 'S'}
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 4px' }}>{profile?.full_name}</h2>
              <div style={{ color: C.muted, fontSize: '14px' }}>{profile?.email}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: C.muted, fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Library ID</div>
              <div style={{ color: C.violet, fontWeight: '800', fontSize: '15px' }}>{profile?.library_id || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: C.muted, fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Branch</div>
              <div style={{ color: C.text, fontWeight: '700', fontSize: '15px' }}>{profile?.branch || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: C.muted, fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Year / Sem</div>
              <div style={{ color: C.text, fontWeight: '700', fontSize: '15px' }}>Year {profile?.year || '—'} · Sem {profile?.semester || '—'}</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <h2 style={{ fontSize: '12px', fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
          My Account Summary
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '16px', marginBottom: '40px' }}>
          {statCards.map(s => (
            <StatCard key={s.label} {...s} value={loading ? '...' : s.value} />
          ))}
        </div>

        {/* Actions */}
        <h2 style={{ fontSize: '12px', fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
          Quick Access
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '16px', marginBottom: '40px' }}>
          {actions.map(a => <ActionCard key={a.path} {...a} navigate={navigate} />)}
        </div>

        {/* ── Overdue Alert ── */}
        {!loading && overdueBooks.length > 0 && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '14px', padding: '20px 24px', marginBottom: '28px',
          }}>
            <div style={{ fontWeight: '800', color: C.red, marginBottom: '12px', fontSize: '15px' }}>
              ⚠️ Overdue Books — Please Return Immediately!
            </div>
            {overdueBooks.map(t => {
              const { overdueDays, fine } = calculateFine(t.due_date)
              return (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', background: 'rgba(239,68,68,0.06)', borderRadius: '8px', padding: '10px 14px' }}>
                  <div>
                    <strong>{t.books?.title}</strong>
                    <div style={{ color: C.red, fontSize: '12px' }}>Overdue by {overdueDays} day(s)</div>
                  </div>
                  <div style={{ color: C.red, fontWeight: '800', fontSize: '16px' }}>₹{fine}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Current Books Preview ── */}
        {!loading && active.length > 0 && (
          <>
            <h2 style={{ fontSize: '12px', fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
              Currently Borrowed ({active.length})
            </h2>
            <div style={{ display: 'grid', gap: '12px', marginBottom: '40px' }}>
              {active.slice(0, 3).map(t => {
                const { overdueDays, fine, isOverdue } = calculateFine(t.due_date)
                const daysLeft = Math.max(0, Math.ceil((new Date(t.due_date) - new Date()) / (1000 * 60 * 60 * 24)))
                return (
                  <div key={t.id} style={{
                    background: C.surface, border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.3)' : C.border}`,
                    borderRadius: '12px', padding: '16px 20px', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
                  }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>{t.books?.title}</div>
                      <div style={{ color: C.muted, fontSize: '13px' }}>by {t.books?.author} · Due: {t.due_date}</div>
                    </div>
                    {isOverdue
                      ? <span style={{ background: 'rgba(239,68,68,0.15)', color: C.red, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                          Overdue {overdueDays}d · ₹{fine} fine
                        </span>
                      : <span style={{ background: 'rgba(74,222,128,0.1)', color: C.green, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                          {daysLeft}d left
                        </span>
                    }
                  </div>
                )
              })}
              {active.length > 3 && (
                <button type="button" onClick={() => navigate('/student/my-books')}
                  style={{ background: 'transparent', border: `1px solid #2d2d44`, color: '#818cf8', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                  View all {active.length} books →
                </button>
              )}
            </div>
          </>
        )}

        {/* ── ATTENDANCE SECTION ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.8fr)',
          gap: '20px', marginBottom: '40px',
          alignItems: 'start',
        }}>

          {/* Attendance % Card */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '28px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '12px', fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px', textAlign: 'left' }}>
              My Attendance
            </h2>

            {/* Circular percentage */}
            <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 16px' }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#1e1e2e" strokeWidth="12" />
                <circle cx="60" cy="60" r="50" fill="none"
                  stroke={pctColor} strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - attendancePct / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontSize: '26px', fontWeight: '900', color: pctColor }}>{attendancePct}%</div>
                <div style={{ fontSize: '11px', color: C.muted }}>attendance</div>
              </div>
            </div>

            {/* Today's status — DB value is uppercase */}
            <div style={{
              background: todayStatus === 'PRESENT' ? 'rgba(74,222,128,0.1)' : todayStatus === 'ABSENT' ? 'rgba(248,113,113,0.1)' : 'rgba(100,116,139,0.1)',
              border: `1px solid ${todayStatus === 'PRESENT' ? 'rgba(74,222,128,0.3)' : todayStatus === 'ABSENT' ? 'rgba(248,113,113,0.3)' : 'rgba(100,116,139,0.2)'}`,
              borderRadius: '10px', padding: '10px 14px', marginTop: '8px',
            }}>
              <div style={{ fontSize: '12px', color: C.muted, marginBottom: '4px' }}>Today's Status</div>
              <div style={{
                fontWeight: '800', fontSize: '16px',
                color: todayStatus === 'PRESENT' ? C.green : todayStatus === 'ABSENT' ? C.red : C.muted,
              }}>
                {todayStatus === 'PRESENT' ? '✅ Present' : todayStatus === 'ABSENT' ? '❌ Absent' : '⏳ Not Marked Yet'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <div style={{ flex: 1, background: 'rgba(74,222,128,0.08)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: C.green }}>{last30.filter(a => a.status === 'PRESENT').length}</div>
                <div style={{ fontSize: '11px', color: C.muted }}>Present</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(248,113,113,0.08)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: C.red }}>{last30.filter(a => a.status === 'ABSENT').length}</div>
                <div style={{ fontSize: '11px', color: C.muted }}>Absent</div>
              </div>
            </div>
          </div>

          {/* Attendance History */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>
              Last 30 Days History
            </h2>

            {attLoading ? (
              <div style={{ color: C.muted, fontSize: '13px', padding: '20px 0' }}>Loading...</div>
            ) : last30.length === 0 ? (
              <div style={{ color: C.muted, fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📭</div>
                No attendance records yet
              </div>
            ) : (
              <>
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '8px',
                  maxHeight: '200px', overflowY: 'auto', paddingBottom: '4px',
                }}>
                  {last30.map(a => (
                    <AttendanceDayChip key={a.id} status={a.status} date={a.date} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
                  {[
                    { color: C.green, label: 'Present' },
                    { color: C.red,   label: 'Absent' },
                    { color: C.muted, label: 'Not Marked' },
                  ].map(leg => (
                    <div key={leg.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.muted }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: leg.color }} />
                      {leg.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Mini Activity Feed ── */}
        <h2 style={{ fontSize: '12px', fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
          Recent Activity
        </h2>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '24px' }}>
          <ActivityFeed limit={20} height="300px" compact />
        </div>

      </div>
    </div>
  )
}
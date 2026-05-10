import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLibrarianStats, useTransactions } from '../../hooks/useTransactions'
import { useBooks } from '../../hooks/useBooks'
import { useAttendance } from '../../hooks/useAttendance'
import ActivityFeed from '../../components/common/ActivityFeed'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Area, AreaChart,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'

// ─── theme ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#0a0a0f', surface: '#111118', border: '#1e1e2e',
  text: '#f1f5f9', muted: '#64748b',
  cyan: '#06b6d4', cyanD: '#0891b2',
  green: '#4ade80', red: '#f87171', yellow: '#fbbf24', violet: '#8b5cf6',
  purple: '#c084fc',
}

const BRANCH_COLORS   = ['#06b6d4', '#fbbf24', '#4ade80', '#f87171']
const BRANCH_TAG_COLORS = {
  CSE: { bg: 'rgba(6,182,212,0.15)',   color: '#06b6d4' },
  EE:  { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
  CE:  { bg: 'rgba(74,222,128,0.15)',  color: '#4ade80' },
  ME:  { bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}
function shortDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

// ─── real-data hooks ──────────────────────────────────────────────────────────

/** Last N days of issue/return counts from transactions table */
function useBorrowTrend(days = 14) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const from = daysAgo(days - 1)
      const { data: rows, error } = await supabase
        .from('transactions')
        .select('issue_date, return_date, status')
        .gte('issue_date', from)

      if (error) { console.error(error); setLoading(false); return }

      // build a map keyed by date string
      const map = {}
      for (let i = days - 1; i >= 0; i--) {
        const key = daysAgo(i)
        map[key] = { date: shortDate(key), issued: 0, returned: 0 }
      }
      rows.forEach(tx => {
        if (tx.issue_date && map[tx.issue_date])  map[tx.issue_date].issued++
        if (tx.return_date && map[tx.return_date]) map[tx.return_date].returned++
      })
      setData(Object.values(map))
      setLoading(false)
    }
    load()
  }, [days])

  return { data, loading }
}

/** Branch-wise issued-this-month counts */
function useBranchActivity() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      const from = startOfMonth.toISOString().split('T')[0]

      const { data: rows, error } = await supabase
        .from('transactions')
        .select('books(branch)')
        .gte('issue_date', from)

      if (error) { console.error(error); setLoading(false); return }

      const counts = {}
      rows.forEach(tx => {
        const br = tx.books?.branch || 'Other'
        counts[br] = (counts[br] || 0) + 1
      })
      setData(Object.entries(counts).map(([branch, books]) => ({ branch, books })))
      setLoading(false)
    }
    load()
  }, [])

  return { data, loading }
}

/** Book condition counts from books table */
function useBookCondition() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: rows, error } = await supabase
        .from('books')
        .select('condition')

      if (error) { console.error(error); setLoading(false); return }

      const counts = { Good: 0, Damaged: 0, Lost: 0 }
      rows.forEach(b => {
        const c = b.condition ? (b.condition.charAt(0).toUpperCase() + b.condition.slice(1).toLowerCase()) : 'Good'
        if (counts[c] !== undefined) counts[c]++
        else counts['Good']++
      })
      const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
      const colors = { Good: '#4ade80', Damaged: '#fbbf24', Lost: '#f87171' }
      setData(
        Object.entries(counts).map(([name, val]) => ({
          name, value: Math.round((val / total) * 100), count: val, color: colors[name],
        }))
      )
      setLoading(false)
    }
    load()
  }, [])

  return { data, loading }
}

/** Top 8 most-borrowed books this semester */
function useTopBooks() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      // semester start ~6 months ago
      const sem = new Date(); sem.setMonth(sem.getMonth() - 6)
      const from = sem.toISOString().split('T')[0]

      const { data: rows, error } = await supabase
        .from('transactions')
        .select('book_id, books(title, branch)')
        .gte('issue_date', from)

      if (error) { console.error(error); setLoading(false); return }

      const map = {}
      rows.forEach(tx => {
        const id = tx.book_id
        if (!map[id]) map[id] = { title: tx.books?.title || 'Unknown', branch: tx.books?.branch || 'CSE', count: 0 }
        map[id].count++
      })
      const sorted = Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8)
      const max = sorted[0]?.count || 1
      const branchColor = { CSE: '#06b6d4', EE: '#fbbf24', CE: '#4ade80', ME: '#f87171' }
      setData(sorted.map(b => ({ ...b, max, color: branchColor[b.branch] || '#06b6d4' })))
      setLoading(false)
    }
    load()
  }, [])

  return { data, loading }
}

/** Live library capacity from attendance table (today's present) */
function useCapacity() {
  const [present, setPresent] = useState(0)
  const [total, setTotal] = useState(120)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]

      // present count today
      const { count: presentCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .eq('status', 'present')

      // total registered students for capacity denominator
      const { count: studentCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')

      setPresent(presentCount || 0)
      setTotal(studentCount || 120)
      setLoading(false)
    }
    load()

    // refresh every 60 s
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [])

  return { present, total, loading }
}

/** Attendance last 14 days — present / absent / total per day */
function useAttendanceTrend(days = 14) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const from = daysAgo(days - 1)

      const { data: rows, error } = await supabase
        .from('attendance')
        .select('date, status')
        .gte('date', from)

      if (error) { console.error(error); setLoading(false); return }

      const map = {}
      for (let i = days - 1; i >= 0; i--) {
        const key = daysAgo(i)
        map[key] = { date: shortDate(key), present: 0, absent: 0 }
      }
      rows.forEach(r => {
        if (!map[r.date]) return
        if (r.status === 'present') map[r.date].present++
        else map[r.date].absent++
      })
      setData(Object.values(map).map(d => ({ ...d, total: d.present + d.absent })))
      setLoading(false)
    }
    load()
  }, [days])

  return { data, loading }
}

/** Attendance by branch today */
function useAttendanceByBranch() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]

      const { data: rows, error } = await supabase
        .from('attendance')
        .select('status, users(branch)')
        .eq('date', today)

      if (error) { console.error(error); setLoading(false); return }

      const map = {}
      rows.forEach(r => {
        const br = r.users?.branch || 'Other'
        if (!map[br]) map[br] = { branch: br, present: 0, absent: 0 }
        if (r.status === 'present') map[br].present++
        else map[br].absent++
      })
      setData(Object.values(map))
      setLoading(false)
    }
    load()
  }, [])

  return { data, loading }
}

// ─── sub-components ────────────────────────────────────────────────────────

function Panel({ children, style = {} }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px', ...style }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontSize: '11px', fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 14px' }}>
      {children}
    </h2>
  )
}

function Spinner() {
  return <div style={{ color: C.muted, fontSize: '12px', textAlign: 'center', padding: '32px' }}>Loading…</div>
}

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px',
      padding: '22px 24px', transition: 'border-color 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ fontSize: '24px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '28px', fontWeight: '800', color, marginBottom: '4px' }}>{value ?? '—'}</div>
      <div style={{ color: C.muted, fontSize: '12px', fontWeight: '500' }}>{label}</div>
      {sub && <div style={{ color, fontSize: '11px', marginTop: '6px', opacity: 0.8 }}>{sub}</div>}
    </div>
  )
}

function ActionCard({ title, desc, icon, color, path, navigate: nav }) {
  return (
    <div onClick={() => nav(path)}
      style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px',
        padding: '22px 24px', cursor: 'pointer', transition: 'all 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = `${color}12`; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ fontSize: '26px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '5px' }}>{title}</div>
      <div style={{ color: C.muted, fontSize: '12px', lineHeight: '1.5' }}>{desc}</div>
      <div style={{ color, fontSize: '11px', marginTop: '10px', fontWeight: '700' }}>Open →</div>
    </div>
  )
}

// ── Live Capacity Card (real data) ────────────────────────────────────────────
function CapacityCard() {
  const { present, total, loading } = useCapacity()
  const pct = total ? Math.round((present / total) * 100) : 0

  return (
    <Panel style={{ padding: '22px 24px', gridColumn: 'span 2' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
            🏛️ Live Library Capacity
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: C.cyan }}>
            {loading ? '…' : present}{' '}
            <span style={{ fontSize: '18px', color: C.muted, fontWeight: '600' }}>/ {total}</span>
          </div>
          <div style={{ color: C.muted, fontSize: '12px', marginTop: '4px' }}>Students currently inside</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: C.muted }}>{total - present} seats available</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: pct > 80 ? C.red : pct > 60 ? C.yellow : C.green, marginTop: '4px' }}>{pct}%</div>
          <div style={{ fontSize: '11px', color: C.muted }}>occupied</div>
        </div>
      </div>
      <div style={{ background: '#1e1e2e', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: '99px', width: `${pct}%`,
          background: pct > 80 ? `linear-gradient(90deg,${C.red},#fca5a5)` : pct > 60 ? `linear-gradient(90deg,${C.yellow},#fde68a)` : `linear-gradient(90deg,${C.cyan},#67e8f9)`,
          transition: 'width 0.6s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: C.muted }}>
        <span>0</span><span>{Math.round(total / 2)}</span><span>{total}</span>
      </div>
    </Panel>
  )
}

// ── Borrow Trend (real) ───────────────────────────────────────────────────────
function BorrowTrendChart() {
  const { data, loading } = useBorrowTrend(14)

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: '#1a1a2e', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
        <div style={{ color: C.muted, marginBottom: '6px' }}>{label}</div>
        <div style={{ color: C.cyan }}>📤 Issued: {payload[0]?.value}</div>
        <div style={{ color: C.green }}>📥 Returned: {payload[1]?.value}</div>
      </div>
    )
  }

  return (
    <Panel style={{ padding: '22px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '14px' }}>Daily Borrowing & Returns</div>
          <div style={{ color: C.muted, fontSize: '12px', marginTop: '2px' }}>Last 14 days — live from database</div>
        </div>
        <div style={{ fontSize: '12px', color: C.muted, background: 'rgba(6,182,212,0.08)', border: `1px solid rgba(6,182,212,0.2)`, borderRadius: '8px', padding: '4px 10px' }}>
          {new Date().toLocaleString('en-GB', { month: 'short', year: 'numeric' })}
        </div>
      </div>
      {loading ? <Spinner /> : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.cyan} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C.cyan} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.green} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="issued"   stroke={C.cyan}  strokeWidth={2} fill="url(#gCyan)"  dot={false} />
              <Area type="monotone" dataKey="returned" stroke={C.green} strokeWidth={2} fill="url(#gGreen)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '11px' }}>
            <span style={{ color: C.cyan }}>● Issued</span>
            <span style={{ color: C.green }}>● Returned</span>
          </div>
        </>
      )}
    </Panel>
  )
}

// ── Branch Activity (real) ────────────────────────────────────────────────────
function BranchActivityChart() {
  const { data, loading } = useBranchActivity()

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: '#1a1a2e', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
        <div style={{ color: C.text }}>{payload[0]?.payload.branch}: <strong>{payload[0]?.value}</strong> books</div>
      </div>
    )
  }

  return (
    <Panel style={{ padding: '22px 24px' }}>
      <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>Branch-wise Activity</div>
      <div style={{ color: C.muted, fontSize: '12px', marginBottom: '18px' }}>Books issued this month</div>
      {loading ? <Spinner /> : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }} barSize={36}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
            <XAxis dataKey="branch" tick={{ fill: C.muted, fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="books" radius={[8, 8, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={BRANCH_COLORS[i % BRANCH_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panel>
  )
}

// ── Book Condition Donut (real) ───────────────────────────────────────────────
function BookConditionCard() {
  const { data, loading } = useBookCondition()

  return (
    <Panel style={{ padding: '22px 24px' }}>
      <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>Book Condition Status</div>
      <div style={{ color: C.muted, fontSize: '12px', marginBottom: '8px' }}>Inventory health overview</div>
      {loading ? <Spinner /> : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ResponsiveContainer width={130} height={130}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" strokeWidth={0}>
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                <span style={{ color: C.muted }}>{d.name}</span>
                <span style={{ color: C.text, fontWeight: '700', marginLeft: 'auto', paddingLeft: '8px' }}>{d.value}%</span>
              </div>
            ))}
            <div style={{ fontSize: '11px', color: C.muted, marginTop: '4px' }}>
              {data.reduce((s, d) => s + (d.count || 0), 0)} total books
            </div>
          </div>
        </div>
      )}
    </Panel>
  )
}

// ── Most Borrowed Books (real) ────────────────────────────────────────────────
function MostBorrowedBooks() {
  const { data, loading } = useTopBooks()

  return (
    <Panel style={{ padding: '22px 24px' }}>
      <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>Most Borrowed Books</div>
      <div style={{ color: C.muted, fontSize: '12px', marginBottom: '18px' }}>Top 8 titles this semester</div>
      {loading ? <Spinner /> : data.length === 0 ? (
        <div style={{ color: C.muted, fontSize: '13px' }}>No data yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data.map(b => (
            <div key={b.title} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', color: C.text, fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</span>
                  <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 7px', borderRadius: '99px', background: BRANCH_TAG_COLORS[b.branch]?.bg || 'rgba(6,182,212,0.15)', color: BRANCH_TAG_COLORS[b.branch]?.color || '#06b6d4', flexShrink: 0 }}>{b.branch}</span>
                </div>
                <div style={{ background: '#1e1e2e', borderRadius: '99px', height: '5px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(b.count / b.max) * 100}%`, background: b.color, borderRadius: '99px', transition: 'width 0.6s ease' }} />
                </div>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: C.text, width: '30px', textAlign: 'right', flexShrink: 0 }}>{b.count}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

// ── Attendance Trend Chart (NEW — real) ──────────────────────────────────────
function AttendanceTrendChart() {
  const { data, loading } = useAttendanceTrend(14)

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const present = payload.find(p => p.dataKey === 'present')?.value || 0
    const absent  = payload.find(p => p.dataKey === 'absent')?.value  || 0
    const total   = present + absent
    const pct     = total ? Math.round((present / total) * 100) : 0
    return (
      <div style={{ background: '#1a1a2e', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
        <div style={{ color: C.muted, marginBottom: '6px' }}>{label}</div>
        <div style={{ color: C.green }}>✅ Present: {present}</div>
        <div style={{ color: C.red }}>❌ Absent: {absent}</div>
        <div style={{ color: C.muted, marginTop: '4px', borderTop: `1px solid ${C.border}`, paddingTop: '4px' }}>Attendance: {pct}%</div>
      </div>
    )
  }

  // compute average attendance %
  const avgPct = data.length
    ? Math.round(data.reduce((s, d) => s + (d.total ? (d.present / d.total) * 100 : 0), 0) / data.length)
    : 0

  return (
    <Panel style={{ padding: '22px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '14px' }}>Student Attendance Trend</div>
          <div style={{ color: C.muted, fontSize: '12px', marginTop: '2px' }}>Last 14 days — present vs absent</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '22px', fontWeight: '900', color: avgPct >= 75 ? C.green : avgPct >= 50 ? C.yellow : C.red }}>{avgPct}%</div>
          <div style={{ fontSize: '11px', color: C.muted }}>14-day avg</div>
        </div>
      </div>
      {loading ? <Spinner /> : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }} barSize={18} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="present" stackId="a" fill={C.green} radius={[0, 0, 0, 0]} />
              <Bar dataKey="absent"  stackId="a" fill={C.red}   radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '11px' }}>
            <span style={{ color: C.green }}>● Present</span>
            <span style={{ color: C.red }}>● Absent</span>
          </div>
        </>
      )}
    </Panel>
  )
}

// ── Attendance by Branch (NEW — real) ────────────────────────────────────────
function AttendanceByBranch() {
  const { data, loading } = useAttendanceByBranch()

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: '#1a1a2e', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
        <div style={{ color: C.muted, marginBottom: '4px' }}>{label}</div>
        {payload.map(p => (
          <div key={p.dataKey} style={{ color: p.color }}>
            {p.dataKey === 'present' ? '✅' : '❌'} {p.dataKey}: {p.value}
          </div>
        ))}
      </div>
    )
  }

  return (
    <Panel style={{ padding: '22px 24px' }}>
      <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>Attendance by Branch</div>
      <div style={{ color: C.muted, fontSize: '12px', marginBottom: '18px' }}>Today's present vs absent per branch</div>
      {loading ? <Spinner /> : data.length === 0 ? (
        <div style={{ color: C.muted, fontSize: '13px', padding: '20px 0' }}>No attendance data for today yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }} barSize={22} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
            <XAxis dataKey="branch" tick={{ fill: C.muted, fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="present" fill={C.green} radius={[4, 4, 0, 0]} name="Present" />
            <Bar dataKey="absent"  fill={C.red}   radius={[4, 4, 0, 0]} name="Absent" />
          </BarChart>
        </ResponsiveContainer>
      )}
      {!loading && data.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '11px' }}>
          <span style={{ color: C.green }}>● Present</span>
          <span style={{ color: C.red }}>● Absent</span>
        </div>
      )}
    </Panel>
  )
}

// ── Attendance Heatmap-style Summary (NEW) ────────────────────────────────────
function AttendanceSummaryCards() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = daysAgo(6)

      const [todayRes, weekRes, totalStudents] = await Promise.all([
        supabase.from('attendance').select('status').eq('date', today),
        supabase.from('attendance').select('status, date').gte('date', weekAgo),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      ])

      const todayPresent = (todayRes.data || []).filter(r => r.status === 'present').length
      const todayAbsent  = (todayRes.data || []).filter(r => r.status === 'absent').length
      const weekPresent  = (weekRes.data  || []).filter(r => r.status === 'present').length
      const weekTotal    = (weekRes.data  || []).length
      const total        = totalStudents.count || 0

      setSummary({
        todayPresent, todayAbsent,
        todayPct: total ? Math.round((todayPresent / total) * 100) : 0,
        weekPct:  weekTotal ? Math.round((weekPresent / weekTotal) * 100) : 0,
        total,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return null

  const cards = [
    { label: 'Present Today',     value: summary.todayPresent, icon: '✅', color: C.green,  sub: `${summary.todayPct}% of all students` },
    { label: 'Absent Today',      value: summary.todayAbsent,  icon: '❌', color: C.red,    sub: `${100 - summary.todayPct}% missing` },
    { label: 'Weekly Avg',        value: `${summary.weekPct}%`, icon: '📅', color: C.cyan,   sub: 'Last 7 days attendance rate' },
    { label: 'Registered Students', value: summary.total,     icon: '🎓', color: C.violet, sub: 'Total enrolled students' },
  ]

  return (
    <>
      {cards.map(c => (
        <StatCard key={c.label} {...c} />
      ))}
    </>
  )
}

// ── Recent Borrow Records (real, with filter + search) ────────────────────────
function RecentBorrowRecords({ transactions, loading }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = (transactions || []).filter(tx => {
    const matchStatus = filter === 'all' || tx.status === filter
    const matchSearch = !search ||
      tx.users?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      tx.books?.title?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  }).slice(0, 12)

  const statusStyle = s => ({
    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'capitalize',
    background: s === 'issued' ? 'rgba(6,182,212,0.1)' : s === 'returned' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
    color: s === 'issued' ? C.cyan : s === 'returned' ? C.green : C.red,
    border: `1px solid ${s === 'issued' ? 'rgba(6,182,212,0.3)' : s === 'returned' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
  })

  return (
    <Panel>
      <div style={{ padding: '20px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '14px' }}>Recent Borrow Records</div>
          <div style={{ color: C.muted, fontSize: '12px', marginTop: '2px' }}>{filtered.length} records found</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {['all', 'issued', 'overdue'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '5px 14px', borderRadius: '99px', border: '1px solid',
                borderColor: filter === f ? (f === 'overdue' ? C.red : C.cyan) : C.border,
                background: filter === f ? (f === 'overdue' ? 'rgba(248,113,113,0.15)' : 'rgba(6,182,212,0.15)') : 'transparent',
                color: filter === f ? (f === 'overdue' ? C.red : C.cyan) : C.muted,
                fontSize: '12px', fontWeight: '600', cursor: 'pointer', textTransform: 'capitalize',
              }}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px' }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              style={{ background: '#0d0d15', border: `1px solid ${C.border}`, borderRadius: '99px', padding: '5px 14px 5px 28px', color: C.text, fontSize: '12px', outline: 'none', width: '150px' }}
            />
          </div>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <div style={{ padding: '32px', color: C.muted, textAlign: 'center' }}>No records found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                {['Book ID', 'Title', 'Student', 'Roll No.', 'Branch', 'Issue Date', 'Due Date', 'Status', 'Fine'].map(h => (
                  <th key={h} style={{ padding: '13px 16px', color: C.muted, fontWeight: '600', fontSize: '11px', whiteSpace: 'nowrap', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx, i) => {
                const branch = tx.books?.branch || 'CSE'
                const bc = BRANCH_TAG_COLORS[branch] || BRANCH_TAG_COLORS.CSE
                const isOverdue = tx.status === 'overdue'
                // real fine: ₹2/day past due_date, if overdue
                let fine = '—'
                if (isOverdue && tx.due_date) {
                  const days = Math.max(0, Math.floor((Date.now() - new Date(tx.due_date)) / 86_400_000))
                  fine = `₹${days * 2}`
                }
                return (
                  <tr key={tx.id || i}
                    style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{tx.book_id || `BK-${String(i + 1).padStart(4, '0')}`}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '500', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.books?.title || 'Unknown'}</td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{tx.users?.full_name || 'Unknown'}</td>
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{tx.users?.roll_number || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: '700', background: bc.bg, color: bc.color }}>{branch}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: C.muted, whiteSpace: 'nowrap', fontSize: '12px' }}>{fmtDate(tx.issue_date)}</td>
                    <td style={{ padding: '12px 16px', color: isOverdue ? C.red : C.muted, whiteSpace: 'nowrap', fontSize: '12px', fontWeight: isOverdue ? '600' : '400' }}>{fmtDate(tx.due_date)}</td>
                    <td style={{ padding: '12px 16px' }}><span style={statusStyle(tx.status)}>{tx.status}</span></td>
                    <td style={{ padding: '12px 16px', color: isOverdue ? C.red : C.muted, fontWeight: isOverdue ? '700' : '400', fontSize: '12px' }}>{fine}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </Panel>
  )
}

// ─── main dashboard ──────────────────────────────────────────────────────────
export default function LibrarianDashboard() {
  const { profile }          = useAuth()
  const navigate             = useNavigate()
  const { stats, loading }   = useLibrarianStats()
  const { stats: bStats }    = useBooks()
  const { transactions, loading: txLoading } = useTransactions()
  const { presentToday, loading: attLoading } = useAttendance()

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

  const statCards = [
    { label: 'Issued Today',   value: stats?.issuedToday,   icon: '📤', color: C.cyan,   sub: stats?.issuedToday ? `+${stats.issuedToday} today` : null },
    { label: 'Returned Today', value: stats?.returnedToday, icon: '📥', color: C.green,  sub: null },
    { label: 'Overdue Books',  value: stats?.overdueCount,  icon: '⚠️', color: C.red,    sub: stats?.overdueCount ? `${stats.overdueCount} students affected` : null },
    { label: 'Total Books',    value: bStats?.totalTitles,  icon: '📖', color: C.violet, sub: 'Across all branches' },
    { label: 'Present Today',  value: attLoading ? '…' : presentToday, icon: '✅', color: C.purple, sub: null },
    { label: 'Pending Fines',  value: stats ? `₹${stats.totalFineCollected}` : '—', icon: '₹', color: '#f59e0b', sub: null },
  ]

  const actions = [
    { title: 'Issue Book',      desc: 'Issue a book to a registered student',         icon: '📤', color: C.cyan,    path: '/librarian/issue' },
    { title: 'Return Book',     desc: 'Process book return and calculate fine',        icon: '📥', color: C.green,   path: '/librarian/return' },
    { title: 'Books Catalog',   desc: 'Add, edit, delete books and manage inventory', icon: '📚', color: C.violet,  path: '/librarian/books' },
    { title: 'Student Records', desc: 'Search students and view borrow history',       icon: '🎓', color: '#f59e0b', path: '/librarian/students' },
    { title: 'Transactions',    desc: 'View all active and past transactions',         icon: '📋', color: C.red,     path: '/librarian/transactions' },
    { title: 'Attendance',      desc: 'Mark present/absent for students, live view',   icon: '✅', color: C.purple,  path: '/librarian/attendance' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter','system-ui',sans-serif" }}>
      <div style={{ padding: '36px 28px', maxWidth: '1500px', margin: '0 auto' }}>

        {/* Welcome */}
        <div style={{ marginBottom: '36px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 6px' }}>
            Welcome, {profile?.full_name || 'Librarian'} 👋
          </h1>
          <p style={{ color: C.muted, fontSize: '14px', margin: 0 }}>
            Manage books, issue and return transactions from here.
          </p>
        </div>

        {/* Today's Overview */}
        <div style={{ marginBottom: '40px' }}>
          <SectionTitle>Today's Overview</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '14px' }}>
            <CapacityCard />
            {statCards.map(s => (
              <StatCard key={s.label} {...s} value={loading ? '…' : s.value} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: '40px' }}>
          <SectionTitle>Quick Actions</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '14px' }}>
            {actions.map(a => <ActionCard key={a.path} {...a} navigate={navigate} />)}
          </div>
        </div>

        {/* Overdue Alert */}
        {stats && stats.overdueCount > 0 && (
          <div style={{
            marginBottom: '36px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '14px', padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '22px' }}>🚨</span>
              <div>
                <div style={{ fontWeight: '700', color: C.red, marginBottom: '2px', fontSize: '14px' }}>
                  {stats.overdueCount} Overdue Book{stats.overdueCount > 1 ? 's' : ''}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '12px' }}>Students have books past their due date.</div>
              </div>
            </div>
            <button type="button" onClick={() => navigate('/librarian/transactions')}
              style={{ background: C.red, color: '#fff', border: 'none', padding: '7px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>
              View Overdue
            </button>
          </div>
        )}

        {/* Analytics — borrow trends + branch activity */}
        <div style={{ marginBottom: '36px' }}>
          <SectionTitle>Analytics</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <BorrowTrendChart />
            <BranchActivityChart />
          </div>
        </div>

        {/* ── NEW: Attendance Section ────────────────────────────────────── */}
        <div style={{ marginBottom: '36px' }}>
          <SectionTitle>Attendance Overview</SectionTitle>

          {/* Attendance stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <AttendanceSummaryCards />
          </div>

          {/* Trend + Branch side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <AttendanceTrendChart />
            <AttendanceByBranch />
          </div>
        </div>

        {/* Inventory Insights */}
        <div style={{ marginBottom: '36px' }}>
          <SectionTitle>Inventory Insights</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '16px' }}>
            <BookConditionCard />
            <MostBorrowedBooks />
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ marginBottom: '16px' }}>
          <SectionTitle>Recent Activity</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '16px', alignItems: 'start' }}>
            <RecentBorrowRecords transactions={transactions} loading={txLoading} />
            <div>
              <Panel style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px' }}>Live Activity Feed</div>
                    <div style={{ color: C.muted, fontSize: '11px', marginTop: '2px' }}>Real-time library events</div>
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: C.green, fontWeight: '700' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: C.green, display: 'inline-block', boxShadow: `0 0 6px ${C.green}` }} />
                    Live
                  </span>
                </div>
                <ActivityFeed height="480px" />
              </Panel>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
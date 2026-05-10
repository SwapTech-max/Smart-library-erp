import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useBooks } from '../../hooks/useBooks'
import { CATEGORIES } from '../../services/bookService'

const C = {
  bg: '#0a0a0f', surface: '#111118', surface2: '#0f0f1a',
  border: '#1e1e2e', border2: '#2d2d44', text: '#f1f5f9',
  muted: '#64748b', green: '#4ade80', red: '#f87171', yellow: '#fbbf24',
  accent: '#10b981', accentD: '#059669',
}

const S = {
  page: { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter','system-ui',sans-serif" },
  nav: { background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', position: 'sticky', top: 0, zIndex: 100 },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700', fontSize: '17px' },
  badge: { background: '#0f2a1a', color: C.green, fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' },
  navBtn: { background: 'transparent', border: '1px solid #2d2d44', color: '#94a3b8', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  main: { padding: '32px 28px', maxWidth: '1100px', margin: '0 auto' },
  h1: { fontSize: '24px', fontWeight: '800', margin: '0 0 6px' },
  sub: { color: C.muted, fontSize: '14px', marginBottom: '28px' },
  filters: { display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' },
  input: { background: C.surface, border: `1px solid ${C.border2}`, color: C.text, padding: '10px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none', flex: 1, minWidth: '220px' },
  select: { background: C.surface, border: `1px solid ${C.border2}`, color: C.text, padding: '10px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '16px' },
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', transition: 'all 0.2s', cursor: 'default', display: 'flex', flexDirection: 'column' },
  coverBox: { width: '100%', height: '140px', background: `linear-gradient(135deg,#1e1e3f,#111118)`, borderRadius: '10px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  title: { fontWeight: '800', fontSize: '15px', marginBottom: '4px', lineHeight: '1.4' },
  author: { color: '#94a3b8', fontSize: '13px', marginBottom: '12px' },
  metaRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' },
  catBadge: { background: '#1e1e3f', color: '#818cf8', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' },
  rackBadge: { background: C.surface2, color: C.muted, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' },
  avail: { background: '#0f2a1a', color: C.green, padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', textAlign: 'center', marginTop: 'auto' },
  unavail: { background: '#2a0f0f', color: C.red, padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', textAlign: 'center', marginTop: 'auto' },
  partial: { background: '#2a2a0f', color: C.yellow, padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', textAlign: 'center', marginTop: 'auto' },
  isbnTxt: { color: C.muted, fontSize: '11px', fontFamily: 'monospace', marginBottom: '8px' },
  empty: { textAlign: 'center', padding: '80px 20px', color: C.muted, gridColumn: '1/-1' },
  skeleton: { background: `linear-gradient(90deg,${C.surface} 25%,${C.surface2} 50%,${C.surface} 75%)`, backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: '12px', height: '280px' },
}

function BookCard({ book }) {
  return (
    <div
      style={S.card}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#8b5cf6'
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = C.border
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Cover */}
      <div style={S.coverBox}>
        {book.cover_image_url
          ? <img src={book.cover_image_url} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
          : <div style={{ fontSize: '48px', opacity: 0.3 }}>📖</div>
        }
      </div>

      <div style={S.title}>{book.title}</div>
      <div style={S.author}>by {book.author}</div>

      {book.isbn && <div style={S.isbnTxt}>ISBN: {book.isbn}</div>}

      <div style={S.metaRow}>
        <span style={S.catBadge}>{book.category}</span>
        {book.rack_number && <span style={S.rackBadge}>Rack: {book.rack_number}</span>}
      </div>

      {book.description && (
        <div style={{ color: C.muted, fontSize: '12px', lineHeight: '1.5', marginBottom: '12px' }}>
          {book.description.length > 80 ? book.description.slice(0, 80) + '...' : book.description}
        </div>
      )}

      {/* Availability */}
      {book.available_copies === 0
        ? <div style={S.unavail}>❌ Not Available</div>
        : book.available_copies === book.total_copies
          ? <div style={S.avail}>✓ {book.available_copies} / {book.total_copies} Available</div>
          : <div style={S.partial}>{book.available_copies} / {book.total_copies} Available</div>
      }
    </div>
  )
}

export default function BrowseBooks() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [availFilter, setAvailFilter] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const dbRef = useState(null)

  const handleSearch = useCallback((val) => {
    setSearch(val)
    clearTimeout(dbRef[0])
    dbRef[0] = setTimeout(() => setDebouncedSearch(val), 300)
  }, [dbRef])

  const { books, loading } = useBooks({
    search: debouncedSearch,
    category: catFilter,
    onlyAvailable: availFilter,
  })

  return (
    <div style={S.page}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}input:focus,select:focus{border-color:#10b981!important;box-shadow:0 0 0 3px rgba(16,185,129,0.15);}`}</style>
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
        <h1 style={S.h1}>Browse Books</h1>
        <p style={S.sub}>Explore the library catalog and check availability.</p>

        <div style={S.filters}>
          <input
            style={S.input}
            placeholder="🔍 Search by title, author, or ISBN..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
          <select style={S.select} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={availFilter}
              onChange={e => setAvailFilter(e.target.checked)}
              style={{ accentColor: C.accent, width: '16px', height: '16px' }}
            />
            Available Only
          </label>
        </div>

        <div style={{ color: C.muted, fontSize: '13px', marginBottom: '16px' }}>
          {loading ? 'Loading...' : `${books.length} book${books.length !== 1 ? 's' : ''} found`}
        </div>

        <div style={S.grid}>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <div key={i} style={S.skeleton} />)
            : books.length === 0
              ? (
                <div style={S.empty}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                  <div style={{ fontWeight: '600', fontSize: '16px', color: C.text, marginBottom: '6px' }}>No books found</div>
                  <div>Try adjusting your search or filters.</div>
                </div>
              )
              : books.map(book => <BookCard key={book.id} book={book} />)
          }
        </div>
      </div>
    </div>
  )
}

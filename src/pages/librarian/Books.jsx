import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useBooks } from '../../hooks/useBooks'
import { CATEGORIES } from '../../services/bookService'

const C = {
  bg: '#0a0a0f', surface: '#111118', surface2: '#0f0f1a',
  border: '#1e1e2e', border2: '#2d2d44', text: '#f1f5f9',
  muted: '#64748b', accent: '#06b6d4', accentD: '#0891b2',
  green: '#4ade80', red: '#f87171', yellow: '#fbbf24',
}

const S = {
  page: { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter','system-ui',sans-serif" },
  nav: { background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', position: 'sticky', top: 0, zIndex: 100 },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700', fontSize: '17px' },
  badge: { background: '#1e1e3f', color: '#818cf8', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: '700', letterSpacing: '0.05em' },
  navRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  navBtn: { background: 'transparent', border: `1px solid ${C.border2}`, color: '#94a3b8', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  main: { padding: '32px 28px', maxWidth: '1280px', margin: '0 auto' },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' },
  h1: { fontSize: '24px', fontWeight: '800', margin: 0 },
  sub: { color: C.muted, fontSize: '13px', marginTop: '4px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '14px', marginBottom: '28px' },
  statCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px 20px' },
  statLabel: { color: C.muted, fontSize: '12px', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' },
  statVal: { fontSize: '26px', fontWeight: '800' },
  filters: { display: 'flex', gap: '10px', marginBottom: '22px', flexWrap: 'wrap' },
  input: { background: C.surface, border: `1px solid ${C.border2}`, color: C.text, padding: '10px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none', flex: 1, minWidth: '200px' },
  select: { background: C.surface, border: `1px solid ${C.border2}`, color: C.text, padding: '10px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none' },
  addBtn: { background: `linear-gradient(135deg,${C.accent},${C.accentD})`, color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap' },
  table: { width: '100%', borderCollapse: 'collapse', background: C.surface, borderRadius: '14px', overflow: 'hidden' },
  thead: { background: C.surface2 },
  th: { padding: '13px 16px', textAlign: 'left', fontSize: '11px', color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: `1px solid ${C.border}` },
  td: { padding: '14px 16px', fontSize: '14px', borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle' },
  avail: { background: '#0f2a1a', color: C.green, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  unavail: { background: '#2a0f0f', color: C.red, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  partial: { background: '#2a2a0f', color: C.yellow, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  editBtn: { background: '#1e1e3f', color: '#818cf8', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', marginRight: '6px', fontWeight: '600' },
  delBtn: { background: '#2a0f0f', color: C.red, border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  empty: { textAlign: 'center', padding: '80px 20px', color: C.muted },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' },
  modal: { background: C.surface, border: `1px solid ${C.border2}`, borderRadius: '18px', padding: '32px', width: '520px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' },
  mTitle: { fontSize: '20px', fontWeight: '800', marginBottom: '24px' },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' },
  finput: { width: '100%', background: C.bg, border: `1px solid ${C.border2}`, color: C.text, padding: '10px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  mBtns: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '28px' },
  cancelBtn: { background: 'transparent', border: `1px solid ${C.border2}`, color: '#94a3b8', padding: '9px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  saveBtn: { background: `linear-gradient(135deg,${C.accent},${C.accentD})`, color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  errMsg: { color: C.red, fontSize: '13px', marginTop: '12px', padding: '10px 14px', background: '#2a0f0f', borderRadius: '8px' },
  skeleton: { background: `linear-gradient(90deg,${C.surface} 25%,${C.surface2} 50%,${C.surface} 75%)`, backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: '6px' },
}

const EMPTY_FORM = { title: '', author: '', category: '', isbn: '', rack_number: '', cover_image_url: '', total_copies: 1, available_copies: 1 }

function SkeletonRow() {
  return (
    <tr>
      {[180, 120, 100, 80, 60, 80, 100, 80].map((w, i) => (
        <td key={i} style={S.td}><div style={{ ...S.skeleton, height: '16px', width: `${w}px` }} /></td>
      ))}
    </tr>
  )
}

export default function LibrarianBooks() {
  const { profile } = useAuth()
  const navigate = useNavigate()

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

  const { books, stats, loading, error, createBook, editBook, removeBook } = useBooks({
    search: debouncedSearch, category: catFilter, onlyAvailable: availFilter,
  })

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setFormErr(''); setShowModal(true) }

  function openEdit(book) {
    setEditing(book)
    setForm({ title: book.title, author: book.author, category: book.category, isbn: book.isbn || '', rack_number: book.rack_number || '', cover_image_url: book.cover_image_url || '', total_copies: book.total_copies, available_copies: book.available_copies || 1 })
    setFormErr('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.title.trim()) { setFormErr('Title is required.'); return }
    if (!form.author.trim()) { setFormErr('Author is required.'); return }
    if (!form.category) { setFormErr('Category is required.'); return }
    if (!form.total_copies || Number(form.total_copies) < 1) { setFormErr('Total copies must be at least 1.'); return }
    if (editing && Number(form.total_copies) < editing.issued_copies) {
      setFormErr(`Cannot reduce total copies below ${editing.issued_copies} (currently issued).`)
      return
    }
    setSaving(true); setFormErr('')
    try {
      editing ? await editBook(editing.id, form) : await createBook(form)
      setShowModal(false)
    } catch (err) {
      setFormErr(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(book) {
    if (book.issued_copies > 0) {
      alert(`Cannot delete "${book.title}" — ${book.issued_copies} copy/copies are currently issued.`)
      return
    }
    if (!confirm(`Delete "${book.title}"? This cannot be undone.`)) return
    try { await removeBook(book.id) } catch (err) { alert(err.message) }
  }

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })) }

  return (
    <div style={S.page}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        input:focus,select:focus,textarea:focus{border-color:#06b6d4!important;box-shadow:0 0 0 3px rgba(6,182,212,0.15);}
        button:disabled{opacity:0.6;cursor:not-allowed;}
      `}</style>

      <nav style={S.nav}>
        <div style={S.logo}>
          <span style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)', borderRadius: '8px', padding: '7px', fontSize: '16px' }}>📚</span>
          Smart Library ERP <span style={S.badge}>LIBRARIAN</span>
        </div>
        <div style={S.navRight}>
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>{profile?.full_name}</span>
          <button type="button" style={S.navBtn} onClick={() => navigate('/librarian/dashboard')}>← Dashboard</button>
        </div>
      </nav>

      <div style={S.main}>
        <div style={S.topRow}>
          <div>
            <h1 style={S.h1}>Books Management</h1>
            <p style={S.sub}>{stats ? `${stats.totalTitles} titles · ${stats.issuedCopies} issued · ${stats.availableCopies} available` : 'Loading...'}</p>
          </div>
          <button type="button" style={S.addBtn} onClick={openAdd}>+ Add New Book</button>
        </div>

        {stats && (
          <div style={S.statsRow}>
            <div style={S.statCard}><div style={S.statLabel}>Titles</div><div style={{ ...S.statVal, color: C.accent }}>{stats.totalTitles}</div></div>
            <div style={S.statCard}><div style={S.statLabel}>Copies</div><div style={{ ...S.statVal, color: '#818cf8' }}>{stats.totalCopies}</div></div>
            <div style={S.statCard}><div style={S.statLabel}>Issued</div><div style={{ ...S.statVal, color: C.yellow }}>{stats.issuedCopies}</div></div>
            <div style={S.statCard}><div style={S.statLabel}>Available</div><div style={{ ...S.statVal, color: C.green }}>{stats.availableCopies}</div></div>
          </div>
        )}

        <div style={S.filters}>
          <input style={S.input} placeholder="🔍 Search by title, author, or ISBN..." value={search} onChange={e => handleSearch(e.target.value)} />
          <select style={S.select} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '14px', cursor: 'pointer' }}>
            <input type="checkbox" checked={availFilter} onChange={e => setAvailFilter(e.target.checked)} style={{ accentColor: C.accent, width: '16px', height: '16px' }} />
            Only Available
          </label>
        </div>

        {error && <div style={{ ...S.errMsg, marginBottom: '20px' }}>{error}</div>}

        <table style={S.table}>
          <thead style={S.thead}>
            <tr>{['Title', 'Author', 'Category', 'ISBN', 'Rack', 'Copies', 'Availability', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : books.length === 0
                ? <tr><td colSpan={8} style={S.empty}><div style={{ fontSize: '36px', marginBottom: '10px' }}>📭</div><div style={{ fontWeight: '600', color: C.text }}>No books found</div></td></tr>
                : books.map(book => (
                  <tr key={book.id}
                    style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#13131f'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={S.td}><strong>{book.title}</strong></td>
                    <td style={S.td}>{book.author}</td>
                    <td style={{ ...S.td, color: '#818cf8' }}>{book.category}</td>
                    <td style={{ ...S.td, color: C.muted, fontSize: '12px', fontFamily: 'monospace' }}>{book.isbn || '—'}</td>
                    <td style={{ ...S.td, color: C.muted }}>{book.rack_number || '—'}</td>
                    <td style={S.td}>
                      <span style={{ fontWeight: '600' }}>{book.total_copies}</span>
                      <span style={{ color: C.muted, fontSize: '12px' }}> total</span><br />
                      <span style={{ color: C.muted, fontSize: '12px' }}>{book.issued_copies} issued</span>
                    </td>
                    <td style={S.td}>
                      {book.available_copies === 0
                        ? <span style={S.unavail}>Unavailable</span>
                        : book.available_copies === book.total_copies
                          ? <span style={S.avail}>{book.available_copies} / {book.total_copies} ✓</span>
                          : <span style={S.partial}>{book.available_copies} / {book.total_copies}</span>
                      }
                    </td>
                    <td style={S.td}>
                      <button type="button" style={S.editBtn} onClick={() => openEdit(book)}>✏ Edit</button>
                      <button
                        type="button"
                        style={{ ...S.delBtn, opacity: book.issued_copies > 0 ? 0.4 : 1, cursor: book.issued_copies > 0 ? 'not-allowed' : 'pointer' }}
                        onClick={() => handleDelete(book)}
                        title={book.issued_copies > 0 ? 'Cannot delete — copies are issued' : 'Delete'}
                      >🗑</button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={S.modal}>
            <h2 style={S.mTitle}>{editing ? '✏ Edit Book' : '+ Add New Book'}</h2>

            <div style={S.field}>
              <label style={S.label}>Title *</label>
              <input style={S.finput} value={form.title} placeholder="Book title" onChange={e => setF('title', e.target.value)} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Author *</label>
              <input style={S.finput} value={form.author} placeholder="Author name" onChange={e => setF('author', e.target.value)} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Category *</label>
              <select style={S.finput} value={form.category} onChange={e => setF('category', e.target.value)}>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>ISBN</label>
                <input style={S.finput} value={form.isbn} placeholder="978-..." onChange={e => setF('isbn', e.target.value)} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Rack Number</label>
                <input style={S.finput} value={form.rack_number} placeholder="A-12" onChange={e => setF('rack_number', e.target.value)} />
              </div>
            </div>

            <div style={S.field}>
              <label style={S.label}>Total Copies *</label>
              <input
                style={S.finput}
                type="number"
                min={editing ? editing.issued_copies : 1}
                value={form.total_copies}
                onChange={e => setF('total_copies', e.target.value)}
              />
              {editing && (
                <div style={{ color: C.muted, fontSize: '12px', marginTop: '4px' }}>
                  {editing.issued_copies} issued · new available = {Math.max(0, Number(form.total_copies) - editing.issued_copies)}
                </div>
              )}
              {!editing && (
                <div style={{ color: C.muted, fontSize: '12px', marginTop: '4px' }}>
                  issued = 0 · available = {Number(form.total_copies) || 0}
                </div>
              )}
            </div>


            <div style={S.field}>
              <label style={S.label}>Cover Image URL</label>
              <input style={S.finput} value={form.cover_image_url} placeholder="https://... (optional)" onChange={e => setF('cover_image_url', e.target.value)} />
            </div>

            {formErr && <div style={S.errMsg}>{formErr}</div>}

            <div style={S.mBtns}>
              <button type="button" style={S.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" style={S.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Book' : 'Add Book'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

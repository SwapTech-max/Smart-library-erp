import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const S = {
  page: { minHeight: '100vh', background: '#0a0a0f', color: '#f1f5f9', fontFamily: 'sans-serif' },
  nav: { background: '#111118', borderBottom: '1px solid #1e1e2e', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700', fontSize: '18px' },
  badge: { background: '#2a0a0a', color: '#f87171', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' },
  backBtn: { background: 'transparent', border: '1px solid #2d2d44', color: '#94a3b8', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  main: { padding: '32px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: '700', margin: 0 },
  sub: { color: '#64748b', fontSize: '14px', marginTop: '4px' },
  searchRow: { display: 'flex', gap: '12px', marginBottom: '24px' },
  input: { background: '#111118', border: '1px solid #2d2d44', color: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none', flex: 1 },
  select: { background: '#111118', border: '1px solid #2d2d44', color: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#111118', borderRadius: '12px', overflow: 'hidden' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', borderBottom: '1px solid #1e1e2e', background: '#0f0f1a' },
  td: { padding: '14px 16px', fontSize: '14px', borderBottom: '1px solid #1a1a2e', verticalAlign: 'middle' },
  roleAdmin: { background: '#2a0a0a', color: '#f87171', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  roleLib: { background: '#1e1e3f', color: '#818cf8', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  roleStu: { background: '#0f2a1a', color: '#4ade80', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  empty: { textAlign: 'center', padding: '60px', color: '#64748b' },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' },
  statCard: { background: '#111118', border: '1px solid #1e1e2e', borderRadius: '12px', padding: '16px 20px' },
  statLabel: { color: '#64748b', fontSize: '13px', marginBottom: '6px' },
  statVal: { fontSize: '24px', fontWeight: '700' },
  addBtn: { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' },
  modal: { background: '#111118', border: '1px solid #2d2d44', borderRadius: '18px', padding: '32px', width: '500px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' },
  mTitle: { fontSize: '20px', fontWeight: '800', marginBottom: '24px' },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' },
  finput: { width: '100%', background: '#0a0a0f', border: '1px solid #2d2d44', color: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  mBtns: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '28px' },
  cancelBtn: { background: 'transparent', border: '1px solid #2d2d44', color: '#94a3b8', padding: '9px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  saveBtn: { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  errMsg: { color: '#f87171', fontSize: '13px', marginTop: '12px', padding: '10px 14px', background: '#2a0a0a', borderRadius: '8px' },
  successMsg: { color: '#4ade80', fontSize: '13px', marginTop: '12px', padding: '10px 14px', background: '#0f2a1a', borderRadius: '8px' },
  editBtn: { background: '#1e1e3f', color: '#818cf8', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', marginRight: '6px', fontWeight: '600' },
  delBtn: { background: '#2a0a0a', color: '#f87171', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  delBtnDis: { background: '#1a1a2e', color: '#64748b', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'not-allowed', fontSize: '12px', fontWeight: '600' },
}

const EMPTY_FORM = { full_name: '', email: '', password: '', role: 'STUDENT', branch: '', year: '', semester: '', library_id: '' }

export default function AdminUsers() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const [modalType, setModalType] = useState(null) // 'add' or 'edit'
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  function openAdd() {
    setModalType('add')
    setForm(EMPTY_FORM)
    setFormErr('')
    setSuccessMsg('')
  }

  function openEdit(u) {
    setModalType('edit')
    setForm({
      id: u.id,
      full_name: u.full_name || '',
      role: u.role || 'STUDENT',
      branch: u.branch || '',
      year: u.year || '',
      semester: u.semester || '',
      library_id: u.library_id || ''
    })
    setFormErr('')
    setSuccessMsg('')
  }

  function setF(key, val) {
    setForm(p => ({ ...p, [key]: val }))
  }

  async function handleSave() {
    setFormErr('')
    setSuccessMsg('')
    if (!form.full_name?.trim()) return setFormErr('Full Name is required.')
    if (!form.role) return setFormErr('Role is required.')
    
    setSaving(true)
    
    if (modalType === 'add') {
      if (!form.email?.trim()) { setSaving(false); return setFormErr('Email is required.') }
      if (!form.password?.trim()) { setSaving(false); return setFormErr('Password is required.') }
      
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.full_name,
            role: form.role,
            branch: form.branch,
            year: form.year,
            semester: form.semester,
            library_id: form.library_id
          }
        }
      })
      
      if (error) {
        setFormErr(error.message)
      } else {
        setSuccessMsg('User added successfully! (Note: Current session might be updated)')
        if (data?.user) {
          const newUser = {
            id: data.user.id,
            email: form.email,
            full_name: form.full_name,
            role: form.role,
            branch: form.branch,
            year: form.year,
            semester: form.semester,
            library_id: form.library_id,
            created_at: new Date().toISOString()
          }
          setUsers(prev => [newUser, ...prev])
        }
        setTimeout(() => setModalType(null), 2500)
      }
    } else if (modalType === 'edit') {
      const { error } = await supabase.from('users').update({
        full_name: form.full_name,
        role: form.role,
        branch: form.branch,
        year: form.year,
        semester: form.semester,
        library_id: form.library_id
      }).eq('id', form.id)

      if (error) {
        setFormErr(error.message)
      } else {
        setUsers(prev => prev.map(u => u.id === form.id ? { ...u, ...form } : u))
        setModalType(null)
      }
    }
    
    setSaving(false)
  }

  async function handleDelete(u) {
    if (u.role === 'SUPER_ADMIN') return
    if (!confirm(`Are you sure you want to delete ${u.full_name}?`)) return
    
    setDeletingId(u.id)
    const { error } = await supabase.from('users').delete().eq('id', u.id)
    if (error) {
      alert(`Error deleting user: ${error.message}`)
    } else {
      setUsers(prev => prev.filter(user => user.id !== u.id))
    }
    setDeletingId(null)
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchQ = !q || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    const matchR = !roleFilter || u.role === roleFilter
    return matchQ && matchR
  })

  const students = users.filter(u => u.role === 'STUDENT').length
  const librarians = users.filter(u => u.role === 'LIBRARIAN').length
  const admins = users.filter(u => u.role === 'SUPER_ADMIN').length

  function roleBadge(role) {
    if (role === 'SUPER_ADMIN') return <span style={S.roleAdmin}>Super Admin</span>
    if (role === 'LIBRARIAN') return <span style={S.roleLib}>Librarian</span>
    return <span style={S.roleStu}>Student</span>
  }

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={S.logo}>
          <span style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '8px', padding: '6px', fontSize: '18px' }}>📚</span>
          Smart Library ERP <span style={S.badge}>SUPER ADMIN</span>
        </div>
        <button type="button" style={S.backBtn} onClick={() => navigate('/admin/dashboard')}>← Dashboard</button>
      </nav>

      <div style={S.main}>
        <div style={S.header}>
          <div>
            <h1 style={S.title}>Manage Users</h1>
            <p style={S.sub}>{users.length} total users</p>
          </div>
          <button type="button" style={S.addBtn} onClick={openAdd}>+ Add User</button>
        </div>

        <div style={S.statRow}>
          <div style={S.statCard}><div style={S.statLabel}>Students</div><div style={{ ...S.statVal, color: '#4ade80' }}>{students}</div></div>
          <div style={S.statCard}><div style={S.statLabel}>Librarians</div><div style={{ ...S.statVal, color: '#818cf8' }}>{librarians}</div></div>
          <div style={S.statCard}><div style={S.statLabel}>Admins</div><div style={{ ...S.statVal, color: '#f87171' }}>{admins}</div></div>
        </div>

        <div style={S.searchRow}>
          <input style={S.input} placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={S.select} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="STUDENT">Students</option>
            <option value="LIBRARIAN">Librarians</option>
            <option value="SUPER_ADMIN">Admins</option>
          </select>
        </div>

        {loading ? <div style={S.empty}>Loading users...</div> : filtered.length === 0 ? <div style={S.empty}>No users found.</div> : (
          <table style={S.table}>
            <thead>
              <tr>{['Name', 'Email', 'Role', 'Branch', 'Year', 'Library ID', 'Joined', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}
                  onMouseEnter={e => e.currentTarget.style.background = '#13131f'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={S.td}><strong>{u.full_name}</strong></td>
                  <td style={{ ...S.td, color: '#94a3b8' }}>{u.email}</td>
                  <td style={S.td}>{roleBadge(u.role)}</td>
                  <td style={{ ...S.td, color: '#64748b' }}>{u.branch || '—'}</td>
                  <td style={{ ...S.td, color: '#64748b' }}>{u.year ? `Year ${u.year}` : '—'}</td>
                  <td style={{ ...S.td, color: '#64748b' }}>{u.library_id || '—'}</td>
                  <td style={{ ...S.td, color: '#64748b' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={S.td}>
                    <button type="button" style={S.editBtn} onClick={() => openEdit(u)}>✏ Edit</button>
                    {u.role === 'SUPER_ADMIN' ? (
                      <button type="button" style={S.delBtnDis} title="Cannot delete admin" disabled>🗑 Delete</button>
                    ) : (
                      <button type="button" style={S.delBtn} onClick={() => handleDelete(u)} disabled={deletingId === u.id}>
                        {deletingId === u.id ? '...' : '🗑 Delete'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalType && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setModalType(null)}>
          <div style={S.modal}>
            <h2 style={S.mTitle}>{modalType === 'add' ? '+ Add New User' : '✏ Edit User'}</h2>

            <div style={S.field}>
              <label style={S.label}>Full Name *</label>
              <input style={S.finput} value={form.full_name} placeholder="John Doe" onChange={e => setF('full_name', e.target.value)} />
            </div>

            {modalType === 'add' && (
              <>
                <div style={S.field}>
                  <label style={S.label}>Email *</label>
                  <input style={S.finput} type="email" value={form.email} placeholder="john@example.com" onChange={e => setF('email', e.target.value)} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Password *</label>
                  <input style={S.finput} type="password" value={form.password} placeholder="••••••••" onChange={e => setF('password', e.target.value)} />
                </div>
              </>
            )}

            <div style={S.field}>
              <label style={S.label}>Role *</label>
              <select style={S.finput} value={form.role} onChange={e => setF('role', e.target.value)}>
                <option value="STUDENT">STUDENT</option>
                <option value="LIBRARIAN">LIBRARIAN</option>
              </select>
            </div>

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Branch</label>
                <input style={S.finput} value={form.branch} placeholder="CSE, IT, etc." onChange={e => setF('branch', e.target.value)} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Year</label>
                <input style={S.finput} type="number" min="1" max="4" value={form.year} placeholder="1-4" onChange={e => setF('year', e.target.value)} />
              </div>
            </div>

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Semester</label>
                <input style={S.finput} type="number" min="1" max="8" value={form.semester} placeholder="1-8" onChange={e => setF('semester', e.target.value)} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Library ID</label>
                <input style={S.finput} value={form.library_id} placeholder="LIB-..." onChange={e => setF('library_id', e.target.value)} />
              </div>
            </div>

            {formErr && <div style={S.errMsg}>{formErr}</div>}
            {successMsg && <div style={S.successMsg}>{successMsg}</div>}

            <div style={S.mBtns}>
              <button type="button" style={S.cancelBtn} onClick={() => setModalType(null)}>Cancel</button>
              <button type="button" style={S.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : modalType === 'add' ? 'Add User' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

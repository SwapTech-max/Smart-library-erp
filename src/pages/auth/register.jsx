import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { BookOpen, Mail, Lock, User, Phone, CreditCard, Loader2, Eye, EyeOff, ChevronDown } from 'lucide-react'

export default function Register() {
  const navigate  = useNavigate()
  const { signUp } = useAuth()

  const [formData, setFormData] = useState({
    fullName:        '',
    email:           '',
    password:        '',
    confirmPassword: '',
    branch:          '',
    year:            '',
    semester:        '',
    role:            'STUDENT',   // default role
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState('')

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  // ── Custom validation (no HTML required) ───────────────────
  const validate = () => {
    if (!formData.fullName.trim())        return 'Full name is required.'
    if (!formData.email.trim())           return 'Email is required.'
    if (formData.password.length < 6)     return 'Password must be at least 6 characters.'
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match.'
    if (!['STUDENT', 'LIBRARIAN'].includes(formData.role)) return 'Please select a valid role.'
    
    if (formData.role === 'STUDENT') {
      if (!formData.branch) return 'Branch is required for students.'
      if (!formData.year) return 'Year is required for students.'
      if (!formData.semester) return 'Semester is required for students.'
    }
    
    return null
  }

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) return setError(validationError)

    setSubmitting(true)
    setError('')

    try {
      const library_id = formData.role === 'STUDENT' ? `LIB-${Math.floor(1000 + Math.random() * 9000)}` : null

      const { error: signUpError } = await signUp({
        email:      formData.email,
        password:   formData.password,
        fullName:   formData.fullName,
        role:       formData.role,
        branch:     formData.role === 'STUDENT' ? formData.branch : null,
        year:       formData.role === 'STUDENT' ? parseInt(formData.year, 10) : null,
        semester:   formData.role === 'STUDENT' ? parseInt(formData.semester, 10) : null,
        library_id: library_id,
      })

      if (signUpError) {
        setError(signUpError.message || 'Registration failed. Please try again.')
      } else {
        navigate('/login', { state: { registered: true } })
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Styles ──────────────────────────────────────────────────
  const baseInput = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    padding: '11px 14px 11px 40px',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const inputWithEye = { ...baseInput, paddingRight: '40px' }

  const iconStyle = {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  }

  const eyeBtn = {
    position: 'absolute',
    right: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  }

  const labelStyle = {
    color: '#9ca3af',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '8px',
    display: 'block',
  }

  const onFocus = (e) => { e.target.style.borderColor = 'rgba(99,102,241,0.5)' }
  const onBlur  = (e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)' }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px),linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        zIndex: 0,
      }} />

      {/* Glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%',
        transform: 'translateX(-50%)',
        width: '600px', height: '300px',
        background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)',
        zIndex: 0, pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: '420px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: '20px',
        padding: '40px 36px',
        boxShadow: '0 0 40px rgba(99,102,241,0.1), 0 25px 50px rgba(0,0,0,0.4)',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: '12px', padding: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99,102,241,0.4)',
          }}>
            <BookOpen size={22} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'white', letterSpacing: '-0.3px' }}>
              Smart Library
            </div>
            <div style={{ fontSize: '11px', color: '#6366f1', letterSpacing: '1px', textTransform: 'uppercase' }}>
              ERP System
            </div>
          </div>
        </div>

        {/* Heading */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: '700', color: 'white', marginBottom: '6px', margin: 0 }}>
            Create Account
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '6px' }}>
            Register to access your library portal
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px', padding: '12px 14px',
            color: '#f87171', fontSize: '13px', marginBottom: '20px',
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ── Role Selector ── */}
          <div>
            <label style={labelStyle}>Register As</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {['STUDENT', 'LIBRARIAN'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: r }))}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: formData.role === r
                      ? '1px solid rgba(99,102,241,0.7)'
                      : '1px solid rgba(255,255,255,0.08)',
                    background: formData.role === r
                      ? 'rgba(99,102,241,0.15)'
                      : 'rgba(255,255,255,0.04)',
                    color: formData.role === r ? '#a5b4fc' : '#6b7280',
                    fontSize: '13px',
                    fontWeight: formData.role === r ? '600' : '400',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {r === 'STUDENT' ? '🎓 Student' : '📚 Librarian'}
                </button>
              ))}
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label style={labelStyle}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={15} color="#6366f1" style={iconStyle} />
              <input id="reg-fullName" name="fullName" type="text" placeholder="John Doe"
                value={formData.fullName} onChange={handleChange}
                style={baseInput} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} color="#6366f1" style={iconStyle} />
              <input id="reg-email" name="email" type="text" placeholder="you@college.edu"
                value={formData.email} onChange={handleChange}
                style={baseInput} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>

          {formData.role === 'STUDENT' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Branch</label>
                <select name="branch" value={formData.branch} onChange={handleChange} style={baseInput} onFocus={onFocus} onBlur={onBlur}>
                  <option value="">Select</option>
                  <option value="CSE">CSE</option>
                  <option value="EE">EE</option>
                  <option value="CE">CE</option>
                  <option value="ME">ME</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Year</label>
                <select name="year" value={formData.year} onChange={handleChange} style={baseInput} onFocus={onFocus} onBlur={onBlur}>
                  <option value="">Select</option>
                  {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Semester</label>
                <select name="semester" value={formData.semester} onChange={handleChange} style={baseInput} onFocus={onFocus} onBlur={onBlur}>
                  <option value="">Select</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} color="#6366f1" style={iconStyle} />
              <input id="reg-password" name="password" type={showPassword ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                value={formData.password} onChange={handleChange}
                style={inputWithEye} onFocus={onFocus} onBlur={onBlur} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeBtn}>
                {showPassword ? <EyeOff size={15} color="#6b7280" /> : <Eye size={15} color="#6b7280" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label style={labelStyle}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} color="#6366f1" style={iconStyle} />
              <input id="reg-confirmPassword" name="confirmPassword" type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={formData.confirmPassword} onChange={handleChange}
                style={inputWithEye} onFocus={onFocus} onBlur={onBlur} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={eyeBtn}>
                {showConfirm ? <EyeOff size={15} color="#6b7280" /> : <Eye size={15} color="#6b7280" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            id="reg-submit"
            type="submit"
            disabled={submitting}
            style={{
              background: submitting ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none', borderRadius: '10px', padding: '13px',
              color: 'white', fontSize: '15px', fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: '4px',
              boxShadow: submitting ? 'none' : '0 0 20px rgba(99,102,241,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {submitting && <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />}
            {submitting ? 'Creating Account...' : 'Create Account'}
          </button>

        </form>

        {/* Divider */}
        <div style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ color: '#4b5563', fontSize: '12px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
        </div>

        {/* Sign in link */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#6366f1', fontWeight: '600', textDecoration: 'none' }}>
              Sign In
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <p style={{ color: '#4b5563', fontSize: '12px' }}>
            Smart Digital Library ERP • Engineering College
          </p>
        </div>

      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: #4b5563; }
      `}</style>

    </div>
  )
}
import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { BookOpen, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import collegeBg from '../../assets/college.webp'

export default function Login() {
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [error, setError]               = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { signIn, profile, loading } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const registered = Boolean(location.state?.registered)

  useEffect(() => {
    if (loading) return
    if (!profile) return
    if (profile.role === 'SUPER_ADMIN') navigate('/admin/dashboard',     { replace: true })
    else if (profile.role === 'LIBRARIAN') navigate('/librarian/dashboard', { replace: true })
    else navigate('/student/dashboard', { replace: true })
  }, [profile, loading, navigate])

  const validate = () => {
    if (!email.trim())    return 'Email is required.'
    if (!password.trim()) return 'Password is required.'
    return null
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) return setError(validationError)
    setSubmitting(true)
    setError('')
    const { error: signInError } = await signIn(email, password)
    if (signInError) {
      setError(signInError.message || 'Invalid email or password.')
      setSubmitting(false)
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '11px 14px 11px 40px',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '16px',
      overflow: 'hidden',
      fontFamily: 'sans-serif',
    }}>

      {/* Layer 1 — background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        backgroundImage: `url(${collegeBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }} />

      {/* Layer 2 — gradient overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.85) 100%)',
      }} />

      {/* Layer 3 — college header */}
      <div style={{
        position: 'absolute',
        top: '28px',
        left: 0,
        right: 0,
        zIndex: 2,
        textAlign: 'center',
        padding: '0 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '10px',
          boxShadow: '0 0 24px rgba(99,102,241,0.5)',
        }}>
          <BookOpen size={24} color="white" />
        </div>
        <h1 style={{
          color: 'white',
          fontSize: '24px',
          fontWeight: '800',
          margin: 0,
          textShadow: '0 2px 12px rgba(0,0,0,0.9)',
          lineHeight: 1.2,
        }}>
          Government Engineering College
        </h1>
        <p style={{
          color: '#a5b4fc',
          fontSize: '14px',
          fontWeight: '600',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          margin: '6px 0 0 0',
        }}>
          Palamu, Jharkhand
        </p>
        <div style={{
          width: '80px',
          height: '2px',
          marginTop: '10px',
          background: 'linear-gradient(90deg, transparent, #6366f1, transparent)',
          borderRadius: '2px',
        }} />
        <p style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: '11px',
          margin: '10px 0 0 0',
        }}>
          Established 1956 • AICTE Approved • Govt. of Jharkhand
        </p>
      </div>

      {/* Layer 4 — login card */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(8,8,18,0.80)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: '20px',
        padding: '36px',
        boxShadow: '0 0 60px rgba(0,0,0,0.6), 0 0 30px rgba(99,102,241,0.1)',
        marginTop: '140px',
      }}>

        {/* Card Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
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

        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'white', margin: 0 }}>
            Welcome back
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '6px', marginBottom: 0 }}>
            Sign in to access your library dashboard
          </p>
        </div>

        {/* Success message */}
        {registered && (
          <div style={{
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: '10px', padding: '12px 14px',
            color: '#4ade80', fontSize: '13px', marginBottom: '20px',
          }}>
            ✓ Account created! Please verify your email then sign in.
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px', padding: '12px 14px',
            color: '#f87171', fontSize: '13px', marginBottom: '20px',
          }}>
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Email */}
          <div>
            <label style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} color="#6366f1" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="text"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="you@college.edu"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
                onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} color="#6366f1" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="••••••••"
                style={{ ...inputStyle, paddingRight: '40px' }}
                onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
                onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {showPassword ? <EyeOff size={15} color="#6b7280" /> : <Eye size={15} color="#6b7280" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: submitting ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none', borderRadius: '10px', padding: '13px',
              color: 'white', fontSize: '15px', fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: '4px',
              boxShadow: submitting ? 'none' : '0 0 20px rgba(99,102,241,0.35)',
              transition: 'all 0.2s',
            }}
          >
            {submitting && <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />}
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ margin: '20px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ color: '#4b5563', fontSize: '12px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
        </div>

        {/* Register link */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ color: '#6366f1', fontWeight: '600', textDecoration: 'none' }}>
              Create Account
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <p style={{ color: '#4b5563', fontSize: '12px', margin: 0 }}>
            Smart Digital Library ERP • Government Engineering College Palamu
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
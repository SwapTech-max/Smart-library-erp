import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

/* eslint-disable react-refresh/only-export-components */

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Prevents stale async callbacks from mutating state after unmount
  const mountedRef = useRef(true)
  // Tracks whether the initial session check has already completed
  // so the onAuthStateChange listener doesn't double-fire on first load
  const initDoneRef = useRef(false)

  // ─── Fetch Profile ─────────────────────────────────────────────
  const fetchProfile = async (userId) => {
    console.log('[Auth] fetchProfile called for userId:', userId)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (!mountedRef.current) return

      if (error) {
        console.log('[Auth] Profile error:', error.message)
        setProfile(null)
      } else {
        console.log('[Auth] Profile loaded, role:', data?.role)
        setProfile(data ?? null)
      }
    } catch (err) {
      console.log('[Auth] fetchProfile exception:', err?.message)
      if (mountedRef.current) setProfile(null)
    } finally {
      if (mountedRef.current) {
        console.log('[Auth] setLoading(false) from fetchProfile finally')
        setLoading(false)
      }
    }
  }

  // ─── Init on Mount ─────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true

    const init = async () => {
      console.log('[Auth] init() started — checking session...')
      try {
        const { data, error } = await supabase.auth.getSession()

        if (!mountedRef.current) return

        if (error) {
          console.log('[Auth] getSession error:', error.message)
          // Clear bad/stale refresh tokens
          if (String(error.message).toLowerCase().includes('invalid refresh token')) {
            try { await supabase.auth.signOut() } catch { /* ignore */ }
          }
          setUser(null)
          setProfile(null)
          setLoading(false)
          initDoneRef.current = true
          return
        }

        const session = data?.session ?? null

        if (!session) {
          console.log('[Auth] No session found')
          setUser(null)
          setProfile(null)
          setLoading(false)
          initDoneRef.current = true
          return
        }

        console.log('[Auth] Session found:', session.user.id)
        setUser(session.user)
        await fetchProfile(session.user.id)
        initDoneRef.current = true
      } catch (err) {
        console.log('[Auth] init() exception:', err?.message)
        if (mountedRef.current) {
          setUser(null)
          setProfile(null)
          setLoading(false)
          initDoneRef.current = true
        }
      }
    }

    init()

    // ─── Auth State Listener ──────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth event:', event)

        if (!mountedRef.current) return

        // Skip the very first SIGNED_IN that mirrors the getSession()
        // result — init() already handles that. This avoids the race where
        // onAuthStateChange fires before init() finishes, causing loading
        // to be set true again and then never resolved.
        if (!initDoneRef.current && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          console.log('[Auth] Skipping early auth event (init not done yet):', event)
          return
        }

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }

        if (session?.user) {
          setUser(session.user)
          setLoading(true)
          await fetchProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [])

  // ─── Sign In ───────────────────────────────────────────────────
  const signIn = async (email, password) => {
    console.log('[Auth] signIn() called for:', email)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) console.log('[Auth] signIn error:', error.message)
      else console.log('[Auth] signIn success, user:', data?.user?.id)
      return { data, error }
    } catch (err) {
      console.log('[Auth] signIn exception:', err?.message)
      return { data: null, error: err }
    }
  }

  // ─── Sign Up ───────────────────────────────────────────────────
  const signUp = async ({ email, password, fullName, role, branch, year, semester, library_id }) => {
    console.log('[Auth] signUp() called for:', email, 'role:', role)
    try {
      // 1. Create the auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role || 'STUDENT',
            branch: branch || null,
            year: year || null,
            semester: semester || null,
            library_id: library_id || null,
          },
        },
      })

      if (error) {
        console.log('[Auth] signUp auth error:', error.message)
        return { data: null, error }
      }

      console.log('[Auth] Auth user created:', data?.user?.id)

      // Profile row is auto-created by the DB trigger (handle_new_user)
      // using the metadata we passed above. No manual INSERT needed.
      console.log('[Auth] signUp success — profile row created by DB trigger')

      return { data, error: null }
    } catch (err) {
      console.log('[Auth] signUp exception:', err?.message)
      return { data: null, error: { message: 'Registration failed. Please try again.' } }
    }
  }

  // ─── Sign Out ──────────────────────────────────────────────────
  const signOut = async () => {
    console.log('[Auth] signOut() called')
    try {
      await supabase.auth.signOut()
      console.log('[Auth] signOut success')
    } catch (err) {
      console.log('[Auth] signOut error:', err?.message)
    } finally {
      if (mountedRef.current) {
        setProfile(null)
        setUser(null)
        setLoading(false)
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
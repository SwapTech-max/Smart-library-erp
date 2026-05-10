import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchTransactions,
  fetchStudentActiveTransactions,
  fetchStudentHistory,
  fetchStudentDashboardStats,
  fetchLibrarianStats,
  fetchAdminStats,
  issueBook,
  returnBook,
} from '../services/transactionService'

/**
 * useTransactions — for librarian/admin: full transaction list with search + filter.
 */
export function useTransactions({ studentId = null, status = null, search = '' } = {}) {
  const [transactions, setTransactions] = useState([])
  const [count, setCount]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const mountedRef                      = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchTransactions({ studentId, status, search })
      if (!mountedRef.current) return
      setTransactions(result.data)
      setCount(result.count)
    } catch (err) {
      if (mountedRef.current) setError(err.message)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [studentId, status, search])

  useEffect(() => { load() }, [load])

  return { transactions, count, loading, error, refresh: load }
}

/**
 * useStudentBooks — student's current + history transactions.
 */
export function useStudentBooks(userId) {
  const [active, setActive]   = useState([])
  const [history, setHistory] = useState([])
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const mountedRef            = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const [activeData, histData, statsData] = await Promise.all([
        fetchStudentActiveTransactions(userId),
        fetchStudentHistory(userId),
        fetchStudentDashboardStats(userId),
      ])
      if (!mountedRef.current) return
      setActive(activeData)
      setHistory(histData)
      setStats(statsData)
    } catch (err) {
      if (mountedRef.current) setError(err.message)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  return { active, history, stats, loading, error, refresh: load }
}

/**
 * useLibrarianStats — real-time stats for librarian dashboard.
 */
export function useLibrarianStats() {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const mountedRef            = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    fetchLibrarianStats()
      .then(s => { if (mountedRef.current) { setStats(s); setLoading(false) } })
      .catch(() => { if (mountedRef.current) setLoading(false) })
  }, [])

  return { stats, loading }
}

/**
 * useAdminStats — real-time stats for super admin dashboard.
 */
export function useAdminStats() {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const mountedRef            = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    fetchAdminStats()
      .then(s => { if (mountedRef.current) { setStats(s); setLoading(false) } })
      .catch(() => { if (mountedRef.current) setLoading(false) })
  }, [])

  return { stats, loading }
}

/**
 * useIssueBook — manage issue flow state.
 */
export function useIssueBook() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [result, setResult]   = useState(null)

  const issue = useCallback(async (params) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await issueBook(params)
      setResult(data)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => { setError(null); setResult(null) }, [])

  return { issue, loading, error, result, reset }
}

/**
 * useReturnBook — manage return flow state.
 */
export function useReturnBook() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [result, setResult]   = useState(null)

  const doReturn = useCallback(async (params) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await returnBook(params)
      setResult(data)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => { setError(null); setResult(null) }, [])

  return { doReturn, loading, error, result, reset }
}

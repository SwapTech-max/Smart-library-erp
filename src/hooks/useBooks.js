import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchBooks, addBook, updateBook, deleteBook, fetchBookStats } from '../services/bookService'

/**
 * useBooks — complete book management hook.
 * Handles fetching, pagination-ready state, CRUD, and search/filter.
 */
export function useBooks({ search = '', category = '', onlyAvailable = false } = {}) {
  const [books, setBooks]     = useState([])
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const mountedRef            = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, bookStats] = await Promise.all([
        fetchBooks({ search, category, onlyAvailable }),
        fetchBookStats(),
      ])
      if (!mountedRef.current) return
      setBooks(data)
      setStats(bookStats)
    } catch (err) {
      if (mountedRef.current) setError(err.message)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [search, category, onlyAvailable])

  useEffect(() => { load() }, [load])

  const createBook = useCallback(async (payload) => {
    const data = await addBook(payload)
    load()
    return data
  }, [load])

  const editBook = useCallback(async (id, payload) => {
    const data = await updateBook(id, payload)
    load()
    return data
  }, [load])

  const removeBook = useCallback(async (id) => {
    await deleteBook(id)
    load()
  }, [load])

  return { books, stats, loading, error, refresh: load, createBook, editBook, removeBook }
}

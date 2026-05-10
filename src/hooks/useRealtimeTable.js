import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * useRealtimeTable — generic hook that fetches a table and subscribes to live changes.
 * @param {string} tableName - Supabase table name
 * @param {function} fetchFn  - async function that returns the initial array of rows
 * @param {object|null} filter - { column, value } for realtime filter (optional)
 * @param {string} primaryKey  - primary key column name (default: 'id')
 */
export function useRealtimeTable(tableName, fetchFn, filter = null, primaryKey = 'id') {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const fetchRef              = useRef(fetchFn)
  fetchRef.current            = fetchFn

  const loadData = useCallback(async () => {
    setLoading(true)
    const data = await fetchRef.current()
    setRows(data || [])
    setLoading(false)
  }, [tableName]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const channelName = filter
      ? `${tableName}-${filter.column}-${filter.value}`
      : `${tableName}-all`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
        },
        ({ eventType, new: newRow, old: oldRow }) => {
          setRows((prev) => {
            if (eventType === 'INSERT') {
              if (prev.some((r) => r[primaryKey] === newRow[primaryKey])) return prev
              return [newRow, ...prev]
            }
            if (eventType === 'UPDATE')
              return prev.map((r) => (r[primaryKey] === newRow[primaryKey] ? newRow : r))
            if (eventType === 'DELETE')
              return prev.filter((r) => r[primaryKey] !== oldRow[primaryKey])
            return prev
          })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [tableName, filter, primaryKey])

  return { rows, loading, refetch: loadData }
}

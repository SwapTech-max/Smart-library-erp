import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * useRealtime — subscribes to a Supabase table and calls onChange on any change
 * @param {string} table - table name
 * @param {function} onChange - callback when data changes
 * @param {string} filter - optional filter e.g. 'student_id=eq.uuid'
 */
export function useRealtime(table, onChange, filter = null) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const channelName = `realtime-${table}-${Math.random()}`
    let channel = supabase.channel(channelName)

    const config = filter
      ? { event: '*', schema: 'public', table, filter }
      : { event: '*', schema: 'public', table }

    channel
      .on('postgres_changes', config, (payload) => {
        onChangeRef.current(payload)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter])
}
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * useActivityFeed — fetches the latest activity_logs and subscribes for live inserts.
 * @param {number} limit  - max entries to show (default 50)
 * @param {string|null} actorFilter - optional actor_name to filter (for student mini-feed)
 */
export function useActivityFeed(limit = 50, actorFilter = null) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (actorFilter) query = query.eq('actor_name', actorFilter)

    query.then(({ data }) => {
      setActivities(data || [])
      setLoading(false)
    })

    // Realtime — only new INSERTs
    const channel = supabase
      .channel(`activity-feed-${actorFilter || 'global'}-${Math.random()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        (payload) => {
          if (actorFilter && payload.new?.actor_name !== actorFilter) return
          setActivities((prev) => [payload.new, ...prev].slice(0, limit))
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [limit, actorFilter])

  return { activities, loading }
}

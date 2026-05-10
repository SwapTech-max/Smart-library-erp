import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * useAttendance — fetches attendance_logs and keeps them live via realtime.
 * @param {string|null} studentId - if provided, filters to that student only
 *
 * NOTE: DB stores status as uppercase ('PRESENT' / 'ABSENT').
 * All comparisons here use uppercase accordingly.
 */
export function useAttendance(studentId = null) {
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading]       = useState(true)

  // ── Initial fetch ────────────────────────────────────────────
  const fetchAttendance = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('attendance_logs')
      .select('*, users(full_name, roll_number, branch, year)')
      .order('date', { ascending: false })

    if (studentId) query = query.eq('student_id', studentId)

    const { data } = await query
    setAttendance(data || [])
    setLoading(false)
  }, [studentId])

  // ── Realtime subscription ────────────────────────────────────
  useEffect(() => {
    fetchAttendance()

    const channel = supabase
      .channel('attendance-channel')   // stable name so only one channel is open
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_logs',
          // Filter server-side when watching a specific student
          ...(studentId ? { filter: `student_id=eq.${studentId}` } : {}),
        },
        (payload) => {
          console.log('[Realtime] attendance_logs change:', payload)
          const { eventType, new: newRow, old: oldRow } = payload

          setAttendance((prev) => {
            if (eventType === 'INSERT') return [newRow, ...prev]
            if (eventType === 'UPDATE')
              return prev.map((r) => (r.id === newRow.id ? newRow : r))
            if (eventType === 'DELETE')
              return prev.filter((r) => r.id !== oldRow.id)
            return prev
          })
        }
      )
      .subscribe()

    // Cleanup: remove channel on unmount / dependency change
    return () => { supabase.removeChannel(channel) }
  }, [fetchAttendance, studentId])

  // ── Derived stats (all uppercase comparisons to match DB) ────
  const todayStr     = new Date().toISOString().split('T')[0]
  const todayRecords = attendance.filter((a) => a.date === todayStr)
  const presentToday = todayRecords.filter((a) => a.status === 'PRESENT').length
  const absentToday  = todayRecords.filter((a) => a.status === 'ABSENT').length

  // Attendance % for student's own last-30-day history
  const last30 = attendance.slice(0, 30)
  const attendancePct =
    last30.length > 0
      ? Math.round(
          (last30.filter((a) => a.status === 'PRESENT').length / last30.length) * 100
        )
      : 0

  return {
    attendance,
    loading,
    presentToday,
    absentToday,
    attendancePct,
    todayRecords,
    refetch: fetchAttendance,
  }
}

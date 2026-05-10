import { supabase } from '../lib/supabase'

const TODAY = () => new Date().toISOString().split('T')[0]

/**
 * Check if attendance already exists for a student on today's date.
 * Returns the existing record or null.
 */
export async function getExistingAttendance(studentId) {
  const { data } = await supabase
    .from('attendance_logs')
    .select('id, status')
    .eq('student_id', studentId)
    .eq('date', TODAY())
    .maybeSingle()
  return data  // null if not marked yet
}

/**
 * Insert a fresh attendance record for today.
 * Caller must check for duplicates BEFORE calling this.
 * Status values must be 'PRESENT' or 'ABSENT' (uppercase — matches DB).
 */
export async function insertAttendance({ studentId, status, markedBy }) {
  return supabase.from('attendance_logs').insert([
    {
      student_id: studentId,
      status: status.toUpperCase(),   // normalise to uppercase for DB
      date: TODAY(),
      marked_by: markedBy ?? null,
    },
  ])
}

/**
 * Update an existing attendance record (re-mark).
 */
export async function updateAttendance(recordId, { status, markedBy }) {
  return supabase
    .from('attendance_logs')
    .update({ status: status.toUpperCase(), marked_by: markedBy ?? null })
    .eq('id', recordId)
}

/**
 * High-level helper used by the Attendance page.
 * Returns { alreadyMarked: boolean, error }
 *   - alreadyMarked: true  → record existed and was RE-MARKED (update path)
 *   - alreadyMarked: false → fresh insert
 *   - error: Supabase error object or null
 */
export async function markAttendance({ studentId, status, markedBy }) {
  const existing = await getExistingAttendance(studentId)

  if (existing) {
    // Already marked today — update the status (re-mark allowed)
    const { error } = await updateAttendance(existing.id, { status, markedBy })
    return { alreadyMarked: true, error }
  }

  // Fresh insert for today
  const { error } = await insertAttendance({ studentId, status, markedBy })
  return { alreadyMarked: false, error }
}

/**
 * Log a system-wide activity event.
 * actionType: 'book_issued' | 'book_returned' | 'attendance_marked' | 'book_added' | 'overdue' | 'fine_paid'
 */
export async function logActivity(message, actionType, actorName) {
  return supabase.from('activity_logs').insert({
    message,
    action_type: actionType,
    actor_name: actorName,
    created_at: new Date().toISOString(),
  })
}

// NEW CODE START
// borrowService.js — Business rules for book borrowing
// RULE 1: Max 5 books per student at a time
// RULE 2: Due date = borrowed_at + 30 days
// RULE 3: Fine = ₹5 per day after due date
// RULE 4: Status auto set to OVERDUE when due_date has passed

import { supabase } from '../lib/supabase'

const MAX_BORROW_LIMIT = 5   // Rule 1: max books a student can hold
const BORROW_DAYS      = 30  // Rule 2: loan period in days
const FINE_PER_DAY     = 5   // Rule 3: fine rate in ₹ per overdue day

// ─── Helper: calculate fine from a due date ─────────────────────────────────
export function calculateBorrowFine(dueDateStr) {
  const now     = new Date()
  const dueDate = new Date(dueDateStr)
  if (now <= dueDate) return { isOverdue: false, daysOverdue: 0, fine: 0 }
  const daysOverdue = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24))
  return { isOverdue: true, daysOverdue, fine: daysOverdue * FINE_PER_DAY }
}

// ─── Helper: get due date string from today ──────────────────────────────────
export function getBorrowDueDate(fromDate = null) {
  const d = fromDate ? new Date(fromDate) : new Date()
  d.setDate(d.getDate() + BORROW_DAYS)
  return d.toISOString()
}

// ─── Check how many books a student currently has borrowed ──────────────────
export async function getStudentBorrowCount(studentId) {
  try {
    const { data, error } = await supabase
      .from('borrow_records')
      .select('id')
      .eq('student_id', studentId)
      .eq('status', 'BORROWED')
    if (error) return { count: 0, error }
    return { count: data.length, error: null }
  } catch (err) {
    return { count: 0, error: err }
  }
}

// ─── Check if student is within the 5-book limit ────────────────────────────
// RULE 1 enforcement
export async function checkCanBorrow(studentId) {
  const { count, error } = await getStudentBorrowCount(studentId)
  if (error) return { canBorrow: false, currentCount: 0, reason: 'Error checking borrow limit' }
  if (count >= MAX_BORROW_LIMIT) {
    return {
      canBorrow: false,
      currentCount: count,
      reason: `Maximum limit reached (${count}/${MAX_BORROW_LIMIT} books borrowed)`,
    }
  }
  return { canBorrow: true, currentCount: count, reason: null }
}

// ─── Issue a book to a student ───────────────────────────────────────────────
export async function issueBook(studentId, bookId) {
  try {
    // Rule 1: enforce max 5 books
    const { canBorrow, currentCount, reason } = await checkCanBorrow(studentId)
    if (!canBorrow) return { data: null, error: { message: reason } }

    // Check book availability
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('available_copies, issued_copies, title')
      .eq('id', bookId)
      .single()
    if (bookError) return { data: null, error: bookError }
    if (book.available_copies <= 0)
      return { data: null, error: { message: 'No copies available for this book' } }

    // Rule 2: due date = today + 30 days
    const dueDate = getBorrowDueDate()

    const { data, error } = await supabase
      .from('borrow_records')
      .insert({
        student_id:  studentId,
        book_id:     bookId,
        borrowed_at: new Date().toISOString(),
        due_date:    dueDate,
        status:      'BORROWED',
        fine_amount: 0,
      })
      .select()
      .single()
    if (error) return { data: null, error }

    // Decrement available_copies, increment issued_copies
    await supabase
      .from('books')
      .update({
        available_copies: book.available_copies - 1,
        issued_copies:    (book.issued_copies || 0) + 1,
      })
      .eq('id', bookId)

    return { data, currentCount: currentCount + 1, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

// ─── Return a borrowed book ──────────────────────────────────────────────────
export async function returnBook(borrowId, bookId) {
  try {
    const { data: borrow, error: fetchError } = await supabase
      .from('borrow_records')
      .select('*')
      .eq('id', borrowId)
      .single()
    if (fetchError) return { data: null, error: fetchError }

    // Rule 3: fine = ₹5/day after due_date
    const { fine } = calculateBorrowFine(borrow.due_date)

    const { data, error } = await supabase
      .from('borrow_records')
      .update({
        returned_at: new Date().toISOString(),
        status:      'RETURNED',
        fine_amount: fine,
      })
      .eq('id', borrowId)
      .select()
      .single()
    if (error) return { data: null, error }

    // Restore book copies
    const { data: book } = await supabase
      .from('books')
      .select('available_copies, issued_copies')
      .eq('id', bookId)
      .single()
    if (book) {
      await supabase
        .from('books')
        .update({
          available_copies: book.available_copies + 1,
          issued_copies:    Math.max((book.issued_copies || 1) - 1, 0),
        })
        .eq('id', bookId)
    }

    return { data, fine, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

// ─── Get all borrow records for a student ───────────────────────────────────
export async function getStudentBorrows(studentId) {
  try {
    const { data, error } = await supabase
      .from('borrow_records')
      .select('*, books(title, author, category, rack_number)')
      .eq('student_id', studentId)
      .order('borrowed_at', { ascending: false })
    return { data, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

// ─── Get all active borrows (for librarian overview) ────────────────────────
export async function getAllActiveBorrows() {
  try {
    const { data, error } = await supabase
      .from('borrow_records')
      .select('*, books(title, author, category), users(full_name, roll_number, branch)')
      .eq('status', 'BORROWED')
      .order('due_date', { ascending: true })  // most urgent first
    return { data, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

// ─── Get all currently overdue records ──────────────────────────────────────
// Rule 4: a record is overdue if status='BORROWED' and due_date < now
export async function getOverdueBooks() {
  try {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('borrow_records')
      .select('*, books(title, author), users(full_name, roll_number)')
      .eq('status', 'BORROWED')
      .lt('due_date', now)
      .order('due_date', { ascending: true })
    return { data, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export { MAX_BORROW_LIMIT, BORROW_DAYS, FINE_PER_DAY }
// NEW CODE END

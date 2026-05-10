import { supabase } from '../lib/supabase'

const FINE_PER_DAY = 2 // ₹2 per day

/**
 * Calculate fine for a given due date.
 */
export function calculateFine(dueDate, returnDate = null) {
  const due    = new Date(dueDate)
  const ret    = returnDate ? new Date(returnDate) : new Date()
  ret.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const overdueDays = Math.max(0, Math.floor((ret - due) / (1000 * 60 * 60 * 24)))
  return {
    overdueDays,
    fine: overdueDays * FINE_PER_DAY,
    isOverdue: overdueDays > 0,
  }
}

/**
 * Get due date from issue date.
 */
// OLD CODE START
// export function getDueDate(issueDateStr = null, days = 7) {  // OLD: 7-day loan period
// OLD CODE END
// NEW CODE START
export function getDueDate(issueDateStr = null, days = 30) {  // NEW: 30-day loan period (Rule 2)
// NEW CODE END
  const d = issueDateStr ? new Date(issueDateStr) : new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

/**
 * Issue a book — uses the atomic Supabase RPC function.
 * Falls back to manual logic if RPC unavailable.
 */
// OLD CODE START
// export async function issueBook({ studentId, bookId, issuedBy, dueDays = 7 }) {  // OLD: 7-day default
// OLD CODE END
// NEW CODE START
export async function issueBook({ studentId, bookId, issuedBy, dueDays = 30 }) {  // NEW: 30-day default (Rule 2)
// NEW CODE END
  // Try atomic RPC first
  const { data: rpcData, error: rpcError } = await supabase.rpc('issue_book', {
    p_student_id: studentId,
    p_book_id: bookId,
    p_issued_by: issuedBy,
    p_due_days: dueDays,
  })

  if (!rpcError && rpcData) return rpcData

  // Fallback: manual (less safe but works without the RPC)
  // 1. Check availability
  const { data: book, error: bookErr } = await supabase
    .from('books').select('available_copies,issued_copies').eq('id', bookId).single()
  if (bookErr) throw bookErr
  if (book.available_copies < 1) throw new Error('No copies available')

  // NEW CODE START
  // Rule 1: max 5 books per student
  const { count: borrowCount } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('status', 'issued')
  if ((borrowCount || 0) >= 5)
    throw new Error('Maximum borrow limit reached (5/5 books). Return a book first.')
  // NEW CODE END

  // 2. Check duplicate
  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .eq('student_id', studentId)
    .eq('book_id', bookId)
    .eq('status', 'issued')
    .maybeSingle()
  if (existing) throw new Error('Student already has this book issued')

  // 3. Insert transaction
  const today = new Date().toISOString().split('T')[0]
  const { data: txn, error: txnErr } = await supabase
    .from('transactions')
    .insert([{
      student_id: studentId,
      book_id: bookId,
      issued_by: issuedBy,
      issue_date: today,
      due_date: getDueDate(today, dueDays),
      status: 'issued',
      fine_amount: 0,
      fine_paid: false,
    }])
    .select()
    .single()
  if (txnErr) throw txnErr

  // 4. Decrement book copies
  const { error: updateErr } = await supabase
    .from('books')
    .update({
      issued_copies: book.issued_copies + 1,
      available_copies: book.available_copies - 1,
    })
    .eq('id', bookId)
  if (updateErr) throw updateErr

  return txn
}

/**
 * Return a book — uses the atomic Supabase RPC function.
 * Falls back to manual logic.
 */
export async function returnBook({ transactionId, finePerDay = FINE_PER_DAY }) {
  // Try RPC first
  const { data: rpcData, error: rpcError } = await supabase.rpc('return_book', {
    p_transaction_id: transactionId,
    p_fine_per_day: finePerDay,
  })

  if (!rpcError && rpcData) return rpcData

  // Fallback: manual
  const { data: txn, error: txnErr } = await supabase
    .from('transactions')
    .select('*, books(id,issued_copies,available_copies)')
    .eq('id', transactionId)
    .single()
  if (txnErr) throw txnErr
  if (txn.status === 'returned') throw new Error('Book already returned')

  const today = new Date().toISOString().split('T')[0]
  const { fine } = calculateFine(txn.due_date, today)

  // Update transaction
  const { data: updated, error: updErr } = await supabase
    .from('transactions')
    .update({ return_date: today, fine_amount: fine, status: 'returned' })
    .eq('id', transactionId)
    .select()
    .single()
  if (updErr) throw updErr

  // Update book counts
  const b = txn.books
  if (b) {
    await supabase
      .from('books')
      .update({
        issued_copies: Math.max(0, b.issued_copies - 1),
        available_copies: b.available_copies + 1,
      })
      .eq('id', b.id)
  }

  return updated
}

/**
 * Fetch transactions with full joins.
 * For librarian/admin: all transactions.
 * For student: only their own.
 */
export async function fetchTransactions({
  studentId = null,
  status = null,
  search = '',
  page = 1,
  pageSize = 50,
} = {}) {
  let query = supabase
    .from('transactions')
    .select(`
      *,
      books ( id, title, author, category, rack_number, isbn ),
      users!transactions_student_id_fkey ( id, full_name, email, branch, year, library_id )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (studentId) query = query.eq('student_id', studentId)
  if (status)    query = query.eq('status', status)

  if (search) {
    // NOTE: Supabase doesn't support deep-join filters via .or on foreign cols.
    // We do client-side filtering after fetch for joined columns.
  }

  const { data, error, count } = await query
  if (error) throw error

  let results = data ?? []

  if (search) {
    const q = search.toLowerCase()
    results = results.filter(t =>
      t.books?.title?.toLowerCase().includes(q) ||
      t.users?.full_name?.toLowerCase().includes(q) ||
      t.users?.email?.toLowerCase().includes(q) ||
      t.users?.library_id?.toLowerCase().includes(q)
    )
  }

  return { data: results, count: count ?? 0 }
}

/**
 * Fetch active (issued/overdue) transactions for a student.
 */
export async function fetchStudentActiveTransactions(studentId) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, books(id,title,author,category,rack_number)')
    .eq('student_id', studentId)
    .in('status', ['issued', 'overdue'])
    .order('due_date', { ascending: true })
  if (error) throw error
  return data ?? []
}

/**
 * Fetch all transactions for a student (full history).
 */
export async function fetchStudentHistory(studentId) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, books(id,title,author,category,rack_number)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Dashboard stats for librarian.
 */
export async function fetchLibrarianStats() {
  const today = new Date().toISOString().split('T')[0]

  const [allRes, overdueRes, todayIssuedRes, todayReturnedRes] = await Promise.all([
    supabase.from('transactions').select('id, status, fine_amount', { count: 'exact' }),
    supabase.from('transactions').select('id', { count: 'exact' }).in('status', ['overdue']),
    supabase.from('transactions').select('id', { count: 'exact' }).eq('issue_date', today),
    supabase.from('transactions').select('id', { count: 'exact' }).eq('return_date', today),
  ])

  const txns = allRes.data ?? []
  const totalFine = txns.reduce((s, t) => s + (Number(t.fine_amount) || 0), 0)

  return {
    totalTransactions: allRes.count ?? 0,
    overdueCount: overdueRes.count ?? 0,
    issuedToday: todayIssuedRes.count ?? 0,
    returnedToday: todayReturnedRes.count ?? 0,
    totalFineCollected: totalFine,
  }
}

/**
 * Dashboard stats for a student.
 */
export async function fetchStudentDashboardStats(studentId) {
  const { data, error } = await supabase
    .from('transactions')
    .select('status, fine_amount, due_date')
    .eq('student_id', studentId)
  if (error) throw error

  const txns = data ?? []
  const today = new Date(); today.setHours(0,0,0,0)
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7)

  const active    = txns.filter(t => t.status !== 'returned')
  const overdue   = txns.filter(t => t.status === 'overdue' ||
    (t.status === 'issued' && new Date(t.due_date) < today))
  const dueThisWeek = active.filter(t => {
    const d = new Date(t.due_date)
    return d >= today && d <= nextWeek
  })
  const totalFine = txns.reduce((s, t) => s + (Number(t.fine_amount) || 0), 0)

  return {
    borrowed: active.length,
    overdue: overdue.length,
    dueThisWeek: dueThisWeek.length,
    totalFine,
  }
}

/**
 * Admin analytics stats.
 */
export async function fetchAdminStats() {
  const [booksRes, txnsRes, overdueRes, fineRes, usersRes] = await Promise.all([
    supabase.from('books').select('total_copies, issued_copies', { count: 'exact' }),
    supabase.from('transactions').select('id', { count: 'exact' }),
    supabase.from('transactions').select('id', { count: 'exact' }).in('status', ['overdue']),
    supabase.from('transactions').select('fine_amount'),
    supabase.from('users').select('role', { count: 'exact' }),
  ])

  const books = booksRes.data ?? []
  const fines = fineRes.data ?? []
  const users = usersRes.data ?? []

  return {
    totalTitles:    booksRes.count ?? 0,
    totalCopies:    books.reduce((s, b) => s + (b.total_copies || 0), 0),
    issuedCopies:   books.reduce((s, b) => s + (b.issued_copies || 0), 0),
    totalTxns:      txnsRes.count ?? 0,
    overdueCount:   overdueRes.count ?? 0,
    totalFine:      fines.reduce((s, f) => s + (Number(f.fine_amount) || 0), 0),
    totalStudents:  users.filter(u => u.role === 'STUDENT').length,
    totalLibrarians: users.filter(u => u.role === 'LIBRARIAN').length,
  }
}

export { FINE_PER_DAY }

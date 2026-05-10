import { supabase } from '../lib/supabase'

/**
 * Fetch all books with optional search + category filter.
 * Uses Supabase full-text–style ilike query for title/author/isbn.
 */
export async function fetchBooks({ search = '', category = '', onlyAvailable = false } = {}) {
  let query = supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false })

  if (search) {
    const q = `%${search}%`
    query = query.or(`title.ilike.${q},author.ilike.${q},isbn.ilike.${q}`)
  }

  if (category) {
    query = query.eq('category', category)
  }

  if (onlyAvailable) {
    query = query.gt('available_copies', 0)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * Fetch a single book by ID.
 */
export async function fetchBookById(id) {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

/**
 * Add a new book.
 * issued_copies is always 0 on creation.
 * available_copies is always == total_copies on creation.
 */
export async function addBook({ title, author, category, isbn, rack_number, description, cover_image_url, total_copies }) {
  const copies = Math.max(1, Number(total_copies))
  const { data, error } = await supabase
    .from('books')
    .insert([{
      title: title.trim(),
      author: author.trim(),
      category,
      isbn: isbn?.trim() || null,
      rack_number: rack_number?.trim() || null,
      description: description?.trim() || null,
      cover_image_url: cover_image_url?.trim() || null,
      total_copies: copies,
      issued_copies: 0,
      available_copies: copies,
    }])
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Edit an existing book.
 * VALIDATION: total_copies cannot be reduced below issued_copies.
 */
export async function updateBook(id, updates) {
  // Fetch current issued count first
  const current = await fetchBookById(id)

  const newTotal = Number(updates.total_copies)
  if (newTotal < current.issued_copies) {
    throw new Error(
      `Cannot reduce total copies below currently issued copies (${current.issued_copies}).`
    )
  }

  const newAvailable = newTotal - current.issued_copies

  const { data, error } = await supabase
    .from('books')
    .update({
      title: updates.title?.trim(),
      author: updates.author?.trim(),
      category: updates.category,
      isbn: updates.isbn?.trim() || null,
      rack_number: updates.rack_number?.trim() || null,
      description: updates.description?.trim() || null,
      cover_image_url: updates.cover_image_url?.trim() || null,
      total_copies: newTotal,
      available_copies: newAvailable,
      // issued_copies stays unchanged — controlled by transactions
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a book.
 * VALIDATION: Only allowed when issued_copies == 0.
 */
export async function deleteBook(id) {
  const current = await fetchBookById(id)
  if (current.issued_copies > 0) {
    throw new Error(
      `Cannot delete a book with ${current.issued_copies} copy/copies currently issued. Return all copies first.`
    )
  }

  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Get aggregated book stats for dashboards.
 */
export async function fetchBookStats() {
  const { data, error } = await supabase
    .from('books')
    .select('total_copies, issued_copies, available_copies')

  if (error) throw error

  const books = data ?? []
  return {
    totalTitles: books.length,
    totalCopies: books.reduce((s, b) => s + (b.total_copies || 0), 0),
    issuedCopies: books.reduce((s, b) => s + (b.issued_copies || 0), 0),
    availableCopies: books.reduce((s, b) => s + (b.available_copies || 0), 0),
  }
}

export const CATEGORIES = [
  'Computer Science',
  'Electronics',
  'Mechanical',
  'Civil',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Fiction',
  'Non-Fiction',
  'Reference',
  'Science',
  'Technology',
  'History',
  'Literature',
  'Other',
]

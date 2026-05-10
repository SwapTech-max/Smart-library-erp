-- ============================================================
-- SMART LIBRARY ERP — Phase 5 & 6 SQL Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- ─── 1. BOOKS TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS books (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  author          TEXT NOT NULL,
  category        TEXT NOT NULL,
  isbn            TEXT,
  rack_number     TEXT,
  description     TEXT,
  image_url       TEXT,
  total_copies    INTEGER NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
  issued_copies   INTEGER NOT NULL DEFAULT 0 CHECK (issued_copies >= 0),
  available_copies INTEGER NOT NULL DEFAULT 1 CHECK (available_copies >= 0),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT copies_valid CHECK (issued_copies + available_copies = total_copies),
  CONSTRAINT issued_lte_total CHECK (issued_copies <= total_copies)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_books_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_books_updated_at ON books;
CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_books_updated_at();

-- Useful index for full-text search
CREATE INDEX IF NOT EXISTS idx_books_title_author ON books USING gin(
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(author,'') || ' ' || coalesce(category,''))
);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);

-- ─── 2. TRANSACTIONS TABLE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id       UUID NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  issued_by     UUID REFERENCES users(id),
  issue_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date      DATE NOT NULL,
  return_date   DATE,
  status        TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','returned','overdue')),
  fine_amount   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (fine_amount >= 0),
  fine_paid     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_txns_student   ON transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_txns_book      ON transactions(book_id);
CREATE INDEX IF NOT EXISTS idx_txns_status    ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_txns_due_date  ON transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_txns_created   ON transactions(created_at DESC);

-- ─── 3. RLS — BOOKS ─────────────────────────────────────────
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Everyone can read books
DROP POLICY IF EXISTS "books_read_all" ON books;
CREATE POLICY "books_read_all" ON books
  FOR SELECT USING (true);

-- Only SUPER_ADMIN and LIBRARIAN can insert
DROP POLICY IF EXISTS "books_insert_staff" ON books;
CREATE POLICY "books_insert_staff" ON books
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN','LIBRARIAN')
    )
  );

-- Only SUPER_ADMIN and LIBRARIAN can update
DROP POLICY IF EXISTS "books_update_staff" ON books;
CREATE POLICY "books_update_staff" ON books
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN','LIBRARIAN')
    )
  );

-- Only SUPER_ADMIN can delete
DROP POLICY IF EXISTS "books_delete_admin" ON books;
CREATE POLICY "books_delete_admin" ON books
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- Librarian can delete books with 0 issued copies
DROP POLICY IF EXISTS "books_delete_librarian" ON books;
CREATE POLICY "books_delete_librarian" ON books
  FOR DELETE USING (
    issued_copies = 0 AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN','LIBRARIAN')
    )
  );

-- ─── 4. RLS — TRANSACTIONS ──────────────────────────────────
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Students see only their own
DROP POLICY IF EXISTS "txns_student_own" ON transactions;
CREATE POLICY "txns_student_own" ON transactions
  FOR SELECT USING (student_id = auth.uid());

-- LIBRARIAN and SUPER_ADMIN see all
DROP POLICY IF EXISTS "txns_staff_all" ON transactions;
CREATE POLICY "txns_staff_all" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN','LIBRARIAN')
    )
  );

-- Only LIBRARIAN / SUPER_ADMIN can insert transactions
DROP POLICY IF EXISTS "txns_insert_staff" ON transactions;
CREATE POLICY "txns_insert_staff" ON transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN','LIBRARIAN')
    )
  );

-- Only LIBRARIAN / SUPER_ADMIN can update (return, fine)
DROP POLICY IF EXISTS "txns_update_staff" ON transactions;
CREATE POLICY "txns_update_staff" ON transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN','LIBRARIAN')
    )
  );

-- ─── 5. ATOMIC ISSUE BOOK FUNCTION ──────────────────────────
-- Atomically creates a transaction and decrements available_copies.
-- Returns the new transaction row.
CREATE OR REPLACE FUNCTION issue_book(
  p_student_id  UUID,
  p_book_id     UUID,
  p_issued_by   UUID,
  p_due_days    INTEGER DEFAULT 7
)
RETURNS transactions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_book     books%ROWTYPE;
  v_txn      transactions%ROWTYPE;
  v_today    DATE := CURRENT_DATE;
  v_due      DATE := CURRENT_DATE + p_due_days;
BEGIN
  -- Lock the book row
  SELECT * INTO v_book FROM books WHERE id = p_book_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Book not found';
  END IF;

  IF v_book.available_copies < 1 THEN
    RAISE EXCEPTION 'No copies available';
  END IF;

  -- Check if student already has this book issued
  IF EXISTS (
    SELECT 1 FROM transactions
    WHERE student_id = p_student_id
      AND book_id = p_book_id
      AND status = 'issued'
  ) THEN
    RAISE EXCEPTION 'Student already has this book issued';
  END IF;

  -- Decrement available, increment issued
  UPDATE books
  SET issued_copies    = issued_copies + 1,
      available_copies = available_copies - 1
  WHERE id = p_book_id;

  -- Create transaction
  INSERT INTO transactions (student_id, book_id, issued_by, issue_date, due_date, status, fine_amount)
  VALUES (p_student_id, p_book_id, p_issued_by, v_today, v_due, 'issued', 0)
  RETURNING * INTO v_txn;

  RETURN v_txn;
END;
$$;

-- ─── 6. ATOMIC RETURN BOOK FUNCTION ─────────────────────────
CREATE OR REPLACE FUNCTION return_book(
  p_transaction_id  UUID,
  p_fine_per_day    NUMERIC DEFAULT 5
)
RETURNS transactions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_txn      transactions%ROWTYPE;
  v_today    DATE := CURRENT_DATE;
  v_overdue  INTEGER;
  v_fine     NUMERIC;
BEGIN
  -- Lock the transaction row
  SELECT * INTO v_txn FROM transactions WHERE id = p_transaction_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_txn.status = 'returned' THEN
    RAISE EXCEPTION 'Book already returned';
  END IF;

  -- Calculate fine
  v_overdue := GREATEST(0, v_today - v_txn.due_date);
  v_fine    := v_overdue * p_fine_per_day;

  -- Increment available, decrement issued
  UPDATE books
  SET issued_copies    = issued_copies - 1,
      available_copies = available_copies + 1
  WHERE id = v_txn.book_id;

  -- Mark returned
  UPDATE transactions
  SET return_date = v_today,
      fine_amount = v_fine,
      status      = 'returned'
  WHERE id = p_transaction_id
  RETURNING * INTO v_txn;

  RETURN v_txn;
END;
$$;

-- ─── 7. MARK OVERDUE FUNCTION ────────────────────────────────
-- Call this via a scheduled job (pg_cron) or from the app
CREATE OR REPLACE FUNCTION mark_overdue_transactions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE transactions
  SET status = 'overdue'
  WHERE status = 'issued'
    AND due_date < CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ─── SAMPLE INDEXES FOR PERFORMANCE ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_txns_issued_student
  ON transactions(student_id) WHERE status = 'issued';

CREATE INDEX IF NOT EXISTS idx_txns_overdue
  ON transactions(due_date) WHERE status IN ('issued','overdue');

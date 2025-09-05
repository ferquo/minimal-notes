
import sqlite from 'better-sqlite3';

let db: sqlite.Database;

export function init(dbPath: string) {
  db = new sqlite(dbPath);
  // Ensure base schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      position INTEGER
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      note_id INTEGER NOT NULL,
      id TEXT NOT NULL,            -- sha256 hash
      filename TEXT NOT NULL,
      mime TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (note_id, id)
    )
  `)
  db.exec(`CREATE INDEX IF NOT EXISTS images_note_id ON images(note_id)`)

  // Migration: add position column if missing, then backfill positions once.
  try {
    const columns = db.prepare("PRAGMA table_info('notes')").all() as { name: string }[]
    const hasPosition = columns.some((c) => c.name === 'position')
    if (!hasPosition) {
      db.exec('ALTER TABLE notes ADD COLUMN position INTEGER')
    }
    // Backfill any NULL positions so ordering is stable and under our control.
    const nullCountRow = db.prepare('SELECT COUNT(1) as c FROM notes WHERE position IS NULL').get() as { c: number }
    if (nullCountRow.c > 0) {
      const tx = db.transaction(() => {
        // Assign highest position to newest note so new notes can always take max+1 to appear on top.
        const rows = db.prepare('SELECT id FROM notes ORDER BY createdAt DESC, id DESC').all() as { id: number }[]
        let pos = rows.length
        for (const r of rows) {
          db.prepare('UPDATE notes SET position = ? WHERE id = ?').run(pos, r.id)
          pos--
        }
      })
      tx()
    }
  } catch (e) {
    console.warn('[db] Migration for position column failed or skipped:', e)
  }
}

export function getNotes() {
  // Order by explicit position so user-controlled ordering persists; newest as tie-breaker.
  return db.prepare('SELECT * FROM notes ORDER BY position DESC, createdAt DESC').all();
}

export function createNote() {
  // Place new notes at the top by giving them position = max(position) + 1
  const { maxPos } = db.prepare('SELECT COALESCE(MAX(position), 0) as maxPos FROM notes').get() as { maxPos: number }
  const nextPos = (maxPos ?? 0) + 1
  const result = db.prepare('INSERT INTO notes (title, position) VALUES (?, ?)').run('New note', nextPos);
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
}

export function updateNoteTitle(id: number, title: string) {
  db.prepare('UPDATE notes SET title = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(title, id);
}

export function updateNoteContent(id: number, content: string) {
  db.prepare('UPDATE notes SET content = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(content, id);
}

export function deleteNote(id: number) {
  db.prepare('DELETE FROM notes WHERE id = ?').run(id);
}

export function reorderNotes(ids: number[]) {
  // Rewrite positions in a single transaction; highest value appears first.
  if (!Array.isArray(ids)) return
  const tx = db.transaction((arr: number[]) => {
    let pos = arr.length
    for (const id of arr) {
      db.prepare('UPDATE notes SET position = ? WHERE id = ?').run(pos, id)
      pos--
    }
  })
  tx(ids)
}

// --- Images metadata helpers ---

export function recordImage(params: {
  noteId: number
  hash: string
  filename: string
  mime: string
  sizeBytes: number
  createdAt: number
}) {
  const { noteId, hash, filename, mime, sizeBytes, createdAt } = params
  db.prepare(
    'INSERT OR IGNORE INTO images (note_id, id, filename, mime, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(noteId, hash, filename, mime, sizeBytes, createdAt)
}

export function deleteImagesForNote(noteId: number) {
  db.prepare('DELETE FROM images WHERE note_id = ?').run(noteId)
}

export function deleteImageByFilename(noteId: number, filename: string) {
  db.prepare('DELETE FROM images WHERE note_id = ? AND filename = ?').run(noteId, filename)
}

export function getNoteContent(id: number): string | null {
  const row = db.prepare('SELECT content FROM notes WHERE id = ?').get(id) as { content: string | null } | undefined
  return row?.content ?? null
}

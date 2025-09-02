
import sqlite from 'better-sqlite3';

let db: sqlite.Database;

export function init(dbPath: string) {
  db = new sqlite(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
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
}

export function getNotes() {
  // Order by creation time so list order stays stable regardless of edits
  return db.prepare('SELECT * FROM notes ORDER BY createdAt DESC').all();
}

export function createNote() {
  const result = db.prepare('INSERT INTO notes (title) VALUES (?)').run('New note');
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


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
}

export function getNotes() {
  // Order by creation time so list order stays stable regardless of edits
  return db.prepare('SELECT * FROM notes ORDER BY createdAt DESC').all();
}

export function createNote() {
  const result = db.prepare('INSERT INTO notes (title) VALUES (?)').run('New Note');
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

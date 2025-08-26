import { useEffect, useRef, useState } from 'react'
import type { Note } from '../types'

type Props = {
  note: Note
  active: boolean
  onClick: (note: Note) => void
  onDeleted?: (id: number) => void
  onRenamed?: () => void
  startRenaming?: boolean
}

export default function NoteItem({ note, active, onClick, onDeleted, onRenamed, startRenaming }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState(note.title)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTitle(note.title)
  }, [note.title])

  // If instructed, immediately enter rename mode with prefilled text "New note"
  useEffect(() => {
    if (startRenaming) {
      setRenaming(true)
      setTitle('New note')
    }
  }, [startRenaming])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [menuOpen])

  async function handleDelete() {
    setMenuOpen(false)
    const ok = confirm('Delete this note? This cannot be undone.')
    if (!ok) return
    try {
      await window.db.deleteNote(note.id)
      onDeleted?.(note.id)
    } catch (e) {
      console.error('Failed to delete note', e)
    }
  }

  async function commitRename() {
    const next = title.trim()
    setRenaming(false)
    setMenuOpen(false)
    if (next.length === 0 || next === note.title) {
      // Revert to original title if empty or unchanged
      setTitle(note.title)
      return
    }
    try {
      await window.db.updateNoteTitle(note.id, next)
      onRenamed?.()
    } catch (e) {
      console.error('Failed to rename note', e)
      // Revert local state on error
      setTitle(note.title)
    }
  }

  return (
    <div ref={containerRef} className="relative group">
      {renaming ? (
        <div
          className={[
            'w-full text-left px-3 py-2 truncate transition-colors pr-10',
            active
              ? 'bg-indigo-50 text-indigo-700 border-l-2 border-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-400/60'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800/60',
          ].join(' ')}
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => {
              // Keep key events from affecting parent elements
              e.stopPropagation()
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') {
                setRenaming(false)
                setTitle(note.title)
              }
            }}
            onBlur={commitRename}
            className="w-full bg-transparent border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400/50"
          />
        </div>
      ) : (
        <button
          onClick={() => onClick(note)}
          className={[
            'w-full text-left px-3 py-2 truncate transition-colors pr-10',
            active
              ? 'bg-indigo-50 text-indigo-700 border-l-2 border-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-400/60'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800/60',
          ].join(' ')}
          title={note.title}
        >
          <div className="text-sm font-medium truncate">{note.title || 'Untitled'}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {new Date(note.updatedAt).toLocaleString()}
          </div>
        </button>
      )}
      {/* Hover-visible action button */}
      {!renaming && (
        <button
          type="button"
          aria-label="More actions"
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen((v) => !v)
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="6" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="18" r="1.6" />
          </svg>
        </button>
      )}
      {menuOpen && !renaming && (
        <div className="absolute right-2 top-2 z-20 min-w-[120px] rounded-md border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 shadow-lg py-1 text-sm">
          <button
            className="block w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setRenaming(true)}
          >
            Rename
          </button>
          <button
            className="block w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

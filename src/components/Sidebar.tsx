import { useEffect, useState } from 'react'
import type { Note } from '../types'
import NoteItem from './NoteItem'
import ThemeToggle from './ThemeToggle'

type Props = {
  selectedId: number | null
  onSelect: (note: Note) => void
  onCreated?: (note: Note) => void
}

export default function Sidebar({ selectedId, onSelect, onCreated }: Props) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)

  async function refresh() {
    setLoading(true)
    try {
      const result = await window.db.getNotes()
      const list = result as unknown as Note[]
      setNotes(list)
      return list
    } finally {
      setLoading(false)
    }
  }

  async function create() {
    const created = await window.db.createNote()
    await refresh()
    onCreated?.(created as unknown as Note)
    onSelect(created as unknown as Note)
  }

  async function handleDeleted(id: number) {
    const list = (await refresh()) || []
    if (selectedId === id) {
      if (list.length > 0) onSelect(list[0])
      // If no notes remain, leave selection as-is; editor will show last content until changed
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 tracking-wide">Notes</div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={create}
            className="text-xs px-2.5 py-1.5 rounded-md bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
          >
            New
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="p-3 text-xs text-slate-500">Loading…</div>
        )}
        {!loading && notes.length === 0 && (
          <div className="p-3 text-xs text-slate-500">No notes yet</div>
        )}
        <ul>
          {notes.map((n) => (
            <li key={n.id}>
              <NoteItem
                note={n}
                active={n.id === selectedId}
                onClick={onSelect}
                onRenamed={refresh}
                onDeleted={handleDeleted}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )}

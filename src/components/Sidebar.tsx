import { useEffect, useRef, useState } from 'react'
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
  const [renameId, setRenameId] = useState<number | null>(null)
  const [pendingSelectId, setPendingSelectId] = useState<number | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)
  const originalOrderRef = useRef<number[] | null>(null)

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
    const newId = (created as any).id ?? null
    setRenameId(newId)
    setPendingSelectId(newId)
    await refresh()
    onCreated?.(created as unknown as Note)
  }

  async function select(note: Note) {
    try {
      const list = (await window.db.getNotes()) as unknown as Note[]
      setNotes(list)
      const latest = list.find((n) => n.id === note.id) || note
      onSelect(latest)
    } catch (e) {
      console.error('Failed to fetch latest note before selecting', e)
      onSelect(note)
    }
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
      <div className="px-3 min-h-[var(--toolbar-h)] border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 tracking-wide">Notes</div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={create}
            className="text-xs px-2.5 py-1 rounded-md bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
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
            <li
              key={n.id}
              draggable
              onDragStart={(e) => {
                setDraggingId(n.id)
                setDragOverId(null)
                originalOrderRef.current = notes.map((x) => x.id)
                try { e.dataTransfer?.setData('text/plain', String(n.id)) } catch {}
                if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e) => {
                if (draggingId == null) return
                e.preventDefault()
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
                if (n.id !== draggingId) setDragOverId(n.id)
              }}
              onDrop={async (e) => {
                e.preventDefault()
                const fromId = draggingId
                const toId = n.id
                setDragOverId(null)
                setDraggingId(null)
                if (fromId == null || fromId === toId) return
                // Reorder once on drop
                const current = notes.slice()
                const fromIdx = current.findIndex((x) => x.id === fromId)
                const toIdx = current.findIndex((x) => x.id === toId)
                if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
                const [item] = current.splice(fromIdx, 1)
                current.splice(toIdx, 0, item)
                setNotes(current)
                const ids = current.map((x) => x.id)
                try {
                  await window.db.reorderNotes(ids)
                  await refresh()
                } catch (err) {
                  console.error('Failed to persist reorder', err)
                  await refresh()
                } finally {
                  originalOrderRef.current = null
                }
              }}
              onDragEnd={() => {
                // Cleanup only; persistence happens on drop
                setDragOverId(null)
                setDraggingId(null)
              }}
              className={[
                'relative group',
                'cursor-grab active:cursor-grabbing select-none',
                dragOverId === n.id ? 'ring-2 ring-indigo-400 rounded-sm' : '',
              ].join(' ')}
            >
              <span
                className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-70"
                aria-hidden="true"
                title="Drag to reorder"
              >
                {/* 6-dot handle icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="7" cy="8" r="1" />
                  <circle cx="12" cy="8" r="1" />
                  <circle cx="17" cy="8" r="1" />
                  <circle cx="7" cy="14" r="1" />
                  <circle cx="12" cy="14" r="1" />
                  <circle cx="17" cy="14" r="1" />
                </svg>
              </span>
              <NoteItem
                note={n}
                active={n.id === selectedId}
                onClick={select}
                startRenaming={renameId === n.id}
                onRenamed={async () => {
                  const currentId = n.id
                  setRenameId(null)
                  const list = (await refresh()) || []
                  if (pendingSelectId === currentId) {
                    // Now select the newly created (and renamed) note
                    setPendingSelectId(null)
                    const latest = list.find((x) => x.id === currentId)
                    if (latest) select(latest)
                    else onSelect(n)
                  }
                }}
                onDeleted={handleDeleted}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )}

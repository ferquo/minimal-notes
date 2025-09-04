import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import type { Note } from './types'

function App() {
  const [selected, setSelected] = useState<Note | null>(null)
  const MIN_WIDTH = 288 // Tailwind w-72
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('ui.sidebarWidth')
      const v = raw ? parseInt(raw, 10) : NaN
      return Number.isFinite(v) && v >= MIN_WIDTH ? v : MIN_WIDTH
    } catch {
      return MIN_WIDTH
    }
  })
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    try { localStorage.setItem('ui.sidebarWidth', String(sidebarWidth)) } catch {}
  }, [sidebarWidth])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isResizing) return
      const max = Math.max(MIN_WIDTH, window.innerWidth - 320) // leave space for editor
      const next = Math.min(Math.max(e.clientX, MIN_WIDTH), max)
      setSidebarWidth(next)
    }
    function onMouseUp() { setIsResizing(false) }
    if (isResizing) {
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp, { once: true })
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [isResizing])

  return (
    <div
      className="font-mono min-h-screen w-full flex bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100"
      style={{ userSelect: isResizing ? 'none' as const : 'auto' as const }}
    >
      <aside
        className="shrink-0 bg-white/80 dark:bg-slate-900/60 backdrop-blur h-screen"
        style={{ width: `${sidebarWidth}px` }}
      >
        <Sidebar
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        />
      </aside>
      <div
        role="separator"
        aria-orientation="vertical"
        title="Drag to resize"
        onMouseDown={() => setIsResizing(true)}
        className={`w-1 h-screen cursor-col-resize ${isResizing ? 'bg-slate-300 dark:bg-slate-700' : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700'}`}
      />
      <main className="flex-1 min-h-0 h-screen p-3 overflow-auto">
        <Editor
          key={selected?.id ?? 'no-note'}
          noteId={selected?.id ?? null}
          content={selected?.content ?? ''}
          onSaved={(id, html) => {
            setSelected((prev) =>
              prev && prev.id === id
                ? { ...prev, content: html, updatedAt: new Date().toISOString() }
                : prev
            )
          }}
        />
      </main>
    </div>
  )
}

export default App

import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import type { Note } from './types'

function App() {
  const [selected, setSelected] = useState<Note | null>(null)

  return (
    <div className="font-mono min-h-screen w-full flex bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100">
      <aside className="w-72 border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur">
        <Sidebar
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
          onCreated={setSelected}
        />
      </aside>
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

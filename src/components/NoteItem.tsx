import type { Note } from '../types'

type Props = {
  note: Note
  active: boolean
  onClick: (note: Note) => void
}

export default function NoteItem({ note, active, onClick }: Props) {
  return (
    <button
      onClick={() => onClick(note)}
      className={[
        'w-full text-left px-3 py-2 truncate transition-colors',
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
  )
}

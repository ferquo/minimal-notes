import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '../editor/extensions/TextAlign'
import EditorToolbar from './EditorToolbar'

type Props = {
  noteId: number | null
  content: string
  onSaved?: (id: number, content: string) => void
}

export default function Editor({ noteId, content, onSaved }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content,
    autofocus: 'end',
    editable: true,
    editorProps: {
      attributes: {
        class: 'min-h-full',
      },
    },
    onUpdate: ({ editor }) => {
      // Debounce saves to avoid excessive writes
      if ((window as any).__saveTimer) {
        clearTimeout((window as any).__saveTimer)
      }
      ;(window as any).__saveTimer = setTimeout(async () => {
        if (noteId != null) {
          const html = editor.getHTML()
          try {
            await window.db.updateNoteContent(noteId, html)
            // Inform parent so in-memory selected note stays in sync
            onSaved?.(noteId, html)
          } catch (err) {
            // Silently ignore here; surfaced errors can be added later (Req 5)
            console.error('Failed to save content', err)
          }
        }
      }, 500)
    },
  })

  // Update editor when selected note changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '')
    }
  }, [content, editor])

  // Flush pending changes when switching notes or unmounting
  useEffect(() => {
    function flushSave() {
      if ((window as any).__saveTimer) {
        clearTimeout((window as any).__saveTimer)
        ;(window as any).__saveTimer = null
      }
      if (noteId != null && editor) {
        const html = editor.getHTML()
        try {
          // Fire-and-forget to avoid async cleanup issues
          window.db
            .updateNoteContent(noteId, html)
            .then(() => {
              if (noteId != null) onSaved?.(noteId, html)
            })
            .catch((err) => console.error('Failed to flush save', err))
        } catch (err) {
          console.error('Failed to flush save', err)
        }
      }
    }
    return () => flushSave()
  }, [noteId, editor, onSaved])

  return (
    <div className="h-full flex flex-col min-h-0">
      {noteId == null ? (
        <div className="p-6 text-sm text-slate-500">Select or create a note to start editing.</div>
      ) : editor ? (
        <>
          <EditorToolbar editor={editor} />
          <EditorContent
            editor={editor}
            className="prose prose-slate dark:prose-invert font-mono max-w-none flex-1 min-h-0 w-full p-4 md:p-6 outline-none border-0 focus:outline-none focus:ring-0 focus:border-transparent leading-relaxed text-slate-800 dark:text-slate-100 overflow-auto bg-transparent"
          />
        </>
      ) : null}
    </div>
  )
}

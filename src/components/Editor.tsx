import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import ImageResizable from '../editor/extensions/ImageResizable'
import TextAlign from '../editor/extensions/TextAlign'
import EditorToolbar from './EditorToolbar'

type Props = {
  noteId: number | null
  content: string
  onSaved?: (id: number, content: string) => void
}

export default function Editor({ noteId, content, onSaved }: Props) {
  // Track the last content successfully saved to avoid redundant writes
  const lastSavedRef = useRef<string>(content || '')
  const gcTimerRef = useRef<number | null>(null)
  const [spellcheckEnabled, setSpellcheckEnabled] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('editor.spellcheck')
      return raw ? JSON.parse(raw) === true : false
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('editor.spellcheck', JSON.stringify(spellcheckEnabled))
    } catch {}
  }, [spellcheckEnabled])

  // Sync initial setting from main process menu (if available),
  // then listen for changes via IPC.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    try {
      if ((window as any).api?.getSettings) {
        ;(async () => {
          try {
            const s = await (window as any).api.getSettings()
            if (typeof s?.spellcheckEnabled === 'boolean') setSpellcheckEnabled(!!s.spellcheckEnabled)
          } catch {}
        })()
      }
      if ((window as any).api?.onSetSpellcheck) {
        unsubscribe = (window as any).api.onSetSpellcheck((enabled: boolean) => setSpellcheckEnabled(!!enabled))
      }
    } catch {}
    return () => { try { unsubscribe?.() } catch {} }
  }, [])
  function extractImagesFromClipboard(e: ClipboardEvent): File[] {
    const files: File[] = []
    if (!e.clipboardData) return files
    for (const item of e.clipboardData.items) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file && file.type.startsWith('image/')) files.push(file)
      }
    }
    return files
  }

  async function saveFileAsAttachment(currentNoteId: number, file: File) {
    const ab = await file.arrayBuffer()
    const { url, width, height } = await window.api.saveImage(String(currentNoteId), ab, file.type)
    return { url, width, height }
  }
  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageResizable,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content,
    editable: true,
    editorProps: {
      attributes: {
        class: 'min-h-full',
        spellcheck: 'false',
        autocapitalize: 'off',
        autocomplete: 'off',
        autocorrect: 'off',
      },
      handlePaste: (_view, event) => {
        const e = event as ClipboardEvent
        const files = extractImagesFromClipboard(e)
        if (!files.length || noteId == null) return false
        e.preventDefault()
        ;(async () => {
          for (const f of files) {
            try {
              const { url, width, height } = await saveFileAsAttachment(noteId, f)
              editor?.chain().focus().setImage({ src: url, alt: f.name, width, height }).run()
            } catch (err) {
              console.error('Failed to save pasted image', err)
            }
          }
        })()
        return true
      },
      handleDrop: (_view, event, _slice, moved) => {
        const e = event as DragEvent
        if (moved || !e.dataTransfer || noteId == null) return false
        const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
        if (!files.length) return false
        e.preventDefault()
        ;(async () => {
          for (const f of files) {
            try {
              const { url, width, height } = await saveFileAsAttachment(noteId, f)
              editor?.chain().focus().setImage({ src: url, alt: f.name, width, height }).run()
            } catch (err) {
              console.error('Failed to save dropped image', err)
            }
          }
        })()
        return true
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
          // Skip save if content hasn't changed since last successful save
          if (html === lastSavedRef.current) return
          try {
            await window.db.updateNoteContent(noteId, html)
            lastSavedRef.current = html
            // Inform parent so in-memory selected note stays in sync
            onSaved?.(noteId, html)
            // Debounced GC of unreferenced attachments (HTML-based)
            if (gcTimerRef.current) window.clearTimeout(gcTimerRef.current)
            gcTimerRef.current = window.setTimeout(() => {
              try { window.api.gcNoteAttachments(String(noteId)) } catch {}
            }, 1500)
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
      // Ensure lastSavedRef matches the content we are about to set so
      // the programmatic setContent does not trigger a redundant save.
      lastSavedRef.current = content || ''
      editor.commands.setContent(content || '')
    }
  }, [content, editor])

  // Keep ProseMirror content element attributes in sync with toggle
  useEffect(() => {
    if (!editor) return
    editor.setOptions({
      editorProps: {
        attributes: {
          class: 'min-h-full',
          spellcheck: spellcheckEnabled ? 'true' : 'false',
          autocapitalize: spellcheckEnabled ? 'on' : 'off',
          autocomplete: spellcheckEnabled ? 'on' : 'off',
          autocorrect: spellcheckEnabled ? 'on' : 'off',
        },
      },
    })
  }, [editor, spellcheckEnabled])

  // Focus editor only when an actual note gets selected
  useEffect(() => {
    if (editor && noteId != null) {
      editor.chain().focus('end').run()
    }
  }, [noteId, editor])

  // Flush pending changes when switching notes or unmounting
  useEffect(() => {
    function flushSave() {
      if ((window as any).__saveTimer) {
        clearTimeout((window as any).__saveTimer)
        ;(window as any).__saveTimer = null
      }
      if (noteId != null && editor) {
        const html = editor.getHTML()
        // Skip if nothing changed since last successful save
        if (html === lastSavedRef.current) return
        try {
          // Fire-and-forget to avoid async cleanup issues
          window.db
            .updateNoteContent(noteId, html)
            .then(() => {
              lastSavedRef.current = html
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
        <div className="flex-1 min-h-0 flex items-center justify-center p-6 text-sm text-slate-500 select-none text-center">
          Select or create a note to start editing.
        </div>
      ) : editor ? (
        <>
          <EditorToolbar editor={editor} />
          <EditorContent
            editor={editor}
            className="prose prose-slate dark:prose-invert font-sans max-w-none flex-1 min-h-0 w-full p-4 md:p-6 outline-none border-0 focus:outline-none focus:ring-0 focus:border-transparent leading-relaxed text-slate-800 dark:text-slate-100 overflow-auto bg-transparent"
            spellCheck={spellcheckEnabled}
            autoCorrect={spellcheckEnabled ? 'on' : 'off'}
            autoCapitalize={spellcheckEnabled ? 'on' : 'off'}
          />
        </>
      ) : null}
    </div>
  )
}

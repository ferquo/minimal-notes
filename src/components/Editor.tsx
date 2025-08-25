import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

type Props = {
  content: string
}

export default function Editor({ content }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    autofocus: 'end',
    editable: true,
  })

  // Update editor when selected note changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '')
    }
  }, [content, editor])

  return (
    <div className="h-full">
      {editor ? (
        <EditorContent
          editor={editor}
          className="prose prose-slate dark:prose-invert font-mono max-w-none h-[70vh] md:h-[75vh] lg:h-[80vh] p-6 outline-none leading-relaxed text-slate-800 dark:text-slate-100"
        />
      ) : (
        <div className="p-6 text-sm text-slate-500">Select or create a note to start editing.</div>
      )}
    </div>
  )
}

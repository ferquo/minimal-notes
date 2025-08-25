import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '../editor/extensions/TextAlign'
import EditorToolbar from './EditorToolbar'

type Props = {
  content: string
}

export default function Editor({ content }: Props) {
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
  })

  // Update editor when selected note changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '')
    }
  }, [content, editor])

  return (
    <div className="h-full flex flex-col min-h-0">
      {editor ? (
        <>
          <EditorToolbar editor={editor} />
          <EditorContent
            editor={editor}
            className="prose prose-slate dark:prose-invert font-mono max-w-none flex-1 min-h-0 w-full p-4 md:p-6 outline-none border-0 focus:outline-none focus:ring-0 focus:border-transparent leading-relaxed text-slate-800 dark:text-slate-100 overflow-auto bg-transparent"
          />
        </>
      ) : (
        <div className="p-6 text-sm text-slate-500">Select or create a note to start editing.</div>
      )}
    </div>
  )
}

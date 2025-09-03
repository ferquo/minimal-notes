import type { Editor } from '@tiptap/react'

type Props = {
  editor: Editor
}

function ToggleButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={[
        'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors select-none',
        'border shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60',
        active
          ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-500'
          : 'bg-white/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Group({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 p-1 shadow-sm">
      {children}
    </div>
  )
}

function HeadingSelect({ editor }: { editor: Editor }) {
  const current = editor.isActive('heading', { level: 1 })
    ? 'H1'
    : editor.isActive('heading', { level: 2 })
    ? 'H2'
    : editor.isActive('heading', { level: 3 })
    ? 'H3'
    : 'P'

  function apply(value: string) {
    const chain = editor.chain().focus()
    if (value === 'P') chain.setParagraph().run()
    if (value === 'H1') chain.toggleHeading({ level: 1 }).run()
    if (value === 'H2') chain.toggleHeading({ level: 2 }).run()
    if (value === 'H3') chain.toggleHeading({ level: 3 }).run()
  }

  return (
    <div className="relative">
      <select
        aria-label="Heading level"
        className="appearance-none rounded-md pl-3 pr-7 py-1.5 text-xs font-medium bg-white/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
        value={current}
        onChange={(e) => apply(e.target.value)}
        title="Paragraph/Heading level"
      >
        <option value="P">Paragraph</option>
        <option value="H1">Heading 1</option>
        <option value="H2">Heading 2</option>
        <option value="H3">Heading 3</option>
      </select>
      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">▾</span>
    </div>
  )
}

export default function EditorToolbar({ editor }: Props) {
  const setAlign = (value: 'left' | 'center' | 'right' | 'justify') => {
    // Cast chain to any so TypeScript doesn't complain about extension-added commands
    ;(editor.chain() as any).focus().setTextAlign(value).run()
  }
  return (
    <div className="sticky top-0 z-10 bg-transparent px-3 py-2 flex flex-wrap gap-2">
      <Group>
        <HeadingSelect editor={editor} />
      </Group>

      <Group>
        <ToggleButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Cmd/Ctrl+B)">
          <span className="font-extrabold">B</span>
        </ToggleButton>
        <ToggleButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Cmd/Ctrl+I)">
          <span className="italic">I</span>
        </ToggleButton>
        <ToggleButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <span className="line-through">S</span>
        </ToggleButton>
      </Group>

      <Group>
        <ToggleButton
          onClick={() => setAlign('left')}
          active={editor.isActive({ textAlign: 'left' })}
          title="Align left"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M3 5h14M3 9h10M3 13h14M3 17h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </ToggleButton>
        <ToggleButton
          onClick={() => setAlign('center')}
          active={editor.isActive({ textAlign: 'center' })}
          title="Align center"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M3 5h14M5 9h10M3 13h14M6 17h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </ToggleButton>
        <ToggleButton
          onClick={() => setAlign('right')}
          active={editor.isActive({ textAlign: 'right' })}
          title="Align right"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M3 5h14M7 9h10M3 13h14M9 17h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </ToggleButton>
        <ToggleButton
          onClick={() => setAlign('justify')}
          active={editor.isActive({ textAlign: 'justify' })}
          title="Justify"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M3 5h14M3 9h14M3 13h14M3 17h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </ToggleButton>
      </Group>

      <Group>
        <ToggleButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Inline code"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M7 5L3 10l4 5M13 5l4 5-4 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </ToggleButton>
        <ToggleButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Code block"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="3" y="5" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2" />
            <path d="M8 9l-2 1 2 1M12 9l2 1-2 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </ToggleButton>
        <ToggleButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M5 6h6v4H7v4H5V6zm8 0h6v4h-4v4h-2V6z" fill="currentColor" />
          </svg>
        </ToggleButton>
      </Group>

      <Group>
        <ToggleButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="4" cy="5" r="1.5" fill="currentColor" />
            <circle cx="4" cy="10" r="1.5" fill="currentColor" />
            <circle cx="4" cy="15" r="1.5" fill="currentColor" />
            <path d="M8 5h8M8 10h8M8 15h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </ToggleButton>
        <ToggleButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <text x="2" y="6" font-size="6" fill="currentColor" font-family="inherit">1</text>
            <text x="2" y="11" font-size="6" fill="currentColor" font-family="inherit">2</text>
            <text x="2" y="16" font-size="6" fill="currentColor" font-family="inherit">3</text>
            <path d="M8 5h8M8 10h8M8 15h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </ToggleButton>
      </Group>
    </div>
  )
}

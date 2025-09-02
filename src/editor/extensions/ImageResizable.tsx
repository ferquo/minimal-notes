import Image from '@tiptap/extension-image'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import React, { useEffect, useRef, useState } from 'react'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

const HandleSize = 10

const ImageView: React.FC<NodeViewProps> = ({ node, updateAttributes, selected, editor, getPos }) => {
  const { src, alt, title, width } = node.attrs as { src: string; alt?: string; title?: string; width?: number }
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    return () => {
      // Clean any state on unmount
      setDragging(false)
    }
  }, [])

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const imgEl = imgRef.current
    if (!imgEl) return
    const rect = imgEl.getBoundingClientRect()
    const startWidth = rect.width
    setDragging(true)

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX
      const next = clamp(Math.round(startWidth + delta), 50, 4096)
      updateAttributes({ width: next })
    }
    const onUp = () => {
      setDragging(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <NodeViewWrapper
      as="span"
      ref={wrapperRef}
      className={[
        'image-node inline-block relative align-baseline',
        selected ? 'is-selected' : '',
        dragging ? 'is-dragging' : '',
      ].join(' ')}
      contentEditable={false}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        title={title}
        style={{ width: width ? `${width}px` : undefined, height: 'auto', maxWidth: '100%' }}
        draggable={false}
      />
      {/* Inline delete button (alternative to BubbleMenu) */}
      {selected && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            try {
              // Ensure selection is on this node, then delete
              const pos = typeof getPos === 'function' ? getPos() : null
              if (typeof pos === 'number') {
                editor?.chain().setNodeSelection(pos).deleteSelection().run()
              } else {
                editor?.chain().focus().deleteSelection().run()
              }
            } catch {}
          }}
          style={{
            position: 'absolute',
            right: -4,
            top: -4,
            padding: '2px 6px',
            fontSize: 10,
            lineHeight: 1,
            borderRadius: 4,
            background: 'rgba(220,38,38,0.95)',
            color: 'white',
            border: '1px solid rgba(185,28,28,0.8)',
            cursor: 'pointer',
          }}
        >
          Delete
        </button>
      )}
      <span
        className="image-resize-handle"
        onPointerDown={onPointerDown}
        title="Drag to resize"
        style={{
          position: 'absolute',
          right: -HandleSize / 2,
          top: '50%',
          transform: 'translateY(-50%)',
          width: HandleSize,
          height: HandleSize,
          cursor: 'ew-resize',
          borderRadius: 2,
          background: 'currentColor',
          opacity: 0.0,
        }}
      />
      <span
        className="image-resize-handle br"
        onPointerDown={onPointerDown}
        title="Drag to resize"
        style={{
          position: 'absolute',
          right: -HandleSize / 2,
          bottom: -HandleSize / 2,
          width: HandleSize,
          height: HandleSize,
          cursor: 'nwse-resize',
          borderRadius: 2,
          background: 'currentColor',
          opacity: 0.0,
        }}
      />
    </NodeViewWrapper>
  )
}

const ImageResizable = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.width) return {}
          return { width: attributes.width }
        },
        parseHTML: (element) => {
          const w = (element as HTMLElement).getAttribute('width')
          const n = w ? parseInt(w, 10) : null
          return n && Number.isFinite(n) ? n : null
        },
      },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView)
  },
})

export default ImageResizable

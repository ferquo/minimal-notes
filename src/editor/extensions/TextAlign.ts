import { Extension } from '@tiptap/core'

export interface TextAlignOptions {
  types: string[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textAlign: {
      setTextAlign: (alignment: 'left' | 'center' | 'right' | 'justify') => ReturnType
    }
  }
}

const TextAlign = Extension.create<TextAlignOptions>({
  name: 'textAlign',

  addOptions() {
    return {
      types: ['heading', 'paragraph'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: 'left',
            renderHTML: attributes => {
              const align = attributes.textAlign
              if (!align || align === 'left') return {}
              return { style: `text-align: ${align}` }
            },
            parseHTML: element => (element as HTMLElement).style.textAlign || null,
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setTextAlign:
        alignment => ({ commands }) => {
          // Apply to whichever of the configured types is active
          let applied = false
          this.options.types.forEach(type => {
            const ok = commands.updateAttributes(type, { textAlign: alignment })
            applied = applied || ok
          })
          return applied
        },
    }
  },
})

export default TextAlign

